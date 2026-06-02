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
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-5 shrink-0 sticky top-0 z-30">
      {/* Left: mobile menu + breadcrumb */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400">Baldia Mart</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-700">Admin Panel</span>
        </div>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-3">
        <button className="relative p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {initials}
          </div>
          <div className="hidden md:block leading-none">
            <p className="text-sm font-semibold text-slate-800">{adminName}</p>
            <p className="text-[10px] text-slate-400 font-medium">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
