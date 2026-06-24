"use client";

import type { ArtworkListItem } from "@/types/client";

export function ArtworkDetailModal({
  artwork,
  canLike,
  onClose,
  onToggleLike,
}: {
  artwork: ArtworkListItem;
  canLike: boolean;
  onClose: () => void;
  onToggleLike: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex max-h-[60vh] items-center justify-center bg-zinc-100"
          onContextMenu={(e) => e.preventDefault()}
        >
          {artwork.type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artwork.file_url}
              alt={artwork.title}
              draggable={false}
              className="max-h-[60vh] w-auto select-none object-contain"
            />
          )}
          {artwork.type === "video" && (
            <video
              src={artwork.file_url}
              controls
              controlsList="nodownload"
              className="max-h-[60vh] w-full"
            />
          )}
          {artwork.type === "audio" && (
            <div className="flex w-full flex-col items-center gap-4 p-10">
              <span className="text-5xl">🎵</span>
              <audio src={artwork.file_url} controls controlsList="nodownload" className="w-full" />
            </div>
          )}
          {artwork.type === "link" && (
            <div className="flex w-full flex-col items-center gap-4 p-10">
              {artwork.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artwork.thumbnail_url} alt={artwork.title} className="max-h-48 rounded-md" />
              ) : (
                <span className="text-5xl">🔗</span>
              )}
              <a
                href={artwork.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm font-medium text-indigo-600 underline"
              >
                {artwork.file_url}
              </a>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{artwork.title}</h2>
              <p className="text-sm text-zinc-500">{artwork.students?.name ?? "익명"}</p>
            </div>
            <button
              type="button"
              disabled={!canLike}
              onClick={onToggleLike}
              className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium ${
                artwork.liked_by_me
                  ? "border-rose-300 bg-rose-50 text-rose-500"
                  : "border-zinc-300 text-zinc-500"
              }`}
            >
              {artwork.liked_by_me ? "♥" : "♡"} {artwork.like_count}
            </button>
          </div>
          {artwork.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">{artwork.description}</p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-md bg-zinc-100 py-2 text-sm font-medium text-zinc-600"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
