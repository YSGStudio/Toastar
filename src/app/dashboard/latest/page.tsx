import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchArtworkList } from "@/lib/artworks";
import { fetchCurrentPeriod, fetchOngoingPeriods } from "@/lib/periods";
import { getHeartStatus } from "@/lib/heartStatus";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { PhaseNotice } from "@/components/PhaseNotice";
import { UploadSection } from "@/components/UploadSection";

export default async function LatestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isStudent = user.role === "student";

  // 학생 화면은 지금이 게시 단계인지 투표 단계인지에 따라 올리기·하트가 갈린다.
  // 교사는 담당(관리자는 전체) 학급의 진행 중인 기간을 모두 본다.
  // (레이아웃도 같은 조회를 쓰지만 cache()로 묶여 있어 한 번만 실행된다)
  const [artworks, period, ongoingPeriods, heart] = await Promise.all([
    fetchArtworkList(user, { scope: "latest" }),
    isStudent ? fetchCurrentPeriod(user, user.classId) : Promise.resolve(null),
    isStudent ? Promise.resolve([]) : fetchOngoingPeriods(user),
    getHeartStatus(user),
  ]);

  const phase = period?.phase ?? null;
  const alreadyPosted = isStudent && artworks.some((a) => a.student_id === user.studentId);

  // 교사는 학급 구분 없이 투표하므로, 투표 단계인 기간이 하나라도 있으면 하트를 줄 수 있다.
  const canLike = isStudent
    ? phase === "voting"
    : ongoingPeriods.some((p) => p.phase === "voting");

  return (
    <div className="space-y-6">
      {isStudent ? (
        period && (
          <PhaseNotice
            phase={period.phase}
            startDate={period.start_date}
            endDate={period.end_date}
            viewerRole="student"
            heartLimit={heart?.limit ?? 0}
          />
        )
      ) : (
        ongoingPeriods.length > 0 && (
          <div className="space-y-2">
            {ongoingPeriods.map((p) => (
              <PhaseNotice
                key={p.id}
                phase={p.phase}
                startDate={p.start_date}
                endDate={p.end_date}
                viewerRole="teacher"
                classLabel={p.class_name}
                heartLimit={heart?.limit ?? 0}
              />
            ))}
          </div>
        )
      )}
      {isStudent && <UploadSection phase={phase} alreadyPosted={alreadyPosted} />}
      <ArtworkGrid
        initialArtworks={artworks}
        fetchUrl="/api/artworks?scope=latest"
        canLike={canLike}
        currentStudentId={isStudent ? user.studentId : null}
        emptyMessage="아직 게시된 작품이 없어요."
        // 학생 화면에서는 새 작품과 하트 수를 15초마다 자동으로 받아온다.
        pollIntervalMs={isStudent ? 15_000 : undefined}
      />
    </div>
  );
}
