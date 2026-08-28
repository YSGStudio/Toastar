"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  detectArtworkType,
  FILE_ACCEPT,
  TYPE_ICONS,
  TYPE_LABELS,
  type UploadedArtworkType,
} from "@/lib/artworkTypes";
import type { TitlePreset } from "@/types/database";

const MODE_LABELS = { file: "파일", link: "링크" } as const;
type UploadMode = keyof typeof MODE_LABELS;

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
  const [mode, setMode] = useState<UploadMode>("file");
  const [titlePresets, setTitlePresets] = useState<TitlePreset[] | null>(null);
  const [title, setTitle] = useState("");
  const [aiHelpDescription, setAiHelpDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // 파일을 고르는 순간 형식을 자동으로 판별한다(학생이 형식을 직접 고를 필요가 없다).
  const [detectedType, setDetectedType] = useState<UploadedArtworkType | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/title-presets")
      .then((res) => (res.ok ? res.json() : { titlePresets: [] }))
      .then((data) => setTitlePresets(data.titlePresets ?? []))
      .catch(() => setTitlePresets([]));
  }, []);

  function handleFileChange(selected: File | null) {
    setError(null);
    if (!selected) {
      setFile(null);
      setDetectedType(null);
      return;
    }
    const detected = detectArtworkType(selected);
    if (!detected) {
      setFile(null);
      setDetectedType(null);
      setError("이미지·동영상·오디오·PDF 파일만 올릴 수 있어요.");
      return;
    }
    setFile(selected);
    setDetectedType(detected);
  }

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
      formData.set("type", mode);

      if (mode === "link") {
        formData.set("linkUrl", linkUrl);
      } else if (file && detectedType) {
        formData.set("file", file);
        const thumbnail =
          detectedType === "image"
            ? await generateImageThumbnail(file)
            : detectedType === "video"
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
      setDetectedType(null);
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
        {(Object.keys(MODE_LABELS) as UploadMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setFile(null);
              setDetectedType(null);
            }}
            className={`flex-1 rounded-full py-1.5 font-medium ${
              mode === m ? "bg-white shadow text-[#6C5CE7]" : "text-zinc-500"
            }`}
          >
            {MODE_LABELS[m]}
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

      {mode === "link" ? (
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
        <div className="space-y-1.5">
          <input
            key="file-input"
            type="file"
            accept={FILE_ACCEPT}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          {detectedType ? (
            <p className="flex items-center gap-1 text-xs font-medium text-[#6C5CE7]">
              <span>{TYPE_ICONS[detectedType]}</span>
              {TYPE_LABELS[detectedType]} 자료로 올라가요
            </p>
          ) : (
            <p className="text-xs text-zinc-400">이미지·동영상·오디오·PDF를 올릴 수 있어요.</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[#6C5CE7] py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "업로드 중..." : "업로드"}
      </button>
    </form>
  );
}
