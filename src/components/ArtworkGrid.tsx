"use client";

import { useState } from "react";
import { ArtworkCard } from "@/components/ArtworkCard";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import { PullToRefresh } from "@/components/PullToRefresh";
import type { ArtworkListItem } from "@/types/client";

export function ArtworkGrid({
  initialArtworks,
  fetchUrl,
  canLike,
  emptyMessage,
}: {
  initialArtworks: ArtworkListItem[];
  fetchUrl: string;
  canLike: boolean;
  emptyMessage: string;
}) {
  const [artworks, setArtworks] = useState(initialArtworks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [prevInitialArtworks, setPrevInitialArtworks] = useState(initialArtworks);

  if (initialArtworks !== prevInitialArtworks) {
    setPrevInitialArtworks(initialArtworks);
    setArtworks(initialArtworks);
  }

  async function refresh() {
    const res = await fetch(fetchUrl, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setArtworks(data.artworks);
    }
  }

  async function toggleLike(artwork: ArtworkListItem) {
    if (!canLike) return;
    setLimitMessage(null);

    const liked = artwork.liked_by_me;
    setArtworks((prev) =>
      prev.map((a) =>
        a.id === artwork.id
          ? { ...a, liked_by_me: !liked, like_count: a.like_count + (liked ? -1 : 1) }
          : a,
      ),
    );

    const res = await fetch(`/api/artworks/${artwork.id}/like`, {
      method: liked ? "DELETE" : "POST",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setArtworks((prev) =>
        prev.map((a) =>
          a.id === artwork.id
            ? { ...a, liked_by_me: liked, like_count: a.like_count + (liked ? 1 : -1) }
            : a,
        ),
      );
      if (data.code === "DAILY_LIMIT") {
        setLimitMessage("오늘 하트를 모두 사용했어요");
      }
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
        <p className="py-20 text-center text-sm text-zinc-400">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {artworks.map((artwork) => (
            <ArtworkCard
              key={artwork.id}
              artwork={artwork}
              canLike={canLike}
              onOpen={() => setSelectedId(artwork.id)}
              onToggleLike={() => toggleLike(artwork)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ArtworkDetailModal
          artwork={selected}
          canLike={canLike}
          onClose={() => setSelectedId(null)}
          onToggleLike={() => toggleLike(selected)}
        />
      )}
    </PullToRefresh>
  );
}
