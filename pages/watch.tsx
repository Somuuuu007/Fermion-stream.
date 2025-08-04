'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import React from 'react';

export default function WatchPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (Hls.isSupported() && videoRef.current) {
      const hls = new Hls({
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        liveDurationInfinity: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 5,
        levelLoadingTimeOut: 10000,
        fragLoadingTimeOut: 20000,
        startFragPrefetch: true,
        testBandwidth: true,
        enableWorker: true,
        startLevel: -1,
        capLevelToPlayerSize: true,
      });

      hls.loadSource('/hls/stream.m3u8');
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed');
        if (videoRef.current) {
          videoRef.current.play().catch((error) => {
            console.log('Autoplay failed, user interaction required:', error);
          });
        }
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (videoRef.current && videoRef.current.buffered.length > 0) {
          const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
          const currentTime = videoRef.current.currentTime;
          const latency = bufferedEnd - currentTime;
          
          if (latency > 10 && !videoRef.current.seeking) {
            videoRef.current.currentTime = bufferedEnd - 3;
          }
        }
      });


      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS.js error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, destroying HLS...');
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = '/hls/stream.m3u8';
      videoRef.current.play().catch((error) => {
        console.log('Autoplay failed, user interaction required:', error);
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        controls
        autoPlay
        className="max-w-full w-[80%] border-4 border-gray-500 rounded-lg shadow-2xl cursor-pointer"
        style={{ aspectRatio: '16 / 9', backgroundColor: 'black' }}
        onClick={() => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play();
          }
        }}
      />
    </div>
  );
}
