"use client";

import type { ArtworkListItem } from "@/types/client";

function ThumbnailFallback({ type }: { type: ArtworkListItem["type"] }) {
  const icon = { audio: "🎵", link: "🔗", video: "🎬", image: "🖼️" }[type];
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-4xl">
      {icon}
    </div>
  );
}

export function ArtworkCard({
  artwork,
  canLike,
  onOpen,
  onToggleLike,
}: {
  artwork: ArtworkListItem;
  canLike: boolean;
  onOpen: () => void;
  onToggleLike: () => void;
}) {
  return (
    <div
      className={`group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 transition hover:shadow-md ${
        artwork.is_winner ? "ring-2 ring-amber-400 shadow-amber-200" : ""
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative block aspect-square w-full overflow-hidden bg-zinc-100"
        onContextMenu={(e) => e.preventDefault()}
      >
        {artwork.is_winner && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white shadow">
            👑 수상작
          </span>
        )}
        {artwork.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artwork.thumbnail_url}
            alt={artwork.title}
            draggable={false}
            className={`h-full w-full object-cover select-none ${
              artwork.is_winner ? "animate-pulse" : ""
            }`}
          />
        ) : (
          <ThumbnailFallback type={artwork.type} />
        )}
      </button>
      <div className="p-3">
        <p className="truncate text-sm font-semibold">{artwork.title}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="truncate text-xs text-zinc-500">{artwork.students?.name ?? "익명"}</span>
          <button
            type="button"
            disabled={!canLike}
            onClick={onToggleLike}
            className={`flex items-center gap-1 text-xs font-medium ${
              artwork.liked_by_me ? "text-rose-500" : "text-zinc-400"
            } ${canLike ? "cursor-pointer" : "cursor-default"}`}
          >
            {artwork.liked_by_me ? "♥" : "♡"} {artwork.like_count}
          </button>
        </div>
      </div>
    </div>
  );
}
