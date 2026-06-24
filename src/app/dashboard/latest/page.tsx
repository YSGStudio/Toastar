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
        emptyMessage="아직 게시된 작품이 없어요."
      />
    </div>
  );
}
