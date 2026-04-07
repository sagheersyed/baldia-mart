'use client';

import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import SocketListener from '@/components/SocketListener';
import { Menu, X } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token && !isLoginPage) {
      router.replace('/login');
    } else if (token && isLoginPage) {
      router.replace('/');
    }
    
    const savedCollapse = localStorage.getItem('sidebarCollapsed');
    if (savedCollapse === 'true') setIsSidebarCollapsed(true);
    
    setInitialCheckDone(true);
  }, [pathname, router]);

  // Close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
  };

  if (!initialCheckDone) {
    return (
      <html lang="en">
        <body className={`${inter.className} bg-gray-50 flex items-center justify-center min-h-screen`}>
          {/* Prevent flash of content */}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <title>Baldia Mart Admin</title>
      <body className={`${inter.className} flex bg-gray-50 min-h-screen relative`}>
        {!isLoginPage && (
          <>
            {/* Mobile Toggle Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
              <div 
                className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            <Sidebar 
              isOpen={isSidebarOpen} 
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleCollapse}
            />
          </>
        )}
        <main className={`flex-1 overflow-y-auto ${isLoginPage ? 'flex items-center justify-center p-0' : 'pt-16 lg:pt-0'}`}>
          {children}
        </main>
        {!isLoginPage && <SocketListener />}
      </body>
    </html>
  );
}
