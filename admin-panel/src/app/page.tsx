'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Bike, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ExternalLink
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { fetchWithAuth, BASE_URL } from '@/lib/api';

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  activeRiders: number;
}

interface ChartData {
  date: string;
  revenue: number;
}

interface RecentOrder {
  id: string;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

const API_URL = `${BASE_URL}/analytics/dashboard`;

export default function Dashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetchWithAuth(API_URL);
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const data = await res.json();
        
        setMetrics(data.metrics);
        setChartData(data.salesChartData);
        setRecentOrders(data.recentOrders);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // Optional: Set up polling every 60 seconds for near real-time updates
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-bold text-lg animate-pulse">Loading Analytics...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `Rs. ${metrics.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: '+12.5%',
      isPositive: true,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Total Orders',
      value: metrics.totalOrders.toString(),
      icon: ShoppingBag,
      trend: '+8.2%',
      isPositive: true,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Active Users',
      value: metrics.activeUsers.toString(),
      icon: Users,
      trend: '+24.4%',
      isPositive: true,
      color: 'bg-violet-500',
      lightColor: 'bg-violet-50',
      textColor: 'text-violet-600'
    },
    {
      title: 'Active Riders',
      value: metrics.activeRiders.toString(),
      icon: Bike,
      trend: '-2.1%',
      isPositive: false,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'ACCEPTED': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'DELIVERING': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'DELIVERED': return 'bg-green-50 text-green-600 border-green-200';
      case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center">
            <Activity size={16} className="mr-2 text-primary" />
            Live Marketplace Analytics
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Last Updated</p>
          <p className="text-gray-900 font-bold">{new Date().toLocaleTimeString()}</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/40 border border-gray-100 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${stat.lightColor}`}>
                <stat.icon size={28} className={stat.textColor} />
              </div>
              <span className={`flex items-center text-sm font-bold px-3 py-1 rounded-full ${stat.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {stat.isPositive ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                {stat.trend}
              </span>
            </div>
            <div>
              <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-1">{stat.title}</h3>
              <p className="text-3xl font-black text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/40 border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Revenue Overview</h2>
              <p className="text-gray-500 font-medium">Last 7 Days Performance</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontWeight: 600, fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontWeight: 600, fontSize: 12 }}
                  tickFormatter={(value) => `Rs.${value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="#F97316" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders List */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col h-[520px]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <h2 className="text-xl font-black text-gray-900">Recent Orders</h2>
              <p className="text-sm text-gray-500 font-medium">Latest incoming requests</p>
            </div>
            <Clock size={20} className="text-gray-400" />
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
            {recentOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-medium">
                No recent orders found.
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all group shrink-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-extrabold text-gray-900 truncate max-w-[120px]">{order.customerName}</span>
                    <span className="font-black text-primary">Rs. {Number(order.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-bold">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button
            onClick={() => router.push('/orders')}
            className="mt-6 w-full py-4 rounded-xl text-primary font-bold hover:bg-primary/5 transition-colors border-2 border-dashed border-primary/20 flex items-center justify-center gap-2 shrink-0"
          >
            <ExternalLink size={16} />
            View All Orders
          </button>
        </div>
      </div>
    </div>
  );
}
