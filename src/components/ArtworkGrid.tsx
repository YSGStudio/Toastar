"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArtworkCard } from "@/components/ArtworkCard";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useHeart } from "@/components/HeartContext";
import { CloudDoodle } from "@/components/illustrations/Doodles";
import type { ArtworkListItem } from "@/types/client";

const URL_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * 새로 받아온 목록을 화면에 반영하되, 이미 떠 있는 작품의 서명 URL은 그대로 둔다.
 * 서명 URL은 요청마다 값이 달라져서 그대로 반영하면 <img src>가 매번 바뀌어 재다운로드가 일어난다.
 */
function keepSignedUrls(prev: ArtworkListItem[], next: ArtworkListItem[]): ArtworkListItem[] {
  const prevById = new Map(prev.map((a) => [a.id, a]));
  return next.map((a) => {
    const old = prevById.get(a.id);
    if (!old || old.file_path !== a.file_path || old.thumbnail_path !== a.thumbnail_path) return a;
    return { ...a, file_url: old.file_url, thumbnail_url: old.thumbnail_url };
  });
}

export function ArtworkGrid({
  initialArtworks,
  fetchUrl,
  canLike,
  currentStudentId,
  emptyMessage,
  pollIntervalMs,
}: {
  initialArtworks: ArtworkListItem[];
  fetchUrl: string;
  canLike: boolean;
  currentStudentId?: string | null;
  emptyMessage: string;
  /** 지정하면 이 주기(ms)마다 목록을 다시 불러온다. 최신 자료 화면에서만 사용한다. */
  pollIntervalMs?: number;
}) {
  const [artworks, setArtworks] = useState(initialArtworks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [prevInitialArtworks, setPrevInitialArtworks] = useState(initialArtworks);
  const { decrementHeart, incrementHeart, syncHeart } = useHeart();
  // 전송 중인 하트 요청. 연타로 같은 작품에 두 번 요청이 나가면 서버가 409로 거절하는데,
  // 그때 낙관적 반영을 되돌리면 실제로는 차감된 하트가 화면에서만 되살아난다.
  const pendingLikeIds = useRef<Set<string>>(new Set());
  // 서명 URL을 마지막으로 새로 받아온 시각. 폴링마다 새 URL로 갈아끼우면 이미지를 계속 다시
  // 내려받게 되므로, 만료(15분)에 여유를 두고 10분에 한 번만 갈아끼운다.
  const urlsRefreshedAt = useRef(0);

  if (initialArtworks !== prevInitialArtworks) {
    setPrevInitialArtworks(initialArtworks);
    setArtworks(initialArtworks);
  }

  // 한 번 준 하트는 취소할 수 없고, 같은 작품에는 한 번만 줄 수 있다.
  function canLikeArtwork(artwork: ArtworkListItem) {
    return canLike && artwork.student_id !== currentStudentId && !artwork.liked_by_me;
  }

  const refresh = useCallback(async () => {
    // 하트 요청이 처리되는 중에는 서버 응답이 아직 그 하트를 모르기 때문에 목록을 덮어쓰지 않는다.
    if (pendingLikeIds.current.size > 0) return;
    const res = await fetch(fetchUrl, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (pendingLikeIds.current.size > 0) return;

    const now = Date.now();
    if (urlsRefreshedAt.current === 0) urlsRefreshedAt.current = now;
    const refreshUrls = now - urlsRefreshedAt.current >= URL_REFRESH_INTERVAL_MS;
    if (refreshUrls) urlsRefreshedAt.current = now;

    setArtworks((prev) => (refreshUrls ? data.artworks : keepSignedUrls(prev, data.artworks)));
  }, [fetchUrl]);

  useEffect(() => {
    if (!pollIntervalMs) return;

    function tick() {
      // 보이지 않는 탭에서는 요청을 아낀다. 다시 보이는 순간 즉시 한 번 받아온다.
      if (document.visibilityState !== "visible") return;
      void refresh();
    }

    const timer = setInterval(tick, pollIntervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [pollIntervalMs, refresh]);

  function applyToArtwork(id: string, patch: (a: ArtworkListItem) => ArtworkListItem) {
    setArtworks((prev) => prev.map((a) => (a.id === id ? patch(a) : a)));
  }

  async function giveHeart(artwork: ArtworkListItem) {
    if (!canLikeArtwork(artwork)) return;
    if (pendingLikeIds.current.has(artwork.id)) return;
    pendingLikeIds.current.add(artwork.id);
    setNotice(null);

    applyToArtwork(artwork.id, (a) => ({ ...a, liked_by_me: true, like_count: a.like_count + 1 }));
    decrementHeart();

    try {
      const res = await fetch(`/api/artworks/${artwork.id}/like`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.heart) syncHeart(data.heart);
        return;
      }

      if (data.code === "ALREADY_LIKED") {
        // 이미 서버에 기록된 하트다. 준 상태는 그대로 두고 중복으로 더한 수만 되돌린다.
        applyToArtwork(artwork.id, (a) => ({
          ...a,
          liked_by_me: true,
          like_count: Math.max(a.like_count - 1, 0),
        }));
      } else {
        applyToArtwork(artwork.id, (a) => ({
          ...a,
          liked_by_me: false,
          like_count: Math.max(a.like_count - 1, 0),
        }));
        // 하트가 왜 되돌아갔는지 학생이 알 수 있도록 서버 메시지를 그대로 보여준다.
        setNotice(
          data.code === "HEART_LIMIT"
            ? "이번 기간에 줄 수 있는 하트를 모두 사용했어요"
            : (data.error ?? "하트를 주지 못했어요. 잠시 후 다시 시도해 주세요."),
        );
      }

      // 성공·실패와 무관하게 서버가 알려준 실제 잔량으로 맞춘다.
      if (data.heart) syncHeart(data.heart);
      else if (data.code !== "ALREADY_LIKED") incrementHeart();
    } catch {
      applyToArtwork(artwork.id, (a) => ({
        ...a,
        liked_by_me: false,
        like_count: Math.max(a.like_count - 1, 0),
      }));
      incrementHeart();
      setNotice("네트워크 상태를 확인해 주세요.");
    } finally {
      pendingLikeIds.current.delete(artwork.id);
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
      {notice && (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-700">
          {notice}
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
