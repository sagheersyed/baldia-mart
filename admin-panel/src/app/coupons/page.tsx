import React from 'react';
import { Plus } from 'lucide-react';

export default function CouponsPage() {
  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Discounts & Coupons</h1>
          <p className="text-gray-500 mt-1">Manage promotional codes</p>
        </div>
        <div>
          <button className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition">
            <Plus size={20} />
            <span>Create Coupon</span>
          </button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="pb-3 font-medium">Code</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Value</th>
                <th className="pb-3 font-medium">Min Order</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {['Baldia10', 'Baldia50', 'BaldiaFree'].map((code, i) => (
                <tr key={code} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-4 font-bold text-gray-800">{code}</td>
                  <td className="py-4 text-gray-600">{i===2 ? 'Fixed Amount' : 'Percentage'}</td>
                  <td className="py-4 font-medium text-gray-800">{i===2 ? '$5.00' : '10%'}</td>
                  <td className="py-4 text-gray-500">$20.00</td>
                  <td className="py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Active
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
