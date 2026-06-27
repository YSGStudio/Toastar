import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getHeartStatus } from "@/lib/heartStatus";
import { DashboardNav } from "@/components/DashboardNav";
import { BottomTabBar } from "@/components/BottomTabBar";
import { HeartProvider } from "@/components/HeartContext";
import { EthicsGuideGate } from "@/components/EthicsGuideGate";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const heartStatus = await getHeartStatus(user);

  return (
    <HeartProvider initial={heartStatus}>
      {user.role === "student" && <EthicsGuideGate />}
      <div className="flex flex-1 flex-col bg-white">
        <DashboardNav user={user} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 pb-20 sm:px-4 sm:py-6 sm:pb-6">
          {children}
        </main>
        <BottomTabBar user={user} />
      </div>
    </HeartProvider>
  );
}
