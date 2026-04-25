'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Map, Navigation } from 'lucide-react';

// Dynamically import the map component with SSR disabled
// Leaflet requires the window object which is only available client-side
const RiderMap = dynamic(() => import('@/components/RiderMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 rounded-[2.5rem] border border-gray-100">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 font-bold tracking-widest uppercase">Initializing Map Engine...</p>
    </div>
  )
});

export default function LiveMapPage() {
  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <header className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Fleet Radar <span className="relative flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span></span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center">
            <Map size={16} className="mr-2 text-primary" />
            Live tracking of all active riders across zones
          </p>
        </div>
        <div className="flex bg-white rounded-2xl border border-gray-100 p-2 shadow-sm gap-4 items-center px-4">
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-green-500 rounded-full border border-white outline outline-1 outline-gray-200"></div>
             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Online</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-gray-400 rounded-full border border-white outline outline-1 outline-gray-200"></div>
             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Offline</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-red-500 rounded-full border border-white outline outline-1 outline-gray-200"></div>
             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Blocked</span>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full relative">
        <RiderMap />
      </div>
    </div>
  );
}
