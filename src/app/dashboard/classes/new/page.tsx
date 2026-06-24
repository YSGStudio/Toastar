import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CreateClassForm } from "@/components/teacher/CreateClassForm";

export default async function NewClassPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") redirect("/login");

  return (
    <div className="mx-auto max-w-md">
      <CreateClassForm />
    </div>
  );
}
