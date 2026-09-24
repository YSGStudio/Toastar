"use client";

import { createContext, useContext, useState } from "react";

interface HeartState {
  limit: number;
  /** 학급마다 남은 하트. 키가 없는 학급은 아직 한 개도 쓰지 않았다는 뜻이다(= limit). */
  remainingByClass: Record<string, number>;
  /** 투표가 끝난 기간에 내 작품이 받은 하트 누적. 작품을 올리지 않는 교사는 null이다. */
  totalReceived: number | null;
}

interface HeartContextValue {
  heart: HeartState | null;
  /** 지금 열려 있는 학급 탭. 상단 하트 배지를 이 학급 기준으로 보여 준다. */
  selectedClassId: string | null;
  setSelectedClassId: (classId: string | null) => void;
  /** 그 학급에 남은 하트. 아직 안 쓴 학급은 한도 그대로다. */
  remainingFor: (classId: string | null) => number | null;
  decrementHeart: (classId: string) => void;
  incrementHeart: (classId: string) => void;
  syncHeart: (next: { limit: number; remainingByClass: Record<string, number> }) => void;
}

const HeartContext = createContext<HeartContextValue>({
  heart: null,
  selectedClassId: null,
  setSelectedClassId: () => {},
  remainingFor: () => null,
  decrementHeart: () => {},
  incrementHeart: () => {},
  syncHeart: () => {},
});

function serverKey(value: HeartState | null) {
  return value
    ? `${value.limit}/${value.totalReceived}/${JSON.stringify(value.remainingByClass)}`
    : "none";
}

export function HeartProvider({
  initial,
  defaultClassId,
  children,
}: {
  initial: HeartState | null;
  /** 학생은 자기 학급 탭이 먼저 열린다. */
  defaultClassId?: string | null;
  children: React.ReactNode;
}) {
  const [heart, setHeart] = useState(initial);
  const [prevServerKey, setPrevServerKey] = useState(serverKey(initial));
  const [selectedClassId, setSelectedClassId] = useState<string | null>(defaultClassId ?? null);

  // 서버가 새로 계산한 하트 현황이 내려오면(새로고침·재방문) 그 값을 정답으로 삼는다.
  // 값이 같을 때는 덮어쓰지 않아, 방금 준 하트의 낙관적 반영이 지워지지 않는다.
  const nextKey = serverKey(initial);
  if (nextKey !== prevServerKey) {
    setPrevServerKey(nextKey);
    setHeart(initial);
  }

  function remainingFor(classId: string | null) {
    if (!heart || !classId) return null;
    return heart.remainingByClass[classId] ?? heart.limit;
  }

  function shift(classId: string, delta: number) {
    setHeart((prev) => {
      if (!prev) return prev;
      const current = prev.remainingByClass[classId] ?? prev.limit;
      const next = Math.min(Math.max(current + delta, 0), prev.limit);
      return { ...prev, remainingByClass: { ...prev.remainingByClass, [classId]: next } };
    });
  }

  /** 서버가 알려준 실제 잔량으로 맞춘다(낙관적 계산의 어긋남을 바로잡는 용도). */
  function syncHeart(next: { limit: number; remainingByClass: Record<string, number> }) {
    setHeart((prev) => (prev ? { ...prev, ...next } : prev));
  }

  return (
    <HeartContext.Provider
      value={{
        heart,
        selectedClassId,
        setSelectedClassId,
        remainingFor,
        decrementHeart: (classId) => shift(classId, -1),
        incrementHeart: (classId) => shift(classId, 1),
        syncHeart,
      }}
    >
      {children}
    </HeartContext.Provider>
  );
}

export function useHeart() {
  return useContext(HeartContext);
}
