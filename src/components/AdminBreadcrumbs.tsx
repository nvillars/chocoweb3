"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

function prettySegment(s: string) {
  if (!s) return 'Dashboard';
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminBreadcrumbs() {
  const pathname = usePathname() || '/admin/dashboard';
  const parts = pathname.replace(/^\//, '').split('/');
  // if admin path, drop the first segment
  const crumbs = parts[0] === 'admin' ? parts.slice(1) : parts;

  const title = crumbs.length === 0 || !crumbs[0] ? 'Dashboard' : prettySegment(crumbs[0]);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
          {crumbs.length === 0 || !crumbs[0] ? (
            <span>Admin / Dashboard</span>
          ) : (
            <span>Admin / {prettySegment(crumbs[0])}</span>
          )}
        </nav>
      </div>
    </div>
  );
}
