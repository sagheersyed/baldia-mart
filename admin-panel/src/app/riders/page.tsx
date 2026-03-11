import React from 'react';

export default function RidersPage() {
  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Delivery Riders</h1>
          <p className="text-gray-500 mt-1">Manage delivery fleet</p>
        </div>
        <div>
          <button className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition">
            Register Rider
          </button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="pb-3 font-medium">Rider ID</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Phone</th>
                <th className="pb-3 font-medium">Vehicle</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-4 font-medium text-gray-800">RDR-{450 + i}</td>
                  <td className="py-4 text-gray-800 font-medium">Zain Ali {i}</td>
                  <td className="py-4 text-gray-500">+92 300 123456{i}</td>
                  <td className="py-4 text-gray-500">Honda CD70</td>
                  <td className="py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${i===1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {i===1 ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="py-4 font-medium text-gray-800">${(i * 125.50).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
