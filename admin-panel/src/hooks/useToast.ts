export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastPayload {
  title: string;
  message?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

const TOAST_EVENT = 'app-toast';

export function showToast(payload: ToastPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: payload }));
}

export function getToastEventName() {
  return TOAST_EVENT;
}
