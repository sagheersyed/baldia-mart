'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Package, LayoutList, Tag, UtensilsCrossed,
  Store, Layers, ClipboardList, Users, Bike, Radar, Wallet, MapPin, Megaphone,
  Star, Settings, LogOut, ChevronLeft, ShoppingCart, Activity, Pill, FileText,
  Stethoscope, FlaskConical, Video, Building2, RefreshCw, Calendar, DollarSign,
  BarChart3, HeartPulse, History, Shapes, Ticket, BellRing, Boxes, Microscope
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
    label: 'Architecture',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { name: 'Financials', icon: DollarSign, path: '/finance' },
      { name: 'System Logs', icon: History, path: '/audit-logs' },
      { name: 'Queue', icon: RefreshCw, path: '/change-requests' },
    ]
  },
  {
    label: 'Order Management',
    items: [
      { name: 'Live Stream', icon: ClipboardList, path: '/orders' },
      { name: 'Live Tracking', icon: Radar, path: '/live-map' },
      { name: 'Riders Unit', icon: Bike, path: '/riders' },
      { name: 'Users Grid', icon: Users, path: '/users' },
    ]
  },
  {
    label: 'Baldia Mart',
    items: [
      { name: 'Inventory', icon: ShoppingBag, path: '/products' },
      { name: 'Vendor Hub', icon: Store, path: '/vendors' },
      { name: 'Categories', icon: Shapes, path: '/categories' },
      { name: 'Brand Assets', icon: Tag, path: '/brands' },
      { name: 'Rashan Hub', icon: Boxes, path: '/rashan' },
    ]
  },
  {
    label: 'Healthcare Hub',
    items: [
      { name: 'Analytics', icon: BarChart3, path: '/pharma-analytics' },
      { name: 'Pharmacy Nodes', icon: HeartPulse, path: '/pharmacies' },
      { name: 'Medicines', icon: Pill, path: '/medicines' },
      { name: 'Doctor Network', icon: Stethoscope, path: '/doctors' },
      { name: 'Clinics', icon: Building2, path: '/clinics' },
      { name: 'Consultations', icon: Video, path: '/consultations' },
      { name: 'Lab Inventory', icon: Microscope, path: '/lab-tests' },
      { name: 'Appointments', icon: Calendar, path: '/lab-bookings' },
      { name: 'Prescriptions', icon: FileText, path: '/prescriptions' },
      { name: 'Subscriptions', icon: RefreshCw, path: '/subscriptions' },
    ]
  },
  {
    label: 'Hospitality',
    items: [
      { name: 'Restaurants', icon: UtensilsCrossed, path: '/restaurants' },
    ]
  },
  {
    label: 'Marketing & Ops',
    items: [
      { name: 'Campaigns', icon: Megaphone, path: '/marketing' },
      { name: 'Coupons', icon: Ticket, path: '/coupons' },
      { name: 'Events', icon: BellRing, path: '/events' },
      { name: 'Media Assets', icon: Layers, path: '/banners' },
      { name: 'Feedback', icon: Star, path: '/ratings' },
    ]
  },
  {
    label: 'Platform Core',
    items: [
      { name: 'Zones', icon: MapPin, path: '/zones' },
      { name: 'Wallets', icon: Wallet, path: '/wallets' },
      { name: 'Global Settings', icon: Settings, path: '/settings' },
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
    if (['Doctor Network', 'Clinics', 'Consultations'].includes(name)) return settings.feature_pharma_doctor_consultations_enabled;
    if (['Lab Inventory', 'Appointments'].includes(name)) return settings.feature_pharma_lab_tests_enabled;
    if (name === 'Subscriptions') return settings.feature_pharma_refills_enabled && settings.feature_show_pharma;
    if (['Medicines', 'Prescriptions', 'Analytics', 'Pharmacy Nodes'].includes(name)) return settings.feature_show_pharma;
    if (['Inventory', 'Vendor Hub', 'Categories'].includes(name)) return settings.feature_show_mart;
    if (name === 'Restaurants') return settings.feature_show_restaurants;
    if (name === 'Rashan Hub') return settings.feature_rashan_enabled;
    if (name === 'Brand Assets') return settings.feature_show_brands;
    return true;
  };

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/20 backdrop-blur-md z-40"
          onClick={onToggleCollapse}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          ${isCollapsed ? 'lg:w-[100px]' : 'lg:w-[320px]'} w-[320px]
          bg-white text-slate-600
          transition-all duration-500 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          border-r border-slate-100 relative overflow-hidden
        `}
      >
        <div className={`h-24 flex items-center shrink-0 px-8 ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
          <div className="relative shrink-0">
             <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
               <ShoppingCart size={24} />
             </div>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="font-black text-xl text-slate-900 tracking-tighter leading-none italic uppercase">Baldia Mart</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 truncate">Command Center</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-6 py-10 space-y-12 custom-scrollbar pb-12 relative z-10">
          {NAVIGATION_GROUPS.map((group) => {
            const filteredItems = group.items.filter(item => isModuleEnabled(item.name));
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.label} className="space-y-4">
                {!isCollapsed && (
                  <p className="px-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3">{group.label}</p>
                )}
                <div className="space-y-1.5">
                  {filteredItems.map((item) => {
                    const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`group ${active ? 'nav-item-active' : 'nav-item'}`}
                      >
                        <item.icon size={20} className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-indigo-600'}`} />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 p-6 border-t border-slate-100 bg-slate-50/30">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
              text-slate-400 hover:bg-rose-50 hover:text-rose-600
              ${isCollapsed ? 'justify-center border border-transparent hover:border-rose-100' : ''}
            `}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span>Deauthorize Session</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
