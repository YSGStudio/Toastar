"use client";

import { useState } from "react";
import { ArtworkCard } from "@/components/ArtworkCard";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useHeart } from "@/components/HeartContext";
import { CloudDoodle } from "@/components/illustrations/Doodles";
import type { ArtworkListItem } from "@/types/client";

export function ArtworkGrid({
  initialArtworks,
  fetchUrl,
  canLike,
  currentStudentId,
  emptyMessage,
}: {
  initialArtworks: ArtworkListItem[];
  fetchUrl: string;
  canLike: boolean;
  currentStudentId?: string | null;
  emptyMessage: string;
}) {
  const [artworks, setArtworks] = useState(initialArtworks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [prevInitialArtworks, setPrevInitialArtworks] = useState(initialArtworks);
  const { decrementHeart, incrementHeart } = useHeart();

  if (initialArtworks !== prevInitialArtworks) {
    setPrevInitialArtworks(initialArtworks);
    setArtworks(initialArtworks);
  }

  // 한 번 준 하트는 취소할 수 없고, 같은 작품에는 한 번만 줄 수 있다.
  function canLikeArtwork(artwork: ArtworkListItem) {
    return canLike && artwork.student_id !== currentStudentId && !artwork.liked_by_me;
  }

  async function refresh() {
    const res = await fetch(fetchUrl, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setArtworks(data.artworks);
    }
  }

  async function giveHeart(artwork: ArtworkListItem) {
    if (!canLikeArtwork(artwork)) return;
    setLimitMessage(null);

    setArtworks((prev) =>
      prev.map((a) => (a.id === artwork.id ? { ...a, liked_by_me: true, like_count: a.like_count + 1 } : a)),
    );
    decrementHeart();

    const res = await fetch(`/api/artworks/${artwork.id}/like`, { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setArtworks((prev) =>
        prev.map((a) => (a.id === artwork.id ? { ...a, liked_by_me: false, like_count: a.like_count - 1 } : a)),
      );
      incrementHeart();
      if (data.code === "DAILY_LIMIT") {
        setLimitMessage("오늘 하트를 모두 사용했어요");
      }
    }
  }

  async function handleDelete(artwork: ArtworkListItem) {
    if (!confirm(`"${artwork.title}" 작품을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeletingId(artwork.id);
    try {
      const res = await fetch(`/api/artworks/${artwork.id}`, { method: "DELETE" });
      if (res.ok) {
        setArtworks((prev) => prev.filter((a) => a.id !== artwork.id));
        setSelectedId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "삭제에 실패했습니다.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  const selected = artworks.find((a) => a.id === selectedId) ?? null;

  return (
    <PullToRefresh onRefresh={refresh}>
      {limitMessage && (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-700">
          {limitMessage}
        </div>
      )}
      {artworks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <CloudDoodle className="h-20 w-24 text-violet-200" />
          <p className="text-center text-sm text-zinc-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
          {artworks.map((artwork) => (
            <ArtworkCard
              key={artwork.id}
              artwork={artwork}
              canLike={canLikeArtwork(artwork)}
              onOpen={() => setSelectedId(artwork.id)}
              onToggleLike={() => giveHeart(artwork)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ArtworkDetailModal
          artwork={selected}
          canLike={canLikeArtwork(selected)}
          onClose={() => setSelectedId(null)}
          onToggleLike={() => giveHeart(selected)}
          onDelete={() => handleDelete(selected)}
          deleting={deletingId === selected.id}
        />
      )}
    </PullToRefresh>
  );
}
