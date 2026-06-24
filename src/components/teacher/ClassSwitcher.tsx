"use client";

import { useRouter } from "next/navigation";
import type { ClassRow } from "@/types/database";

export function ClassSwitcher({ classes, selectedId }: { classes: ClassRow[]; selectedId: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedId}
        onChange={(e) => router.push(`/dashboard/settings?classId=${e.target.value}`)}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.class_code})
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => router.push("/dashboard/classes/new")}
        className="rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500"
      >
        + 새 학급
      </button>
    </div>
  );
}
