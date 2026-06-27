"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArtworkType, TitlePreset } from "@/types/database";

const TYPE_LABELS: Record<ArtworkType, string> = {
  image: "이미지",
  video: "동영상",
  audio: "오디오",
  link: "링크",
};

function generateImageThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 480;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function generateVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, (video.duration || 1) * 0.1);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
      URL.revokeObjectURL(url);
    };
    video.onerror = () => resolve(null);
  });
}

export function UploadArtworkForm({ onUploaded }: { onUploaded: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<ArtworkType>("image");
  const [titlePresets, setTitlePresets] = useState<TitlePreset[] | null>(null);
  const [title, setTitle] = useState("");
  const [aiHelpDescription, setAiHelpDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/title-presets")
      .then((res) => (res.ok ? res.json() : { titlePresets: [] }))
      .then((data) => setTitlePresets(data.titlePresets ?? []))
      .catch(() => setTitlePresets([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!title) {
        setError("제목을 선택해 주세요.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.set("title", title);
      formData.set("aiHelpDescription", aiHelpDescription);
      formData.set("selfDescription", selfDescription);
      formData.set("type", type);

      if (type === "link") {
        formData.set("linkUrl", linkUrl);
      } else if (file) {
        formData.set("file", file);
        const thumbnail =
          type === "image"
            ? await generateImageThumbnail(file)
            : type === "video"
              ? await generateVideoThumbnail(file)
              : null;
        if (thumbnail) formData.set("thumbnail", thumbnail, "thumbnail.jpg");
      } else {
        setError("파일을 선택해 주세요.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/artworks", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "업로드에 실패했습니다.");
        return;
      }
      setTitle("");
      setAiHelpDescription("");
      setSelfDescription("");
      setFile(null);
      setLinkUrl("");
      onUploaded();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">작품 올리기</h2>

      <div className="flex gap-1 rounded-full bg-zinc-100 p-1 text-xs">
        {(Object.keys(TYPE_LABELS) as ArtworkType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setFile(null);
            }}
            className={`flex-1 rounded-full py-1.5 font-medium ${
              type === t ? "bg-white shadow text-[#0095F6]" : "text-zinc-500"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <select
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          {titlePresets === null
            ? "제목 불러오는 중..."
            : titlePresets.length === 0
              ? "선생님이 아직 제목을 등록하지 않았어요"
              : "제목을 선택하세요"}
        </option>
        {(titlePresets ?? []).map((p) => (
          <option key={p.id} value={p.title}>
            {p.title}
          </option>
        ))}
      </select>

      <label className="block text-xs font-medium text-zinc-500">
        AI의 도움을 받은 점
        <textarea
          placeholder="생성형 AI로부터 어떤 도움을 받았는지 정직하게 적어주세요 (선택)"
          value={aiHelpDescription}
          onChange={(e) => setAiHelpDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-zinc-500">
        내가 스스로 한 점
        <textarea
          placeholder="내가 직접 생각하고 만든 부분을 적어주세요 (선택)"
          value={selfDescription}
          onChange={(e) => setSelfDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      {type === "link" ? (
        <input
          key="link-input"
          type="url"
          placeholder="https://..."
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      ) : (
        <input
          key="file-input"
          type="file"
          accept={type === "image" ? "image/*" : type === "video" ? "video/*" : "audio/*"}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[#0095F6] py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "업로드 중..." : "업로드"}
      </button>
    </form>
  );
}
