import React from 'react';

export default function OrdersPage() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
        <p className="text-gray-500 mt-1">View and manage customer orders</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex space-x-4 mb-6">
           <button className="px-4 py-2 bg-primary text-white font-medium rounded-lg">All Orders</button>
           <button className="px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200">Pending</button>
           <button className="px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200">Processing</button>
           <button className="px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200">Out for Delivery</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="pb-3 font-medium">Order ID</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Zone</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Rider</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-4 font-medium text-gray-800">#ORD-{9000 + i}</td>
                  <td className="py-4 text-gray-600">Customer {i}</td>
                  <td className="py-4 text-gray-500">Baldia Town</td>
                  <td className="py-4 font-medium text-gray-800">${(i * 12.5).toFixed(2)}</td>
                  <td className="py-4">
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                      Pending
                    </span>
                  </td>
                  <td className="py-4 text-gray-400 italic">Unassigned</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
