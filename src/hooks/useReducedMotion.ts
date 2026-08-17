'use client';

import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMatches(query.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return matches;
}
