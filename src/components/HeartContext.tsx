"use client";

import { createContext, useContext, useState } from "react";

interface HeartState {
  limit: number;
  remaining: number;
  /** 내가 올린 작품이 받은 하트 누적. 작품을 올리지 않는 교사는 null이다. */
  totalReceived: number | null;
}

interface HeartContextValue {
  heart: HeartState | null;
  decrementHeart: () => void;
  incrementHeart: () => void;
  syncHeart: (next: { limit: number; remaining: number }) => void;
}

const HeartContext = createContext<HeartContextValue>({
  heart: null,
  decrementHeart: () => {},
  incrementHeart: () => {},
  syncHeart: () => {},
});

function serverKey(value: HeartState | null) {
  return value ? `${value.limit}/${value.remaining}/${value.totalReceived}` : "none";
}

export function HeartProvider({
  initial,
  children,
}: {
  initial: HeartState | null;
  children: React.ReactNode;
}) {
  const [heart, setHeart] = useState(initial);
  const [prevServerKey, setPrevServerKey] = useState(serverKey(initial));

  // 서버가 새로 계산한 하트 현황이 내려오면(새로고침·재방문) 그 값을 정답으로 삼는다.
  // 값이 같을 때는 덮어쓰지 않아, 방금 준 하트의 낙관적 반영이 지워지지 않는다.
  const nextKey = serverKey(initial);
  if (nextKey !== prevServerKey) {
    setPrevServerKey(nextKey);
    setHeart(initial);
  }

  function decrementHeart() {
    setHeart((prev) => (prev ? { ...prev, remaining: Math.max(prev.remaining - 1, 0) } : prev));
  }

  function incrementHeart() {
    setHeart((prev) => (prev ? { ...prev, remaining: Math.min(prev.remaining + 1, prev.limit) } : prev));
  }

  /** 서버가 알려준 실제 잔량으로 맞춘다(낙관적 계산의 어긋남을 바로잡는 용도). */
  function syncHeart(next: { limit: number; remaining: number }) {
    setHeart((prev) => (prev ? { ...prev, ...next } : prev));
  }

  return (
    <HeartContext.Provider value={{ heart, decrementHeart, incrementHeart, syncHeart }}>
      {children}
    </HeartContext.Provider>
  );
}

export function useHeart() {
  return useContext(HeartContext);
}
