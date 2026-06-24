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

  const inputClass =
    "w-full rounded-[4px] border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm placeholder-zinc-400 focus:border-zinc-400 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        placeholder="학급코드 (숫자 4자리)"
        value={classCode}
        onChange={(e) => setClassCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
        required
        className={inputClass}
      />
      <input
        type="text"
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className={inputClass}
      />
      {needsLoginNo && (
        <input
          type="number"
          placeholder="구분 번호"
          value={loginNo}
          onChange={(e) => setLoginNo(e.target.value)}
          required
          className={inputClass}
        />
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-md bg-[#0095F6] py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {loading ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
