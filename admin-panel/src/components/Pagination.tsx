'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
  className?: string;
};

export default function Pagination({ page, totalPages, onPageChange, className }: Props) {
  if (totalPages <= 1) return null;

  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={15} />
      </button>

      {start > 1 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(1)}
            className="w-9 h-9 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            1
          </button>
          {start > 2 && <span className="text-slate-300 text-sm px-1">…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${
            p === page
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-slate-300 text-sm px-1">…</span>}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            className="w-9 h-9 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
