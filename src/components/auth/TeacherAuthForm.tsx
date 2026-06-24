"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TeacherAuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdminSignup, setIsAdminSignup] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/teacher/login" : "/api/teacher/signup";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, name, adminCode: isAdminSignup ? adminCode : undefined };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "처리 중 오류가 발생했습니다.");
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
    <div className="space-y-3">
      <div className="flex gap-4 border-b border-zinc-200 text-sm">
        <button
          type="button"
          className={`-mb-px border-b-2 px-1 py-2 font-semibold ${
            mode === "login" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
          }`}
          onClick={() => setMode("login")}
        >
          로그인
        </button>
        <button
          type="button"
          className={`-mb-px border-b-2 px-1 py-2 font-semibold ${
            mode === "signup" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"
          }`}
          onClick={() => setMode("signup")}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 pt-1">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
          />
        )}
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "signup" ? 8 : undefined}
          className={inputClass}
        />
        {mode === "signup" && (
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={isAdminSignup}
                onChange={(e) => setIsAdminSignup(e.target.checked)}
              />
              관리자 계정으로 가입 (학교 담당자 1명만)
            </label>
            {isAdminSignup && (
              <input
                type="password"
                placeholder="관리자 코드"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                required
                className={inputClass}
              />
            )}
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-md bg-[#0095F6] py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
        </button>
      </form>
    </div>
  );
}
