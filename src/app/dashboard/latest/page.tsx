import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchArtworkList } from "@/lib/artworks";
import { fetchCurrentPeriod } from "@/lib/periods";
import { getHeartStatus } from "@/lib/heartStatus";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { PhaseNotice } from "@/components/PhaseNotice";
import { UploadSection } from "@/components/UploadSection";

export default async function LatestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isStudent = user.role === "student";

  // 학생 화면은 지금이 게시 단계인지 투표 단계인지에 따라 올리기·하트가 갈린다.
  // (레이아웃도 같은 조회를 쓰지만 cache()로 묶여 있어 한 번만 실행된다)
  const [artworks, period, heart] = await Promise.all([
    fetchArtworkList(user, { scope: "latest" }),
    isStudent ? fetchCurrentPeriod(user, user.classId) : Promise.resolve(null),
    isStudent ? getHeartStatus(user) : Promise.resolve(null),
  ]);

  const phase = period?.phase ?? null;
  const alreadyPosted = isStudent && artworks.some((a) => a.student_id === user.studentId);

  return (
    <div className="space-y-6">
      {isStudent && phase && <PhaseNotice phase={phase} heartLimit={heart?.limit ?? 0} />}
      {isStudent && <UploadSection phase={phase} alreadyPosted={alreadyPosted} />}
      <ArtworkGrid
        initialArtworks={artworks}
        fetchUrl="/api/artworks?scope=latest"
        canLike={isStudent && phase === "voting"}
        currentStudentId={isStudent ? user.studentId : null}
        emptyMessage="아직 게시된 작품이 없어요."
        // 학생 화면에서는 새 작품과 하트 수를 15초마다 자동으로 받아온다.
        pollIntervalMs={isStudent ? 15_000 : undefined}
      />
    </div>
  );
}
