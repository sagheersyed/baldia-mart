import React from 'react';

export default function UsersPage() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Users</h1>
        <p className="text-gray-500 mt-1">Manage platform customers</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="pb-3 font-medium">User ID</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Joined</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-4 font-medium text-gray-800">USR-{100 + i}</td>
                  <td className="py-4 text-gray-800 font-medium">Ali Khan {i}</td>
                  <td className="py-4 text-gray-500">ali{i}@example.com</td>
                  <td className="py-4 text-gray-500">Oct {i}, 2023</td>
                  <td className="py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Active
                    </span>
                  </td>
                  <td className="py-4 text-blue-500 cursor-pointer hover:underline">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
