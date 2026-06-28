"use client";

import { useState } from "react";
import { StudentBulkUpload } from "@/components/teacher/StudentBulkUpload";
import type { Student } from "@/types/database";

export function StudentManager({ classId, initialStudents }: { classId: string; initialStudents: Student[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [prevInitialStudents, setPrevInitialStudents] = useState(initialStudents);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (initialStudents !== prevInitialStudents) {
    setPrevInitialStudents(initialStudents);
    setStudents(initialStudents);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "학생 추가에 실패했습니다.");
        return;
      }
      setStudents((prev) => [...prev, data.student].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 학생을 삭제할까요? 게시한 작품도 함께 삭제됩니다.")) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (res.ok) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold">학생 개별 추가</h2>
        <p className="text-xs text-zinc-500">동명이인이 있으면 구분번호가 자동으로 부여됩니다.</p>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-md bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            추가
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {students.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-1.5">
              <span>
                {s.name}
                {s.login_no !== null ? ` (구분번호 ${s.login_no})` : ""}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                className="text-xs font-medium text-red-500 hover:underline"
              >
                삭제
              </button>
            </li>
          ))}
          {students.length === 0 && <li className="text-zinc-400">등록된 학생이 없습니다.</li>}
        </ul>
      </div>

      <StudentBulkUpload classId={classId} />
    </div>
  );
}
