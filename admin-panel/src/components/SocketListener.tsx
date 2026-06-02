'use client';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { showToast } from '@/hooks/useToast';
import { getAdminToken } from '@/lib/api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

export default function SocketListener() {
  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: { token: `Bearer ${token}` },
      extraHeaders: { Authorization: `Bearer ${token}` },
    });

    socket.on('connect', () => {
      console.log('[Admin] Socket connected to', SOCKET_URL);
      socket.emit('joinAdminRoom');
    });

    socket.on('connect_error', (err) => {
      console.error('[Admin] Socket connection error:', err.message);
    });

    // ── New Order ────────────────────────────────────────────────────────────
    socket.on('newOrder', (order: any) => {
      console.log('[Admin] newOrder received:', order?.id);
      showToast({
        title: 'New Order! 🎉',
        message: `Order #${order.id?.slice(0, 8)} placed for Rs ${order.total}`,
        variant: 'info',
      });
      playNotificationSound();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshOrders'));
        if (order.orderType === 'rashan') {
          window.dispatchEvent(new CustomEvent('refreshRashan'));
        }
      }
    });

    // ── Order Status Updated ─────────────────────────────────────────────────
    socket.on('orderStatusUpdated', (data: any) => {
      console.log('[Admin] orderStatusUpdated:', data);
      showToast({
        title: 'Order Status Updated',
        message: `Order #${data.orderId?.slice(0, 8)} → ${data.status}`,
        variant: 'info',
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshOrders'));
        window.dispatchEvent(new CustomEvent('refreshRashan'));
      }
    });

    // ── Settings Updated — reflect immediately in Admin UI ───────────────────
    socket.on('settings_updated', () => {
      console.log('[Admin] settings_updated received');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshSettings'));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    } catch {}
  };

  return null;
}
