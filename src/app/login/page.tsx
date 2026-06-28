"use client";

import { useState } from "react";
import { TeacherAuthForm } from "@/components/auth/TeacherAuthForm";
import { StudentLoginForm } from "@/components/auth/StudentLoginForm";
import { Footer } from "@/components/Footer";
import { BunnyDoodle, CatDoodle, CloudDoodle, StarDoodle } from "@/components/illustrations/Doodles";

export default function LoginPage() {
  const [role, setRole] = useState<"student" | "teacher">("student");

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        <BunnyDoodle className="absolute left-6 top-10 hidden h-20 w-20 text-violet-200 sm:block" />
        <CatDoodle className="absolute right-8 top-16 hidden h-16 w-16 text-orange-200 sm:block" />
        <CloudDoodle className="absolute bottom-16 left-12 hidden h-16 w-20 text-sky-200 md:block" />
        <StarDoodle className="absolute bottom-12 right-12 hidden h-14 w-14 text-pink-200 md:block" />

        <div className="relative z-10 w-full max-w-[350px]">
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
                className="font-medium text-[#6C5CE7]"
              >
                교사로 로그인 / 가입
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRole("student")}
                className="font-medium text-[#6C5CE7]"
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
