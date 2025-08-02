'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import React from 'react';

export default function WatchPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (Hls.isSupported() && videoRef.current) {
      const hls = new Hls({
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 3,
        liveDurationInfinity: true,
        lowLatencyMode: true,
        backBufferLength: 10,
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
        manifestLoadingTimeOut: 5000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 5000,
        fragLoadingTimeOut: 10000,
        startFragPrefetch: true,
        testBandwidth: false,
      });

      hls.loadSource('/hls/stream.m3u8');
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed');
        if (videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = 1.0;
          videoRef.current.play().catch((error) => {
            console.log('Autoplay failed, user interaction required:', error);
          });
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (videoRef.current && videoRef.current.buffered.length > 0) {
          const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
          const currentTime = videoRef.current.currentTime;
          const latency = bufferedEnd - currentTime;
          
          if (latency > 3) {
            videoRef.current.currentTime = bufferedEnd - 1;
          }
        }
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        if (videoRef.current && !videoRef.current.paused) {
          if (videoRef.current.playbackRate !== 1.0) {
            videoRef.current.playbackRate = 1.0;
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
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
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
        onLoadedMetadata={() => {
          if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.volume = 1.0;
          }
        }}
        onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.muted = false;
              videoRef.current.volume = 1.0;
              videoRef.current.play();
            }
          }
        }}
      />
    </div>
  );
}
