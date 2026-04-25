'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { showToast } from '@/hooks/useToast';
import { getAdminToken } from '@/lib/api';

// You can configure this via env variables later
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

export default function SocketListener() {
  useEffect(() => {
    const token = getAdminToken();
    if (!token) return; // Only connect if logged in

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: { token: `Bearer ${token}` },
      extraHeaders: { Authorization: `Bearer ${token}` },
    });

    socket.on('connect', () => {
      console.log('Admin Panel connected to Socket.IO');
      socket.emit('joinAdminRoom');
    });

    socket.on('newOrder', (order: any) => {
      console.log('New Order received in Admin:', order);
      showToast({
        title: 'New Order! 🎉',
        message: `Order #${order.id?.slice(0, 8)} placed for Rs ${order.total}`,
        variant: 'info',
      });
      playNotificationSound();
    });

    socket.on('orderStatusUpdated', (data: any) => {
      console.log('Order Updated:', data);
      showToast({
        title: 'Order Status Updated',
        message: `Order #${data.orderId?.slice(0, 8)} is now ${data.status}`,
        variant: 'info',
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const playNotificationSound = () => {
    try {
      // Basic browser beep or alert sound if available
      const audio = new Audio('/notification.mp3'); 
      audio.play().catch(e => console.log('Audio autoplay blocked', e));
    } catch (e) {
      console.log('Audio not supported', e);
    }
  };

  return null;
}
