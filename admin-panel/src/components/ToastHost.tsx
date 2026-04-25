'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { getToastEventName, ToastPayload } from '@/hooks/useToast';

type ToastItem = Required<Pick<ToastPayload, 'title'>> &
  Omit<ToastPayload, 'title'> & { id: string };

const VARIANT = {
  success: {
    bar:  'bg-emerald-500',
    icon: <CheckCircle2 size={16} />,
    cls:  'text-emerald-600',
  },
  error: {
    bar:  'bg-red-500',
    icon: <AlertTriangle size={16} />,
    cls:  'text-red-600',
  },
  info: {
    bar:  'bg-blue-500',
    icon: <Info size={16} />,
    cls:  'text-blue-600',
  },
} as const;

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail;
      if (!detail?.title) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, title: detail.title, message: detail.message, variant: detail.variant ?? 'info', durationMs: detail.durationMs ?? 4000 }]);
      window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), detail.durationMs ?? 4000);
    };
    window.addEventListener(getToastEventName(), handler as EventListener);
    return () => window.removeEventListener(getToastEventName(), handler as EventListener);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const rendered = useMemo(() =>
    toasts.map((toast) => {
      const v = VARIANT[toast.variant ?? 'info'];
      return (
        <div
          key={toast.id}
          className="bg-white border border-slate-100 rounded-2xl shadow-card-lg overflow-hidden flex animate-slide-up"
        >
          <div className={`w-1 shrink-0 ${v.bar}`} />
          <div className="flex-1 flex items-start gap-3 px-4 py-3.5">
            <span className={`mt-0.5 shrink-0 ${v.cls}`}>{v.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
              {toast.message && <p className="text-xs text-slate-500 mt-0.5">{toast.message}</p>}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      );
    }),
    [toasts],
  );

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2rem)]">
      {rendered}
    </div>
  );
}
