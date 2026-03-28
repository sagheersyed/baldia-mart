'use client';

import React, { useState, useEffect } from 'react';
import { Star, User, ShoppingBag, MessageSquare, Calendar, Filter, RefreshCcw, Bike } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  rider: { id: string; name: string; phoneNumber: string };
  user: { name: string; phoneNumber: string };
  order: { id: string; total: number };
}

const API_URL = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1/riders/reviews/all';

export default function RatingsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [filterRider, setFilterRider] = useState<string | 'all'>('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(API_URL);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews.filter(r => {
    const matchesRating = filterRating === 'all' || r.rating === filterRating;
    const matchesRider = filterRider === 'all' || r.rider.id === filterRider;
    return matchesRating && matchesRider;
  });

  // Extract unique riders for the filter dropdown
  const uniqueRiders = Array.from(new Map(reviews.map(r => [r.rider.id, r.rider])).values());

  const stats = {
    average: reviews.length > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) : '5.0',
    total: reviews.length,
    fives: reviews.filter(r => r.rating === 5).length
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Rider Ratings</h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center">
            <Star size={16} className="mr-2 text-primary" fill="currentColor" />
            Monitor service quality and customer feedback
          </p>
        </div>
        <button onClick={fetchReviews} className="p-3 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-primary hover:border-primary/20 transition shadow-sm">
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-primary to-orange-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-orange-500/20">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Star size={24} fill="currentColor" />
            </div>
            <span className="font-black uppercase tracking-widest text-xs opacity-80">Global Average</span>
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-6xl font-black">{stats.average}</span>
            <span className="text-xl font-bold mb-2 opacity-80">/ 5.0</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 flex flex-col justify-center">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Total Reviews</span>
          <span className="text-4xl font-black text-gray-900">{stats.total}</span>
          <div className="mt-4 flex items-center text-sm font-bold text-green-500">
            <Calendar size={14} className="mr-1" /> Last 30 days
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 flex flex-col justify-center">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Perfect 5 Stars</span>
          <span className="text-4xl font-black text-gray-900">{stats.fives}</span>
          <div className="mt-4 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full rounded-full" style={{ width: `${(stats.fives / (stats.total || 1)) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <h2 className="text-xl font-black text-gray-900 flex items-center">
            <MessageSquare size={20} className="mr-3 text-primary" />
            Recent Feedback
          </h2>
          <div className="flex items-center space-x-2">
            <select
              value={filterRider}
              onChange={(e) => setFilterRider(e.target.value)}
              className="mr-2 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Riders</option>
              {uniqueRiders.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name} ({r.phoneNumber})</option>
              ))}
            </select>
            <Filter size={16} className="text-gray-400 mr-2" />
            {[5, 4, 3, 2, 1].map(r => (
              <button
                key={r}
                onClick={() => setFilterRating(filterRating === r ? 'all' : r)}
                className={`w-10 h-10 rounded-xl font-bold transition-all flex items-center justify-center ${filterRating === r ? 'bg-primary text-white scale-110 shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {r} <Star size={10} className="ml-1" fill={filterRating === r ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-20 text-center">
              <Star size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="font-bold text-gray-400 text-lg">No reviews found matching this filter</p>
            </div>
          ) : filteredReviews.map(review => (
            <div key={review.id} className="p-8 hover:bg-gray-50/50 transition-colors">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-start space-x-6">
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex flex-col items-center justify-center min-w-[70px]">
                    <span className="text-3xl font-black text-primary">{review.rating}</span>
                    <div className="flex text-primary mt-1">
                      {[...Array(review.rating)].map((_, i) => <Star key={i} size={8} fill="currentColor" />)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center underline decoration-primary/20 underline-offset-4">
                      {review.comment || (review.rating >= 4 ? "Great service! 🚀" : "Needs improvement.")}
                    </h3>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mr-2 border border-blue-100">
                          <User size={14} />
                        </div>
                        <span className="font-bold text-gray-600">{review.user.name}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-primary mr-2 border border-orange-100">
                          <Bike size={14} />
                        </div>
                        <span className="font-bold text-gray-600">{review.rider.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Order Summary</div>
                  <div className="flex items-center justify-end text-sm font-bold text-gray-700">
                    <ShoppingBag size={14} className="mr-2" />
                    Rs. {Number(review.order.total).toFixed(0)}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 mt-2">
                    {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
