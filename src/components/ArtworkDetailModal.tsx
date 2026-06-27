"use client";

import { HeartIcon, ShareIcon } from "@/components/icons";
import type { ArtworkListItem } from "@/types/client";

const AVATAR_COLORS = ["#F58529", "#DD2A7B", "#8134AF", "#515BD4", "#0095F6", "#00A86B"];

function avatarColor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function ArtworkDetailModal({
  artwork,
  canLike,
  onClose,
  onToggleLike,
  onDelete,
  deleting,
}: {
  artwork: ArtworkListItem;
  canLike: boolean;
  onClose: () => void;
  onToggleLike: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const authorName = artwork.students?.name ?? "익명";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-0 sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-md flex-col overflow-y-auto bg-white sm:max-h-[90vh] sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: avatarColor(authorName) }}
            >
              {authorName.slice(0, 1)}
            </span>
            <span className="text-sm font-semibold text-zinc-900">{authorName}</span>
            {artwork.is_winner && <span className="text-xs">👑 수상작</span>}
          </div>
          <div className="flex items-center gap-2">
            {artwork.can_manage && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="text-xs font-medium text-[#ED4956] disabled:opacity-40"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            )}
            <button type="button" onClick={onClose} className="px-2 text-xl text-zinc-400">
              ×
            </button>
          </div>
        </div>

        <div
          className="flex aspect-square items-center justify-center bg-zinc-100"
          onContextMenu={(e) => e.preventDefault()}
        >
          {artwork.type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artwork.file_url}
              alt={artwork.title}
              draggable={false}
              className="h-full w-full select-none object-contain"
            />
          )}
          {artwork.type === "video" && (
            <video
              src={artwork.file_url}
              controls
              controlsList="nodownload"
              className="h-full w-full object-contain"
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
                className="flex items-center gap-1 break-all text-sm font-medium text-[#0095F6]"
              >
                <ShareIcon className="h-4 w-4 shrink-0" />
                {artwork.file_url}
              </a>
            </div>
          )}
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center gap-4 py-1">
            <button
              type="button"
              disabled={!canLike}
              onClick={onToggleLike}
              className={artwork.liked_by_me ? "text-[#ED4956]" : "text-zinc-900"}
            >
              <HeartIcon filled={artwork.liked_by_me} className="h-7 w-7" />
            </button>
          </div>
          <p className="text-sm font-semibold text-zinc-900">좋아요 {artwork.like_count}개</p>
          <p className="mt-1 text-sm text-zinc-900">
            <span className="font-semibold">{authorName}</span>{" "}
            <span className="font-medium">{artwork.title}</span>
          </p>
          {artwork.ai_help_description && (
            <div className="mt-2 rounded-md bg-sky-50 px-2.5 py-2">
              <p className="text-[11px] font-semibold text-sky-600">AI의 도움을 받은 점</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-700">{artwork.ai_help_description}</p>
            </div>
          )}
          {artwork.self_description && (
            <div className="mt-2 rounded-md bg-emerald-50 px-2.5 py-2">
              <p className="text-[11px] font-semibold text-emerald-600">내가 스스로 한 점</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-700">{artwork.self_description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
