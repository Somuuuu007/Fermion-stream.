import { types as mediasoupTypes } from 'mediasoup';
import { Socket } from 'socket.io';

interface Peer {
  socket: Socket;
  transports: mediasoupTypes.WebRtcTransport[];
  producers: mediasoupTypes.Producer[];
  consumers: mediasoupTypes.Consumer[];
  rtpCapabilities?: mediasoupTypes.RtpCapabilities;
}

let router: mediasoupTypes.Router;
const peers = new Map<string, Peer>();

export async function handleSocket(socket: Socket, worker: mediasoupTypes.Worker) {
  if (!router) {
    router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
          },
        },
      ],
    });
    console.log('✅ Mediasoup router created');
  }

  const peer: Peer = {
    socket,
    transports: [],
    producers: [],
    consumers: [],
  };
  peers.set(socket.id, peer);

  socket.emit('router-rtp-capabilities', router.rtpCapabilities);

  socket.on('get-rtp-capabilities', (cb) => {
    cb(router.rtpCapabilities);
  });

  socket.on('create-transport', async ({ direction }, cb) => {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '127.0.0.1', announcedIp: undefined }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    transport.on('dtlsstatechange', (state) => {
      if (state === 'closed') transport.close();
    });

    transport.on('@close', () => {
      console.log(`❌ ${direction} transport closed`);
    });

    peer.transports.push(transport);

    cb({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  });

  socket.on('connect-transport', async ({ transportId, dtlsParameters }) => {
    const transport = peer.transports.find(t => t.id === transportId);
    if (!transport) return;
    await transport.connect({ dtlsParameters });
  });

  socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, cb) => {
    const transport = peer.transports.find(t => t.id === transportId);
    if (!transport) return cb({ error: 'Transport not found' });
    
    const producer = await transport.produce({ kind, rtpParameters, appData });

    peer.producers.push(producer);
    cb({ id: producer.id });

    socket.broadcast.emit('new-producer', {
      producerId: producer.id,
      socketId: socket.id,
    });
  });

  socket.on('consume', async ({ transportId, producerId, rtpCapabilities }, cb) => {
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      return cb({ error: 'Cannot consume' });
    }

    const transport = peer.transports.find(t => t.id === transportId);
    if (!transport) return cb({ error: 'Transport not found' });

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });

    peer.consumers.push(consumer);

    cb({
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    });
  });

  socket.on('save-rtp-capabilities', (caps) => {
    peer.rtpCapabilities = caps;
  });

  socket.on('get-existing-producers', (cb) => {
    const producers: { producerId: string; socketId: string }[] = [];
    peers.forEach((p, id) => {
      if (id !== socket.id) {
        p.producers.forEach(prod => {
          producers.push({ producerId: prod.id, socketId: id });
        });
      }
    });
    cb(producers);
  });

  socket.on('disconnect', () => {
    peer.transports.forEach(t => t.close());
    peer.producers.forEach(p => p.close());
    peer.consumers.forEach(c => c.close());
    peers.delete(socket.id);
    socket.broadcast.emit('peer-disconnected', { socketId: socket.id });
    console.log(`🛑 Peer ${socket.id} disconnected`);
  });
}
