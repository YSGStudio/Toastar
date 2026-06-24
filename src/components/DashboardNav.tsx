import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import type { CurrentUser } from "@/lib/auth/session";

export function DashboardNav({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold">학생 작품 전시</span>
          <nav className="flex gap-1 text-sm">
            <Link href="/dashboard/latest" className="rounded-md px-3 py-1.5 font-medium hover:bg-zinc-100">
              최신 자료
            </Link>
            <Link href="/dashboard/archive" className="rounded-md px-3 py-1.5 font-medium hover:bg-zinc-100">
              지난 자료
            </Link>
            {user.role === "teacher" && (
              <Link href="/dashboard/settings" className="rounded-md px-3 py-1.5 font-medium hover:bg-zinc-100">
                환경설정
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {user.name}
            {user.role === "teacher" ? " 선생님" : " 학생"}
          </span>
          <LogoutButton role={user.role} />
        </div>
      </div>
    </header>
  );
}
