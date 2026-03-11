import React from 'react';
import { Plus } from 'lucide-react';

export default function ZonesPage() {
  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Delivery Zones</h1>
          <p className="text-gray-500 mt-1">Configure geofencing and 50km raduis rules</p>
        </div>
        <div>
          <button className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition">
            <Plus size={20} />
            <span>Create Zone</span>
          </button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Active Zones</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="pb-3 font-medium">Zone Name</th>
                <th className="pb-3 font-medium">Center Lat</th>
                <th className="pb-3 font-medium">Center Lng</th>
                <th className="pb-3 font-medium">Radius (km)</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="py-4 font-medium text-gray-800">Baldia Town Region</td>
                <td className="py-4 text-gray-500">24.9351</td>
                <td className="py-4 text-gray-500">66.9715</td>
                <td className="py-4 font-medium text-primary">50.00 km</td>
                <td className="py-4">
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Active
                  </span>
                </td>
                <td className="py-4 text-blue-500 cursor-pointer hover:underline">Edit Map</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-blue-800">
        <h3 className="font-bold flex items-center space-x-2">
          <span>ℹ️ Hyperlocal Strict Mode Enabled</span>
        </h3>
        <p className="mt-2 opacity-90 text-sm">
          Any order placed beyond the configured radius (e.g. 50km from Baldia Town) will automatically be rejected by the backend.
        </p>
      </div>
    </div>
  );
}
