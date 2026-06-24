"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, GridIcon, PlusSquareIcon, GearIcon } from "@/components/icons";
import type { CurrentUser } from "@/lib/auth/session";

export function BottomTabBar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard/latest", label: "최신 자료", Icon: HomeIcon },
    { href: "/dashboard/archive", label: "지난 자료", Icon: GridIcon },
    ...(user.role === "student"
      ? [{ href: "/dashboard/latest", label: "작품 올리기", Icon: PlusSquareIcon }]
      : []),
    ...(user.role === "teacher"
      ? [{ href: "/dashboard/settings", label: "환경설정", Icon: GearIcon }]
      : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-zinc-200 bg-white sm:hidden">
      {tabs.map((tab, i) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={`${tab.href}-${i}`}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
              active ? "text-zinc-900" : "text-zinc-400"
            }`}
          >
            <tab.Icon className="h-6 w-6" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
