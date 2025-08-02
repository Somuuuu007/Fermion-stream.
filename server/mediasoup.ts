import { createWorker, types as mediasoupTypes } from 'mediasoup';

let worker: mediasoupTypes.Worker | null = null;

export async function setupMediasoup(): Promise<mediasoupTypes.Worker[]> {
  if (worker) {
    console.log('⚠️ Mediasoup worker already exists, reusing...');
    return [worker];
  }

  console.log('🛠️ Creating Mediasoup worker...');

  worker = await createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  });

  worker.on('died', () => {
    console.error('❌ Mediasoup worker died. Exiting in 2s...');
    setTimeout(() => process.exit(1), 2000);
  });

  console.log('✅ Mediasoup worker created and ready');
  return [worker];
}
