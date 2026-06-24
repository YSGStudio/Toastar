"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ role }: { role: "teacher" | "student" }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch(role === "teacher" ? "/api/teacher/logout" : "/api/student/logout", {
      method: "POST",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
    >
      로그아웃
    </button>
  );
}
