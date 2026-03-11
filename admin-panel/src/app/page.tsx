'use client';
import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
  });

  // Example dashboard component with static styling, usually fetched from backend `/api/v1/admin/analytics`
  useEffect(() => {
    // Mocking response for visual purposes till backend is running
    setStats({
      totalOrders: 1245,
      totalRevenue: 25400,
      activeUsers: 342,
    });
  }, []);

  const statCards = [
    { title: 'Total Revenue', value: `$${stats.totalRevenue}`, icon: DollarSign, color: 'bg-green-100 text-green-600' },
    { title: 'Orders', value: stats.totalOrders.toString(), icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
    { title: 'Active Users', value: stats.activeUsers.toString(), icon: Users, color: 'bg-purple-100 text-purple-600' },
    { title: 'Conversion Rate', value: '4.2%', icon: TrendingUp, color: 'bg-orange-100 text-orange-600' },
  ];

  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, Admin</p>
        </div>
        <div>
          <button className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition">
            Download Report
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
              <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
            </div>
            <div className={`p-4 rounded-full ${card.color}`}>
              <card.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Orders (Mock)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="pb-3 font-medium">Order ID</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-4 font-medium text-gray-800">#ORD-{9000 + i}</td>
                  <td className="py-4 text-gray-600">Customer {i}</td>
                  <td className="py-4 text-gray-500">Today, 10:{i}4 AM</td>
                  <td className="py-4 font-medium text-gray-800">${(i * 12.5).toFixed(2)}</td>
                  <td className="py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Delivered
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
