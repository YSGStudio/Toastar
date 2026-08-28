import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchArtworkList } from "@/lib/artworks";
import { ArtworkGrid } from "@/components/ArtworkGrid";
import { UploadSection } from "@/components/UploadSection";

export default async function LatestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const artworks = await fetchArtworkList(user, { scope: "latest" });
  const alreadyPosted =
    user.role === "student" && artworks.some((a) => a.student_id === user.studentId);

  return (
    <div className="space-y-6">
      {user.role === "student" && <UploadSection alreadyPosted={alreadyPosted} />}
      <ArtworkGrid
        initialArtworks={artworks}
        fetchUrl="/api/artworks?scope=latest"
        canLike={user.role === "student"}
        currentStudentId={user.role === "student" ? user.studentId : null}
        emptyMessage="아직 게시된 작품이 없어요."
        // 학생 화면에서는 새 작품과 하트 수를 15초마다 자동으로 받아온다.
        pollIntervalMs={user.role === "student" ? 15_000 : undefined}
      />
    </div>
  );
}
