'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Package, LayoutList, Tag, UtensilsCrossed,
  Store, Layers, ClipboardList, Users, Bike, Radar, Wallet, MapPin, Megaphone,
  Star, Settings, LogOut, ChevronLeft, ShoppingCart, Activity, Pill, FileText,
  Stethoscope, FlaskConical, Video, Building2, RefreshCw, Calendar, DollarSign
} from 'lucide-react';
import { clearAdminSession, BASE_URL } from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NAVIGATION_GROUPS = [
  {
    label: 'Management',
    items: [
      { name: 'Insights', icon: LayoutDashboard, path: '/' },
      { name: 'Finance Center', icon: DollarSign, path: '/finance' },
      { name: 'Queue Manager', icon: RefreshCw, path: '/change-requests' },
      { name: 'Orders', icon: ClipboardList, path: '/orders' },
    ]
  },
  {
    label: 'Verticals',
    items: [
      { name: 'Products', icon: ShoppingBag, path: '/products' },
      { name: 'Medicines', icon: Pill, path: '/medicines' },
      { name: 'Clinics', icon: Building2, path: '/clinics' },
      { name: 'Restaurants', icon: UtensilsCrossed, path: '/restaurants' },
      { name: 'Rashan Requests', icon: Package, path: '/rashan' },
    ]
  },
  {
    label: 'Healthcare',
    pharmaOnly: true,
    items: [
      { name: 'Doctors', icon: Stethoscope, path: '/doctors' },
      { name: 'Consultations', icon: Video, path: '/consultations' },
      { name: 'Lab Tests', icon: FlaskConical, path: '/lab-tests' },
      { name: 'Prescriptions', icon: FileText, path: '/prescriptions' },
      { name: 'Subscriptions', icon: RefreshCw, path: '/subscriptions' },
    ]
  },
  {
    label: 'Ecosystem',
    items: [
      { name: 'Vendors', icon: Store, path: '/vendors' },
      { name: 'Users', icon: Users, path: '/users' },
      { name: 'Riders', icon: Bike, path: '/riders' },
      { name: 'Live Map', icon: Radar, path: '/live-map' },
      { name: 'Wallets', icon: Wallet, path: '/wallets' },
    ]
  },
  {
    label: 'Platform',
    items: [
      { name: 'Delivery Zones', icon: MapPin, path: '/zones' },
      { name: 'Marketing', icon: Megaphone, path: '/marketing' },
      { name: 'Banners', icon: Layers, path: '/banners' },
      { name: 'Ratings', icon: Star, path: '/ratings' },
      { name: 'Settings', icon: Settings, path: '/settings' },
    ]
  }
];

export default function Sidebar({ isOpen, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();

  const handleLogout = () => {
    clearAdminSession();
    router.replace('/login');
  };

  const isModuleEnabled = (name: string) => {
    if (['Doctors', 'Clinics', 'Consultations'].includes(name)) return settings.feature_pharma_doctor_consultations_enabled;
    if (['Lab Tests', 'Lab Bookings'].includes(name)) return settings.feature_pharma_lab_tests_enabled;
    if (name === 'Subscriptions') return settings.feature_pharma_refills_enabled && settings.feature_show_pharma;
    if (['Medicines', 'Prescriptions', 'Pharma Analytics', 'Pharmacies'].includes(name)) return settings.feature_show_pharma;
    if (['Products', 'Vendors', 'Categories'].includes(name)) return settings.feature_show_mart;
    if (name === 'Restaurants') return settings.feature_show_restaurants;
    if (name === 'Rashan Requests') return settings.feature_rashan_enabled;
    if (name === 'Brands') return settings.feature_show_brands;
    return true;
  };

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-md z-40"
          onClick={onToggleCollapse}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          ${isCollapsed ? 'lg:w-[84px]' : 'lg:w-64'} w-64
          bg-[#0B0E14] text-white
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-2xl lg:shadow-none border-r border-white/5
        `}
      >
        <div className={`h-20 flex items-center shrink-0 px-6 ${isCollapsed ? 'justify-center border-b border-white/5' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-primary-600/20 shrink-0 transform hover:scale-105 transition-transform">
            <ShoppingCart size={20} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="font-black text-xs text-white tracking-[0.2em] uppercase italic">Baldia Mart</p>
              <p className="text-[10px] text-slate-500 font-black tracking-widest mt-0.5">CORE OS</p>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex ml-auto p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all shrink-0 ${isCollapsed ? 'rotate-180' : ''}`}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto pt-6 px-4 space-y-8 custom-scrollbar pb-12">
          {NAVIGATION_GROUPS.map((group) => {
            const filteredItems = group.items.filter(item => isModuleEnabled(item.name));
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.label} className="space-y-2">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] pl-4">{group.label}</p>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`
                          group flex items-center py-3 rounded-2xl transition-all duration-200
                          ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-3'}
                          ${active 
                            ? 'bg-gradient-to-r from-white/10 to-transparent text-white shadow-lg border-l-4 border-primary-500 shadow-white/5' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5'}
                        `}
                      >
                        <item.icon size={isCollapsed ? 20 : 18} className={`shrink-0 transition-colors ${active ? 'text-primary-500' : 'group-hover:text-primary-400'}`} />
                        {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">{item.name}</span>}
                        {active && !isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 p-4 border-t border-white/5 bg-black/20">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[13px] font-black transition-all
              text-red-500 hover:bg-red-500/10 hover:shadow-lg hover:shadow-red-500/5
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span className="uppercase tracking-widest italic">Terminate</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
