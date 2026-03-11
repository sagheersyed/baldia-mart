import React from 'react';
import Link from 'next/link';
import { Home, ShoppingBag, List, Users, Bike, Map, Tag, Settings } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'Products', icon: ShoppingBag, path: '/products' },
    { name: 'Categories', icon: List, path: '/categories' },
    { name: 'Orders', icon: ShoppingBag, path: '/orders' },
    { name: 'Users', icon: Users, path: '/users' },
    { name: 'Riders', icon: Bike, path: '/riders' },
    { name: 'Delivery Zones', icon: Map, path: '/zones' },
    { name: 'Coupons', icon: Tag, path: '/coupons' },
  ];

  return (
    <div className="w-64 bg-secondary text-white min-h-screen p-4">
      <div className="flex items-center space-x-2 mb-10">
        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center font-bold">B</div>
        <span className="text-xl font-bold">Baldia Mart Admin</span>
      </div>
      <nav>
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
      <div className="absolute bottom-4 w-56">
        <button className="flex items-center space-x-3 p-3 w-full rounded-lg hover:bg-white/10 transition">
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
