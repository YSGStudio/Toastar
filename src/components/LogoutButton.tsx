"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton({ role }: { role: "teacher" | "student" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch(role === "teacher" ? "/api/teacher/logout" : "/api/student/logout", {
        method: "POST",
      });
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
    >
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
