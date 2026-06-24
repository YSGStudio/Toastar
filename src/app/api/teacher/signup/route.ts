import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { email, password, name, adminCode } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "이메일, 비밀번호, 이름을 모두 입력해 주세요." }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  let role: "admin" | "teacher" = "teacher";
  if (adminCode) {
    if (!process.env.ADMIN_SETUP_CODE || adminCode !== process.env.ADMIN_SETUP_CODE) {
      return NextResponse.json({ error: "관리자 코드가 올바르지 않습니다." }, { status: 403 });
    }
    const { data: existingAdmin } = await admin
      .from("teachers")
      .select("id")
      .eq("role", "admin")
      .maybeSingle();
    if (existingAdmin) {
      return NextResponse.json({ error: "관리자 계정은 이미 존재합니다." }, { status: 409 });
    }
    role = "admin";
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "회원가입에 실패했습니다." },
      { status: 400 },
    );
  }

  const { error: insertError } = await admin
    .from("teachers")
    .insert({ id: created.user.id, email, name, role });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
