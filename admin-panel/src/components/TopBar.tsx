'use client';

import React from 'react';
import { Bell, Menu, ShieldCheck, Search, Command } from 'lucide-react';

interface TopBarProps {
  onMenuToggle?: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const adminName =
    typeof window !== 'undefined' ? localStorage.getItem('adminName') || 'System Administrator' : 'System Administrator';
  const initials = adminName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-24 bg-white/80 backdrop-blur-3xl border-b border-slate-100/50 flex items-center justify-between px-10 shrink-0 sticky top-0 z-30 transition-all">
      <div className="flex items-center gap-8">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-3.5 rounded-2xl border border-slate-100 text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
          >
            <Menu size={22} />
          </button>
        )}
        
        <div className="hidden lg:flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100/50 group focus-within:border-indigo-500/30 focus-within:bg-white transition-all w-96">
           <Search size={16} className="text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
           <input 
             type="text" 
             placeholder="Search platform..." 
             className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-900 placeholder:text-slate-300 placeholder:uppercase placeholder:tracking-widest flex-1"
           />
           <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-100">
              <Command size={10} className="text-slate-300" />
              <span className="text-[10px] font-black text-slate-300">K</span>
           </div>
        </div>

        <div className="hidden xl:flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 transition-all hover:bg-emerald-100">
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Protocol 4 ACTIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <button className="relative w-14 h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-all active:scale-95 border border-transparent hover:border-slate-100 group">
            <Bell size={22} />
            <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-sm ring-4 ring-indigo-500/10 group-hover:animate-ping" />
          </button>
        </div>

        <div className="flex items-center gap-6 pl-8 border-l border-slate-100">
          <div className="flex flex-col items-end hidden md:flex">
            <p className="text-sm font-black text-slate-900 leading-none mb-2 italic uppercase tracking-tight">{adminName}</p>
            <div className="flex items-center gap-2">
               <ShieldCheck size={14} className="text-indigo-600" />
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized Architech</p>
            </div>
          </div>
          <div className="relative group cursor-pointer transition-transform hover:scale-105 active:scale-95">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white text-sm font-black shadow-2xl shadow-indigo-200 border-2 border-white">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
          </div>
        </div>
      </div>
    </header>
  );
}
