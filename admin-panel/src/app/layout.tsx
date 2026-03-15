'use client';

import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token && !isLoginPage) {
      router.replace('/login');
    } else if (token && isLoginPage) {
      router.replace('/');
    }
    setInitialCheckDone(true);
  }, [pathname, router]);

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
      <body className={`${inter.className} flex bg-gray-50 min-h-screen`}>
        {!isLoginPage && <Sidebar />}
        <main className={`flex-1 overflow-y-auto ${isLoginPage ? 'flex items-center justify-center p-0' : ''}`}>
          {children}
        </main>
      </body>
    </html>
  );
}
