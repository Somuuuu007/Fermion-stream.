'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import React from 'react';
import { Device } from 'mediasoup-client';
import { types as mediasoupTypes } from 'mediasoup-client';

const socket = io('http://localhost:4000');

export default function StreamPage() {
  const router = useRouter();
  const [remoteStreams, setRemoteStreams] = useState<{ id: string; stream: MediaStream }[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [sendTransport, setSendTransport] = useState<mediasoupTypes.Transport | null>(null);
  const [recvTransport, setRecvTransport] = useState<mediasoupTypes.Transport | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play();
        }

        const newDevice = new Device();
        
        socket.emit('get-rtp-capabilities', async (rtpCapabilities: any) => {
          if (!newDevice.loaded) {
            await newDevice.load({ routerRtpCapabilities: rtpCapabilities });
            setDevice(newDevice);
          }

          socket.emit('create-transport', { direction: 'send' }, async (transportOptions: any) => {
            const sendTransport = newDevice.createSendTransport(transportOptions);
            setSendTransport(sendTransport);

            sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
              socket.emit('connect-transport', {
                transportId: sendTransport.id,
                dtlsParameters,
              });
              callback();
            });

            sendTransport.on('produce', async (parameters, callback, errback) => {
              socket.emit('produce', {
                transportId: sendTransport.id,
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
                appData: parameters.appData,
              }, ({ id }: any) => {
                callback({ id });
              });
            });

            for (const track of stream.getTracks()) {
              await sendTransport.produce({ track });
            }
          });

          socket.emit('create-transport', { direction: 'recv' }, async (transportOptions: any) => {
            const recvTransport = newDevice.createRecvTransport(transportOptions);
            setRecvTransport(recvTransport);

            recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
              socket.emit('connect-transport', {
                transportId: recvTransport.id,
                dtlsParameters,
              });
              callback();
            });

            socket.emit('get-existing-producers', async (producers: any[]) => {
              for (const { producerId, socketId } of producers) {
                await consumeProducer(recvTransport, producerId, socketId, rtpCapabilities);
              }
            });

            socket.on('new-producer', async ({ producerId, socketId }) => {
              await consumeProducer(recvTransport, producerId, socketId, rtpCapabilities);
            });
          });
        });

        socket.on('peer-disconnected', ({ socketId }) => {
          setRemoteStreams(prev => prev.filter(s => s.id !== socketId));
          videoRefs.current.delete(socketId);
        });

      } catch (error) {
        console.error('Error setting up media:', error);
      }
    })();
  }, []);

  const consumeProducer = async (transport: mediasoupTypes.Transport, producerId: string, socketId: string, rtpCapabilities: any) => {
    socket.emit('consume', {
      transportId: transport.id,
      producerId,
      rtpCapabilities,
    }, async (consumerData: any) => {
      if (consumerData.error) {
        console.error('Consume error:', consumerData.error);
        return;
      }

      const consumer = await transport.consume({
        id: consumerData.id,
        producerId: consumerData.producerId,
        kind: consumerData.kind,
        rtpParameters: consumerData.rtpParameters,
      });

      setRemoteStreams(prev => {
        const existingIndex = prev.findIndex(s => s.id === socketId);
        if (existingIndex >= 0) {
          const existingStream = prev[existingIndex].stream;
          existingStream.addTrack(consumer.track);
          console.log(`Added ${consumer.kind} track for user ${socketId}. Stream now has ${existingStream.getTracks().length} tracks`);
          return [...prev];
        } else {
          const stream = new MediaStream([consumer.track]);
          console.log(`Created new stream for user ${socketId} with ${consumer.kind} track`);
          return [...prev, { id: socketId, stream }];
        }
      });
    });
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    socket.disconnect();
    router.push('/');
  };



  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    canvas.width = 1280;
    canvas.height = 720;

    const draw = () => {
      const allVideos = [localVideoRef.current, ...Array.from(videoRefs.current.values())].filter(Boolean);
      const count = allVideos.length;

      if (count === 0) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for users...', canvas.width / 2, canvas.height / 2);
        requestAnimationFrame(draw);
        return;
      }

      let cols, rows;
      if (count === 1) {
        cols = 1;
        rows = 1;
      } else if (count === 2) {
        cols = 2;
        rows = 1;
      } else if (count <= 4) {
        cols = 2;
        rows = 2;
      } else if (count <= 6) {
        cols = 3;
        rows = 2;
      } else if (count <= 9) {
        cols = 3;
        rows = 3;
      } else {
        cols = 4;
        rows = Math.ceil(count / 4);
      }

      const cellWidth = canvas.width / cols;
      const cellHeight = canvas.height / rows;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      allVideos.forEach((video, i) => {
        if (video && video.readyState >= 2) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * cellWidth;
          const y = row * cellHeight;

          const videoAspect = video.videoWidth / video.videoHeight;
          const cellAspect = cellWidth / cellHeight;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          if (videoAspect > cellAspect) {
            drawWidth = cellWidth;
            drawHeight = cellWidth / videoAspect;
            drawX = x;
            drawY = y + (cellHeight - drawHeight) / 2;
          } else {
            drawWidth = cellHeight * videoAspect;
            drawHeight = cellHeight;
            drawX = x + (cellWidth - drawWidth) / 2;
            drawY = y;
          }

          ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);

          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellWidth, cellHeight);

          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(x, y + cellHeight - 30, cellWidth, 30);
          ctx.fillStyle = '#fff';
          ctx.font = '14px Arial';
          ctx.textAlign = 'left';
          const label = i === 0 ? 'You' : `User ${i}`;
          ctx.fillText(label, x + 10, y + cellHeight - 10);
        }
      });

      requestAnimationFrame(draw);
    };

    draw();
  }, [remoteStreams, localStream]);

  useEffect(() => {
    if (!canvasRef.current) return;
  
    const stream = canvasRef.current.captureStream(60);
    const ws = new WebSocket('ws://localhost:5000');
    let recorder: MediaRecorder | null = null;
  
    ws.onopen = () => {
      console.log('🌐 Connected to FFmpeg WebSocket');
  
      recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm; codecs=vp8',
        videoBitsPerSecond: 2500000
      });
  
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };
  
      recorder.start(500);
    };
  
    return () => {
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      ws.close();
    };
  }, [canvasRef]);
  

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-center mb-4 relative">
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-600 rounded-lg shadow-2xl bg-black max-w-full h-auto"
            style={{ aspectRatio: '16/9' }}
          />
          

          <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
            <button
              onClick={toggleAudio}
              className={`px-4 py-2 rounded-lg font-medium text-white transition-colors duration-200 shadow-lg min-w-[80px] ${
                isAudioEnabled 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {isAudioEnabled ? 'Mic On' : 'Mic Off'}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`px-4 py-2 rounded-lg font-medium text-white transition-colors duration-200 shadow-lg min-w-[80px] ${
                isVideoEnabled 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isVideoEnabled ? 'Cam On' : 'Cam Off'}
            </button>
            
            <button
              onClick={endCall}
              className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 shadow-lg min-w-[80px]"
              title="End Call"
            >
              End Call
            </button>
          </div>
        </div>

        <div style={{ display: 'none' }}>
          <video ref={localVideoRef} muted playsInline autoPlay />

          {remoteStreams.map(({ id, stream }) => (
            <video
              key={id}
              ref={(el) => {
                if (el && stream) {
                  el.srcObject = stream;
                  el.volume = 1.0;
                  el.play().catch(console.error);
                  videoRefs.current.set(id, el);
                }
              }}
              playsInline
              autoPlay
            />
          ))}
        </div>
      </div>
    </div>
  );
}
