"use client";

import React, { useEffect, useState } from 'react';

type User = { _id: string; name: string; email: string; role: string };

export default function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    let mounted = true;
    fetch('/api/users')
      .then(r => r.json())
      .then((data) => { if (mounted) setUsers(data || []); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#4E260E]">Usuarios</h2>
        <p className="text-sm text-gray-500">Lista de usuarios registrados</p>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-sm p-4">
        <table className="w-full text-left">
          <thead>
            <tr className="text-sm text-gray-600">
              <th className="pl-2">Nombre</th>
              <th>Email</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-t">
                <td className="py-3">{u.name}</td>
                <td>{u.email}</td>
                <td><span className="px-2 py-1 rounded bg-gray-100 text-sm text-gray-700">{u.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
