"use client";

import React, { createContext, useContext, useState } from 'react';

type Status = 'connected' | 'connecting' | 'disconnected';

const SSEContext = createContext<{ status: Status; setStatus: (s: Status) => void } | undefined>(undefined);

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('connecting');
  return (
    <SSEContext.Provider value={{ status, setStatus }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSEStatus() {
  const ctx = useContext(SSEContext);
  if (!ctx) throw new Error('useSSEStatus must be used within SSEProvider');
  return ctx;
}

export default SSEContext;
