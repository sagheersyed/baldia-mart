'use client';

import React from 'react';
import { Bell, Menu } from 'lucide-react';

interface TopBarProps {
  onMenuToggle?: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const adminName =
    typeof window !== 'undefined' ? localStorage.getItem('adminName') || 'Admin' : 'Admin';
  const initials = adminName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-20 bg-white/40 backdrop-blur-2xl border-b border-white/20 flex items-center justify-between px-8 shrink-0 sticky top-0 z-30 transition-all duration-500 hover:bg-white/60">
      <div className="flex items-center gap-6">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-3 rounded-2xl text-slate-600 hover:bg-white/50 hover:shadow-xl hover:shadow-slate-200/20 transition-all active:scale-95"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-4">
           <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Baldia Mart</span>
            <span className="text-sm font-black text-slate-900 tracking-tighter uppercase italic">Control Protocol</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-3 rounded-2xl text-slate-500 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/40 hover:text-primary-600 transition-all active:scale-90 group">
          <Bell size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-primary-500 border-2 border-white shadow-sm" />
        </button>

        <div className="flex items-center gap-4 pl-6 border-l border-slate-200/50">
          <div className="flex flex-col items-end hidden md:flex">
            <p className="text-xs font-black text-slate-900 tracking-tight">{adminName}</p>
            <div className="flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-teal-500" />
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Session</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-[1.2rem] bg-slate-900 flex items-center justify-center text-white text-xs font-black shadow-xl shadow-slate-900/20 border-2 border-white ring-4 ring-slate-50 pointer-events-none">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
