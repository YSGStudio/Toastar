"use client";

import { createContext, useContext, useState } from "react";

interface HeartState {
  limit: number;
  remaining: number;
}

interface HeartContextValue {
  heart: HeartState | null;
  decrementHeart: () => void;
  incrementHeart: () => void;
}

const HeartContext = createContext<HeartContextValue>({
  heart: null,
  decrementHeart: () => {},
  incrementHeart: () => {},
});

export function HeartProvider({
  initial,
  children,
}: {
  initial: HeartState | null;
  children: React.ReactNode;
}) {
  const [heart, setHeart] = useState(initial);

  function decrementHeart() {
    setHeart((prev) => (prev ? { ...prev, remaining: Math.max(prev.remaining - 1, 0) } : prev));
  }

  function incrementHeart() {
    setHeart((prev) => (prev ? { ...prev, remaining: Math.min(prev.remaining + 1, prev.limit) } : prev));
  }

  return (
    <HeartContext.Provider value={{ heart, decrementHeart, incrementHeart }}>
      {children}
    </HeartContext.Provider>
  );
}

export function useHeart() {
  return useContext(HeartContext);
}
