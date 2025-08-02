import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupMediasoup } from './mediasoup';
import { handleSocket } from './room';
import path from 'path';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

(async () => {
  const [worker] = await setupMediasoup();

  io.on('connection', (socket) => {
    console.log('⚡ Client connected:', socket.id);
    handleSocket(socket, worker);
  });

  app.use('/hls', express.static(path.join(__dirname, '../public/hls')));

  const PORT = 4000;

  const startServer = (port: number) => {
    const onError = (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${port} in use, retrying on ${port + 1}`);
        httpServer.off('error', onError);
        startServer(port + 1);
      } else {
        throw err;
      }
    };

    httpServer.once('error', onError);

    httpServer.listen(port, () => {
      console.log(`🚀 Media server running at http://localhost:${port}`);
    });
  };

  startServer(PORT);
})();
