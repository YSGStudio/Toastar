"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

export function StudentBulkUpload({ classId }: { classId: string }) {
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsedNames = rows
        .map((row) => String(row["이름"] ?? row["name"] ?? Object.values(row)[1] ?? "").trim())
        .filter(Boolean);
      if (parsedNames.length === 0) {
        setError("엑셀에서 이름을 찾을 수 없습니다. '이름' 열이 있는지 확인해 주세요.");
        return;
      }
      setNames(parsedNames);
    } catch {
      setError("엑셀 파일을 읽지 못했습니다.");
    }
  }

  async function handleUpload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/students/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, names }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "등록에 실패했습니다.");
        return;
      }
      setResult(`${data.inserted}명 등록 완료 (요청 ${data.requested}명)`);
      setNames([]);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">학생 일괄 등록 (엑셀)</h2>
      <p className="text-xs text-zinc-500">
        첫 행은 머리글, &quot;이름&quot; 열에 학생 이름을 입력한 .xlsx 파일을 업로드하세요. 동명이인은 구분번호가 자동으로 부여됩니다.
      </p>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />

      {names.length > 0 && (
        <div className="rounded-md bg-zinc-50 p-3 text-sm">
          <p className="mb-1 font-medium">미리보기 ({names.length}명)</p>
          <ul className="max-h-32 space-y-0.5 overflow-y-auto text-zinc-600">
            {names.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && <p className="text-sm text-emerald-600">{result}</p>}

      <button
        type="button"
        onClick={handleUpload}
        disabled={names.length === 0 || loading}
        className="w-full rounded-md bg-[#0095F6] py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "등록 중..." : "등록하기"}
      </button>
    </div>
  );
}
