"use client";

import { useEffect, useState } from 'react';

export default function useOrderCount() {
  const [count, setCount] = useState<number>(0);
  useEffect(() => {
    let mounted = true;
    fetch('/api/orders')
      .then(r => r.json())
      .then((data) => { if (!mounted) setCount(0); else setCount(Array.isArray(data) ? data.length : 0); })
      .catch(() => { if (mounted) setCount(0); });
    return () => { mounted = false; };
  }, []);
  return count;
}
