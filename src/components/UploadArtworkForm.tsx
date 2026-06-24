"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ArtworkType } from "@/types/database";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
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
      setDescription("");
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

      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        maxLength={60}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />
      <textarea
        placeholder="설명 (선택)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />

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
