import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ShoppingBag, List, Users, Bike, Map, Tag, Settings, LogOut, Star, Megaphone, Layers, UtensilsCrossed, Store, Package } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminName');
    router.replace('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'Products', icon: ShoppingBag, path: '/products' },
    { name: 'Rashan Requests', icon: Package, path: '/rashan' },
    { name: 'Categories', icon: List, path: '/categories' },
    { name: 'Brands', icon: Tag, path: '/brands' },
    { name: 'Restaurants', icon: UtensilsCrossed, path: '/restaurants' },
    { name: 'Vendors', icon: Store, path: '/vendors' },
    { name: 'Banners', icon: Layers, path: '/banners' },
    { name: 'Orders', icon: ShoppingBag, path: '/orders' },
    { name: 'Users', icon: Users, path: '/users' },
    { name: 'Riders', icon: Bike, path: '/riders' },
    { name: 'Delivery Zones', icon: Map, path: '/zones' },
    { name: 'Marketing', icon: Megaphone, path: '/marketing' },
    { name: 'Ratings', icon: Star, path: '/ratings' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className={`
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
      lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50
      ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64 bg-secondary text-white min-h-screen p-4 flex flex-col
      transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
    `}>
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'} mb-10 mt-14 lg:mt-0 relative`}>
        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center font-bold shrink-0">B</div>
        {!isCollapsed && <span className="text-xl font-bold truncate">Baldia Mart Admin</span>}
        
        {/* Desktop Collapse Toggle */}
        <button 
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-8 top-1/2 -translate-y-1/2 bg-primary text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
        >
          <div className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </div>
        </button>
      </div>
      <nav className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <li key={item.name}>
                <Link 
                  href={item.path} 
                  title={isCollapsed ? item.name : undefined}
                  className={`
                    flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                      : 'hover:bg-white/5 text-gray-400 hover:text-white group'}
                    ${!isCollapsed && !isActive ? 'hover:pl-4' : ''}
                  `}
                >
                  <item.icon size={20} className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'} shrink-0`} />
                  {!isCollapsed && <span className="font-bold text-sm tracking-tight truncate">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="pt-6 border-t border-white/10 flex-shrink-0 mt-4">
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} w-full px-4 py-3 rounded-xl transition-all font-bold text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500 group`}
        >
          <LogOut size={20} className={`${!isCollapsed ? 'group-hover:-translate-x-1' : ''} transition-transform shrink-0`} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
