import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isWithinBlockWindow, resolveDayType } from "@/lib/loginBlock";
import { mintStudentJwt, setStudentSessionCookie } from "@/lib/auth/studentSession";

const TIME_ZONE = process.env.SCHOOL_TIMEZONE || "Asia/Seoul";

export async function POST(req: NextRequest) {
  const { classCode, name, loginNo } = await req.json();
  if (!classCode || !name) {
    return NextResponse.json({ error: "학급코드와 이름을 입력해 주세요." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: classRow } = await admin
    .from("classes")
    .select("id")
    .eq("class_code", String(classCode).trim().toUpperCase())
    .maybeSingle();

  if (!classRow) {
    return NextResponse.json({ error: "학급코드를 확인해 주세요." }, { status: 404 });
  }

  const now = new Date();
  const dayType = resolveDayType(now, TIME_ZONE);
  const { data: rule } = await admin
    .from("login_block_rules")
    .select("enabled, start_time, end_time")
    .eq("class_id", classRow.id)
    .eq("day_type", dayType)
    .maybeSingle();

  if (isWithinBlockWindow(rule, now, TIME_ZONE)) {
    return NextResponse.json({ error: "로그인이 불가능합니다." }, { status: 403 });
  }

  let studentQuery = admin
    .from("students")
    .select("id, name, login_no, class_id")
    .eq("class_id", classRow.id)
    .eq("name", String(name).trim());

  if (loginNo !== undefined && loginNo !== null && loginNo !== "") {
    studentQuery = studentQuery.eq("login_no", Number(loginNo));
  }

  const { data: matches } = await studentQuery;

  if (!matches || matches.length === 0) {
    return NextResponse.json({ error: "일치하는 학생 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (matches.length > 1) {
    return NextResponse.json(
      {
        error: "동명이인이 있습니다. 구분 번호를 함께 입력해 주세요.",
        needsLoginNo: true,
        options: matches.map((m) => m.login_no),
      },
      { status: 409 },
    );
  }

  const student = matches[0];
  const jwt = await mintStudentJwt({
    studentId: student.id,
    classId: student.class_id,
    name: student.name,
  });
  await setStudentSessionCookie(jwt);

  return NextResponse.json({ ok: true, name: student.name });
}
