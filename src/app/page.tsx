'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 font-sans px-8 py-16">
      <div className="text-center mb-24 text-white">
        <h1 className="text-7xl font-bold mb-8 text-white drop-shadow-2xl tracking-tight">
          Fermion-Stream
        </h1>
      </div>

      <div className="flex gap-16 flex-wrap justify-center ">
        <Link 
          href="/stream" 
          className="no-underline group"
        >
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white border border-gray-600 hover:border-gray-500 rounded-3xl p-10 text-xl font-semibold cursor-pointer shadow-2xl transition-all duration-500 ease-out min-w-[320px] min-h-[240px] flex flex-col items-center justify-center gap-6 hover:-translate-y-3 hover:shadow-gray-500/20 hover:shadow-3xl transform-gpu">
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">🎥</div>
            <div className="text-3xl mb-3 font-bold text-white">Start Stream</div>
            <div className="text-lg text-gray-400 text-center leading-relaxed font-medium">
              Go live and broadcast
            </div>
          </div>
        </Link>

        <Link 
          href="/watch" 
          className="no-underline group"
        >
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white border border-gray-600 hover:border-gray-500 rounded-3xl p-10 text-xl font-semibold cursor-pointer shadow-2xl transition-all duration-500 ease-out min-w-[320px] min-h-[240px] flex flex-col items-center justify-center gap-6 hover:-translate-y-3 hover:shadow-gray-500/20 hover:shadow-3xl transform-gpu">
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">👀</div>
            <div className="text-3xl mb-3 font-bold text-white">Watch Stream</div>
            <div className="text-lg text-gray-400 text-center leading-relaxed font-medium">
              Watch live streams
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
