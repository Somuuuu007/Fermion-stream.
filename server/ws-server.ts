import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const PORT = 5000;
const HLS_DIR = path.resolve(__dirname, '../public/hls');

if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR);
fs.rmSync(HLS_DIR, { recursive: true, force: true });
fs.mkdirSync(HLS_DIR);

const wss = new WebSocketServer({ port: PORT });
console.log(`🟢 WebSocket server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('📡 WebSocket client connected');

  const ffmpeg = spawn('ffmpeg', [
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-g', '60',
    '-sc_threshold', '0',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '1000',
    '-hls_flags', 'delete_segments+append_list',
    path.join(HLS_DIR, 'stream.m3u8')
  ]);

  ffmpeg.stderr.on('data', (data) => {
  });

  ffmpeg.on('close', (code) => {
    console.log('❌ FFmpeg process closed with code', code);
  });

  ws.on('message', (msg) => {
    ffmpeg.stdin.write(msg);
  });

  ws.on('close', () => {
    ffmpeg.stdin.end();
    console.log('❎ WebSocket client disconnected, ffmpeg closed');
  });
});
