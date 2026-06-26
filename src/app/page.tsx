import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "teacher" && user.accountRole !== "admin") {
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.id);
    if (!count) redirect("/dashboard/classes/new");
  }

  redirect("/dashboard/latest");
}
