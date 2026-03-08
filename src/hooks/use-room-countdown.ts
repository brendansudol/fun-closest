"use client";

import { useEffect, useState } from "react";

export function useRoomCountdown(locksAt?: string | null, serverNow?: string | null) {
  const [clock, setClock] = useState<{ clientMs: number; offsetMs: number } | null>(null);

  useEffect(() => {
    if (!locksAt || !serverNow) {
      return;
    }

    const syncClock = () => {
      const clientMs = Date.now();

      setClock((current) => ({
        clientMs,
        offsetMs: current?.offsetMs ?? new Date(serverNow).getTime() - clientMs,
      }));
    };

    const timeout = window.setTimeout(syncClock, 0);

    const interval = window.setInterval(() => {
      syncClock();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [locksAt, serverNow]);

  if (!locksAt || !serverNow) {
    return null;
  }

  if (!clock) {
    return null;
  }

  const msRemaining = new Date(locksAt).getTime() - (clock.clientMs + clock.offsetMs);
  return Math.max(0, Math.ceil(msRemaining / 1_000));
}
