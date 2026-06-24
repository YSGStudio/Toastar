"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateClassForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "학급 생성에 실패했습니다.");
        return;
      }
      setClassCode(data.class.class_code);
    } finally {
      setLoading(false);
    }
  }

  if (classCode) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-zinc-500">학급코드가 발급되었습니다</p>
        <p className="mt-2 text-3xl font-bold tracking-widest text-[#0095F6]">{classCode}</p>
        <p className="mt-2 text-sm text-zinc-500">학생들에게 이 코드와 이름으로 로그인하도록 안내해 주세요.</p>
        <p className="mt-1 text-xs text-zinc-400">
          관리자가 환경설정 &gt; 기간 관리에서 운영 기간을 시작해야 학생이 작품을 올릴 수 있어요.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/latest")}
          className="mt-6 w-full rounded-md bg-[#0095F6] py-2 text-sm font-medium text-white"
        >
          시작하기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">학급 만들기</h2>
      <input
        type="text"
        placeholder="학급 이름 (예: 3학년 2반)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[#0095F6] py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "생성 중..." : "학급 생성"}
      </button>
    </form>
  );
}
