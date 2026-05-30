'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, Package, LayoutList, Tag, UtensilsCrossed,
  Store, Layers, ClipboardList, Users, Bike, Radar, Wallet, MapPin, Megaphone,
  Star, Settings, LogOut, ChevronLeft, ShoppingCart, Activity, Pill, FileText,
  Stethoscope, FlaskConical, Video, Building2, RefreshCw, Calendar,
} from 'lucide-react';
import { clearAdminSession, BASE_URL } from '@/lib/api';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV = [
  { name: 'Dashboard',        icon: LayoutDashboard, path: '/' },
  { name: 'Orders',           icon: ClipboardList,   path: '/orders' },
  { name: 'Products',         icon: ShoppingBag,     path: '/products' },
  { name: 'Medicines',        icon: Pill,            path: '/medicines' },
  { name: 'Doctors',          icon: Stethoscope,     path: '/doctors' },
  { name: 'Clinics',          icon: Building2,       path: '/clinics' },
  { name: 'Consultations',    icon: Video,           path: '/consultations' },
  { name: 'Lab Tests',        icon: FlaskConical,    path: '/lab-tests' },
  { name: 'Lab Bookings',     icon: ClipboardList,   path: '/lab-bookings' },
  { name: 'Prescriptions',    icon: FileText,        path: '/prescriptions' },
  { name: 'Subscriptions',    icon: RefreshCw,       path: '/subscriptions' },
  { name: 'Pharma Analytics', icon: Activity,        path: '/pharma-analytics' },
  { name: 'Rashan Requests',  icon: Package,         path: '/rashan' },
  { name: 'Categories',       icon: LayoutList,      path: '/categories' },
  { name: 'Brands',           icon: Tag,             path: '/brands' },
  { name: 'Restaurants',      icon: UtensilsCrossed, path: '/restaurants' },
  { name: 'Vendors',          icon: Store,           path: '/vendors' },
  { name: 'Pharmacies',       icon: Activity,        path: '/pharmacies' },
  { name: 'Banners',          icon: Layers,          path: '/banners' },
  { name: 'Events & Campaigns', icon: Calendar,        path: '/events' },
  { name: 'Users',            icon: Users,           path: '/users' },
  { name: 'Riders',           icon: Bike,            path: '/riders' },
  { name: 'Live Map',         icon: Radar,           path: '/live-map' },
  { name: 'Wallets',          icon: Wallet,          path: '/wallets' },
  { name: 'Delivery Zones',   icon: MapPin,          path: '/zones' },
  { name: 'Marketing',        icon: Megaphone,       path: '/marketing' },
  { name: 'Ratings',          icon: Star,            path: '/ratings' },
  { name: 'Settings',         icon: Settings,        path: '/settings' },
];

export default function Sidebar({ isOpen, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [settings, setSettings] = React.useState<any>({});

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${BASE_URL}/settings/public`);
        if (res.ok) setSettings(await res.json());
      } catch (e) {
        console.error('Sidebar settings fetch failed', e);
      }
    };
    fetchSettings();
  }, []);

  const handleLogout = () => {
    clearAdminSession();
    router.replace('/login');
  };

  const filteredNav = NAV.filter(item => {
    if (['Doctors', 'Clinics', 'Consultations'].includes(item.name)) {
      return settings.feature_pharma_doctor_consultations_enabled;
    }
    if (['Lab Tests', 'Lab Bookings'].includes(item.name)) {
      return settings.feature_pharma_lab_tests_enabled;
    }
    if (item.name === 'Subscriptions') {
      return settings.feature_pharma_refills_enabled !== false && settings.feature_show_pharma !== false;
    }
    if (['Medicines', 'Prescriptions', 'Pharma Analytics', 'Pharmacies'].includes(item.name)) {
      return settings.feature_show_pharma !== false;
    }
    if (['Products', 'Vendors', 'Categories'].includes(item.name)) {
      return settings.feature_show_mart !== false;
    }
    if (item.name === 'Restaurants') return settings.feature_show_restaurants !== false;
    if (item.name === 'Rashan Requests') return settings.feature_rashan_enabled !== false;
    if (item.name === 'Brands') return settings.feature_show_brands !== false;
    return true;
  });

  return (
    <>
      {/* Backdrop mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          onClick={onToggleCollapse}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'} w-64
          bg-slate-900 text-white
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-xl lg:shadow-none
        `}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center shrink-0 border-b border-white/8 px-4 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shadow shrink-0">
            <ShoppingCart size={16} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="font-bold text-sm text-white truncate">Baldia Mart</p>
              <p className="text-[10px] text-slate-400 font-medium">Admin Panel</p>
            </div>
          )}

          {/* Collapse toggle (desktop) */}
          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex ml-auto p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition shrink-0 ${isCollapsed ? 'rotate-180' : ''}`}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {filteredNav.map((item) => {
            const active =
              item.path === '/'
                ? pathname === '/'
                : pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                title={isCollapsed ? item.name : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150
                  ${active
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-white/8 hover:text-white'}
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <item.icon size={17} className="shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-white/8 px-3 py-4">
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={17} className="shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
