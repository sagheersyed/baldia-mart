'use client';

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Bike, Phone, Clock, Navigation, Map as MapIcon, Users } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { fetchWithAuth, BASE_URL } from '@/lib/api';

interface RiderLocation {
  id: string;
  name: string;
  phoneNumber: string;
  lat: number;
  lng: number;
  isActive: boolean;
  isOnline: boolean;
  vehicleNumber: string;
  lastUpdated: string;
  activeOrders?: any[];
}

export default function RiderMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  
  const [riders, setRiders] = useState<Map<string, RiderLocation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const defaultCenter: [number, number] = [24.915226, 66.964319];

  // 1. Initialize Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Initialize Leaflet Map
    leafletMap.current = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
    });

    // Add Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 20,
    }).addTo(leafletMap.current);

    setLoading(false);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // 2. Fetch Initial Data & Socket Setup
  useEffect(() => {
    const fetchInitialRiders = async () => {
      try {
        const res = await fetchWithAuth(`${BASE_URL}/riders/all`);
        if (res.ok) {
          const data = await res.json();
          const riderMap = new Map<string, RiderLocation>();
          data.forEach((r: any) => {
            if (r.currentLat && r.currentLng) {
              riderMap.set(r.id, {
                id: r.id,
                name: r.name || 'Unknown Rider',
                phoneNumber: r.phoneNumber,
                lat: Number(r.currentLat),
                lng: Number(r.currentLng),
                isActive: r.isActive,
                isOnline: r.isOnline,
                vehicleNumber: r.vehicleNumber || 'N/A',
                lastUpdated: r.updatedAt,
                activeOrders: r.activeOrders || [],
              });
            }
          });
          setRiders(riderMap);
        }
      } catch (error) {
        console.error('Failed to fetch riders', error);
      }
    };

    fetchInitialRiders();

    const socketUrl = BASE_URL.replace('/api/v1', '');
    const socket: Socket = io(socketUrl);
    
    socket.on('connect', () => {
      socket.emit('joinAdminRoom');
      console.log('Socket Connected to Admin Room');
    });

    socket.on('riderLocationUpdated', (payload: any) => {
      setRiders(prev => {
        const next = new Map(prev);
        const existing = next.get(payload.riderId);
        if (existing) {
          next.set(payload.riderId, {
            ...existing,
            lat: payload.lat,
            lng: payload.lng,
            lastUpdated: payload.timestamp,
          });
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 3. Update Markers on Map
  useEffect(() => {
    if (!leafletMap.current) return;

    const currentRiders = Array.from(riders.values());
    
    // Update or Add Markers
    currentRiders.forEach(rider => {
      const isBusy = (rider.activeOrders?.length || 0) > 0;
      
      const icon = L.divIcon({
        className: 'custom-rider-icon',
        html: `
          <div class="relative group">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xl transform transition-transform group-hover:scale-110 ${rider.isOnline ? (isBusy ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-green-400 to-green-600') : 'bg-gradient-to-br from-gray-400 to-gray-600'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 9h3.5L19 14l-3.5 3.5"/><path d="M12 19V9l-2 2h-3l-2-2"/></svg>
            </div>
            ${rider.isOnline ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>' : ''}
            ${isBusy ? `<div class="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] font-black px-1 rounded-full border border-white shadow-sm">${rider.activeOrders?.length}</div>` : ''}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (markersRef.current[rider.id]) {
        markersRef.current[rider.id].setLatLng([rider.lat, rider.lng]);
        markersRef.current[rider.id].setIcon(icon);
      } else {
        const marker = L.marker([rider.lat, rider.lng], { icon })
          .addTo(leafletMap.current!)
          .bindPopup(`
            <div class="p-1 min-w-[200px]">
              <div class="flex items-center gap-2 mb-2">
                <div class="font-black text-gray-900">${rider.name}</div>
                ${isBusy ? '<span class="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black rounded-md uppercase tracking-wider">Busy</span>' : ''}
              </div>
              <div class="text-[10px] text-gray-500 mb-1 font-bold">Vehicle: ${rider.vehicleNumber}</div>
              <div class="text-[10px] text-gray-500 font-bold">Phone: ${rider.phoneNumber}</div>
              ${isBusy ? `
                <div class="mt-2 pt-2 border-t border-gray-100">
                  <div class="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Orders</div>
                  ${rider.activeOrders?.map(o => `
                    <div class="flex justify-between items-center bg-gray-50 p-1.5 rounded-lg mb-1">
                      <span class="text-[9px] font-bold text-gray-700">#${o.id.slice(0, 8)}</span>
                      <span class="text-[8px] font-black text-blue-500 uppercase">${o.status}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `);
        markersRef.current[rider.id] = marker;
      }
    });

    // Remove old markers
    Object.keys(markersRef.current).forEach(id => {
      if (!riders.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

  }, [riders]);

  const focusRider = (id: string) => {
    const rider = riders.get(id);
    if (rider && leafletMap.current && markersRef.current[id]) {
      leafletMap.current.flyTo([rider.lat, rider.lng], 16, {
        animate: true,
        duration: 1.5
      });
      // Small delay to let it fly before opening popup
      setTimeout(() => {
        markersRef.current[id].openPopup();
      }, 1500);
    }
  };

  const ridersList = Array.from(riders.values());
  const onlineCount = ridersList.filter(r => r.isOnline).length;
  const filteredRiders = ridersList.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full relative overflow-hidden rounded-[2.5rem] shadow-inner bg-gray-50 border border-gray-100 flex">
      
      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Advanced UI Overlay */}
        <div className="absolute top-6 left-6 z-[1000] space-y-3 pointer-events-none">
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-5 rounded-[2rem] shadow-2xl min-w-[200px] animate-in slide-in-from-left-5 duration-500 pointer-events-auto">
            <div className="flex items-center justify-between mb-4">
               <div className="p-2 bg-primary/10 rounded-xl">
                 <Users size={18} className="text-primary" />
               </div>
               <div className="flex gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500/50 animate-pulse delay-75"></span>
               </div>
            </div>
            <div className="text-4xl font-black text-gray-900 leading-none">{riders.size}</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Fleet Mapped</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-black text-green-600">{onlineCount}</div>
                <div className="text-[8px] font-bold text-gray-400 uppercase">Online</div>
              </div>
              <div>
                <div className="text-lg font-black text-gray-400">{riders.size - onlineCount}</div>
                <div className="text-[8px] font-bold text-gray-400 uppercase">Offline</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-4 pointer-events-auto w-fit">
             <div className="flex items-center gap-2 text-[9px] font-bold text-white uppercase tracking-widest">
               <span className="w-2 h-2 rounded-full bg-green-500"></span> Live
             </div>
             <div className="flex items-center gap-2 text-[9px] font-bold text-blue-500 uppercase tracking-widest">
               <span className="w-2 h-2 rounded-full bg-blue-500"></span> Busy
             </div>
             <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
               <span className="w-2 h-2 rounded-full bg-gray-500"></span> Offline
             </div>
          </div>
        </div>

        {/* Map Container Ref */}
        <div ref={mapRef} className="w-full h-full z-0" />

        {loading && (
          <div className="absolute inset-0 z-[2000] bg-gray-50/50 backdrop-blur-sm flex items-center justify-center">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Right Sidebar: Rider List & Search */}
      <div className="w-80 bg-white border-l border-gray-100 flex flex-col z-[1000] shadow-2xl relative">
        <div className="p-6 border-b border-gray-100 shrink-0">
          <h3 className="font-black text-gray-900 mb-4 tracking-tight">Active Fleet</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search rider or vehicle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 pl-10 text-xs font-bold text-gray-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:font-medium placeholder:text-gray-400"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {filteredRiders.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Bike size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">No riders found</p>
            </div>
          ) : (
            filteredRiders.map((rider) => {
              const isBusy = (rider.activeOrders?.length || 0) > 0;
              return (
                <button 
                  key={rider.id}
                  onClick={() => focusRider(rider.id)}
                  className="w-full text-left bg-white border border-gray-100 p-4 rounded-2xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-gray-900 text-sm group-hover:text-primary transition-colors">{rider.name}</h4>
                      {isBusy && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[7px] font-black rounded-md uppercase tracking-wider">Busy (${rider.activeOrders?.length})</span>}
                    </div>
                    <span className={`flex h-2 w-2 rounded-full mt-1.5 ${rider.isOnline ? (isBusy ? 'bg-blue-500' : 'bg-green-500') : 'bg-gray-300'}`}>
                      {rider.isOnline && <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full ${isBusy ? 'bg-blue-400' : 'bg-green-400'} opacity-75`}></span>}
                    </span>
                  </div>
                  <div className="flex items-center text-[10px] text-gray-500 font-bold tracking-wide">
                    <Navigation size={10} className="mr-1.5 text-gray-400" />
                    {rider.vehicleNumber}
                  </div>
                  <div className="flex items-center text-[10px] text-gray-500 font-bold tracking-wide mt-1">
                    <Phone size={10} className="mr-1.5 text-gray-400" />
                    {rider.phoneNumber}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
