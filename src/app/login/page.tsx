"use client";

import { useState } from "react";
import { TeacherAuthForm } from "@/components/auth/TeacherAuthForm";
import { StudentLoginForm } from "@/components/auth/StudentLoginForm";

export default function LoginPage() {
  const [role, setRole] = useState<"student" | "teacher">("student");

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-center text-xl font-bold">학생 작품 전시</h1>
        <p className="mb-6 text-center text-sm text-zinc-500">교내 전용 SNS</p>

        <div className="mb-6 flex gap-2 rounded-full bg-zinc-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 rounded-full py-2 font-medium transition ${
              role === "student" ? "bg-white shadow text-emerald-700" : "text-zinc-500"
            }`}
          >
            학생
          </button>
          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`flex-1 rounded-full py-2 font-medium transition ${
              role === "teacher" ? "bg-white shadow text-indigo-700" : "text-zinc-500"
            }`}
          >
            교사
          </button>
        </div>

        {role === "student" ? <StudentLoginForm /> : <TeacherAuthForm />}
      </div>
    </div>
  );
}
