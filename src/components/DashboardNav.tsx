import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { HeartBadge } from "@/components/HeartBadge";
import { TotalHeartsBadge } from "@/components/TotalHeartsBadge";
import type { CurrentUser } from "@/lib/auth/session";

export function DashboardNav({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-[52px] max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard/latest" className="font-serif text-2xl italic text-zinc-900">
            Toastar
          </Link>
          <nav className="hidden gap-1 text-sm sm:flex">
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
            {user.role === "student" && (
              <Link href="/dashboard/my-artworks" className="rounded-md px-3 py-1.5 font-medium hover:bg-zinc-100">
                내 작품
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <TotalHeartsBadge />
          <HeartBadge />
          <span className="hidden text-sm text-zinc-500 sm:inline">
            {user.name}
            {user.role === "teacher" ? (user.accountRole === "admin" ? " 관리자" : " 선생님") : " 학생"}
          </span>
          <LogoutButton role={user.role} />
        </div>
      </div>
    </header>
  );
}
