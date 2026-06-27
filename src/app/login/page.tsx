"use client";

import { useState } from "react";
import { TeacherAuthForm } from "@/components/auth/TeacherAuthForm";
import { StudentLoginForm } from "@/components/auth/StudentLoginForm";
import { Footer } from "@/components/Footer";

export default function LoginPage() {
  const [role, setRole] = useState<"student" | "teacher">("student");

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-[350px]">
          <h1 className="mb-1 text-center font-serif text-4xl italic tracking-tight text-zinc-900">
            Toastar
          </h1>
          <p className="mb-8 text-center text-sm text-zinc-500">교내 전용 학생 작품 전시</p>

          {role === "student" ? <StudentLoginForm /> : <TeacherAuthForm />}

          <div className="mt-6 border-t border-zinc-200 pt-4 text-center text-sm">
            {role === "student" ? (
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className="font-medium text-[#0095F6]"
              >
                교사로 로그인 / 가입
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRole("student")}
                className="font-medium text-[#0095F6]"
              >
                학생으로 로그인
              </button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
