"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StudentLoginForm() {
  const router = useRouter();
  const [classCode, setClassCode] = useState("");
  const [name, setName] = useState("");
  const [loginNo, setLoginNo] = useState("");
  const [needsLoginNo, setNeedsLoginNo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classCode, name, loginNo: loginNo || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        if (data.needsLoginNo) setNeedsLoginNo(true);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder="학급코드"
        value={classCode}
        onChange={(e) => setClassCode(e.target.value)}
        required
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase"
      />
      <input
        type="text"
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />
      {needsLoginNo && (
        <input
          type="number"
          placeholder="구분 번호"
          value={loginNo}
          onChange={(e) => setLoginNo(e.target.value)}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "확인 중..." : "학생 로그인"}
      </button>
    </form>
  );
}
