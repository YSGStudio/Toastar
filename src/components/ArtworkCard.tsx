"use client";

import { HeartIcon } from "@/components/icons";
import type { ArtworkListItem } from "@/types/client";

function ThumbnailFallback({ type }: { type: ArtworkListItem["type"] }) {
  const icon = { audio: "🎵", link: "🔗", video: "🎬", image: "🖼️" }[type];
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-300 text-3xl">
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
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={`cursor-pointer overflow-hidden rounded-md bg-zinc-200 ${
        artwork.is_winner ? "ring-2 ring-amber-400" : ""
      }`}
    >
      <div
        className="relative aspect-square w-full overflow-hidden bg-zinc-300"
        onContextMenu={(e) => e.preventDefault()}
      >
        {artwork.is_winner && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
            👑
          </span>
        )}
        {artwork.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artwork.thumbnail_url}
            alt={artwork.title}
            draggable={false}
            className="h-full w-full select-none object-cover"
          />
        ) : (
          <ThumbnailFallback type={artwork.type} />
        )}
      </div>
      <div className="px-1.5 py-1.5">
        <p className="truncate text-xs font-semibold text-zinc-900">{artwork.title}</p>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="truncate text-[11px] text-zinc-600">{artwork.students?.name ?? "익명"}</span>
          <button
            type="button"
            disabled={!canLike}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            className={`flex shrink-0 items-center gap-0.5 text-[11px] font-medium ${
              artwork.liked_by_me ? "text-[#ED4956]" : "text-zinc-500"
            } ${canLike ? "cursor-pointer" : "cursor-default"}`}
          >
            <HeartIcon filled={artwork.liked_by_me} className="h-3.5 w-3.5" />
            {artwork.like_count}
          </button>
        </div>
      </div>
    </div>
  );
}
