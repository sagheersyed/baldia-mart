'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { X } from 'lucide-react';

// You can configure this via env variables later
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

export default function SocketListener() {
  const [toast, setToast] = useState<{ title: string; message: string; visible: boolean } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return; // Only connect if logged in

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: true
    });

    socket.on('connect', () => {
      console.log('Admin Panel connected to Socket.IO');
      socket.emit('joinAdminRoom');
    });

    socket.on('newOrder', (order: any) => {
      console.log('New Order received in Admin:', order);
      showToast('New Order! 🎉', `Order #${order.id?.slice(0, 8)} placed for Rs ${order.total}`);
      playNotificationSound();
    });

    socket.on('orderStatusUpdated', (data: any) => {
      console.log('Order Updated:', data);
      showToast('Order Status Updated', `Order #${data.orderId?.slice(0, 8)} is now ${data.status}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const showToast = (title: string, message: string) => {
    setToast({ title, message, visible: true });
    setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, visible: false } : null));
    }, 5000);
  };

  const playNotificationSound = () => {
    try {
      // Basic browser beep or alert sound if available
      const audio = new Audio('/notification.mp3'); 
      audio.play().catch(e => console.log('Audio autoplay blocked', e));
    } catch (e) {
      console.log('Audio not supported', e);
    }
  };

  if (!toast?.visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] bg-white border border-gray-200 shadow-2xl rounded-xl p-4 min-w-[300px] flex gap-4 animate-in slide-in-from-bottom-5">
      <div className="flex-1">
        <h4 className="font-bold text-gray-900 text-sm mb-1">{toast.title}</h4>
        <p className="text-gray-600 text-xs">{toast.message}</p>
      </div>
      <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
        <X size={18} />
      </button>
    </div>
  );
}
