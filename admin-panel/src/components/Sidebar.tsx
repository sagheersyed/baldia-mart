import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ShoppingBag, List, Users, Bike, Map, Tag, Settings, LogOut, Star, Megaphone } from 'lucide-react';

export default function Sidebar() {
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
    { name: 'Categories', icon: List, path: '/categories' },
    { name: 'Orders', icon: ShoppingBag, path: '/orders' },
    { name: 'Users', icon: Users, path: '/users' },
    { name: 'Riders', icon: Bike, path: '/riders' },
    { name: 'Delivery Zones', icon: Map, path: '/zones' },
    { name: 'Marketing', icon: Megaphone, path: '/marketing' },
    { name: 'Ratings', icon: Star, path: '/ratings' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="w-64 bg-secondary text-white min-h-screen p-4 flex flex-col">
      <div className="flex items-center space-x-2 mb-10">
        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center font-bold">B</div>
        <span className="text-xl font-bold">Baldia Mart Admin</span>
      </div>
      <nav className="flex-grow">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link href={item.path} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition">
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-6 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition font-medium text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
