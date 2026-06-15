'use client';

import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import SocketListener from '@/components/SocketListener';
import ToastHost from '@/components/ToastHost';
import { SettingsProvider } from '@/context/SettingsContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const [isSidebarOpen, setIsSidebarOpen]       = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem('sidebarCollapsed', (!prev).toString());
      return !prev;
    });
  };

  return (
    <html lang="en" className={inter.variable}>
      <title>Baldia Mart Admin</title>
      <body className={`${inter.className} ${isLoginPage ? 'bg-slate-50' : 'flex bg-slate-100 min-h-screen'}`}>
        <SettingsProvider>
          {isLoginPage ? (
            children
          ) : (
            <>
              <Sidebar
                isOpen={isSidebarOpen}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={toggleCollapse}
              />

              {/* Main */}
              <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
                <TopBar onMenuToggle={() => setIsSidebarOpen((v) => !v)} />
                <main className="flex-1 overflow-y-auto p-5 lg:p-7 animate-fade-in">
                  {children}
                </main>
              </div>
            </>
          )}

          <ToastHost />
          <SocketListener />
        </SettingsProvider>
      </body>
    </html>
  );
}
