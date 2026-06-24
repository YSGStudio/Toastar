export const ARTWORK_BUCKET = process.env.NEXT_PUBLIC_ARTWORK_BUCKET || "artworks";

export function artworkFilePath(params: {
  classId: string;
  studentId: string;
  artworkId: string;
  fileName: string;
}) {
  const ext = params.fileName.includes(".")
    ? params.fileName.split(".").pop()
    : "bin";
  return `${params.classId}/${params.studentId}/${params.artworkId}/original.${ext}`;
}

export function artworkThumbnailPath(params: {
  classId: string;
  studentId: string;
  artworkId: string;
}) {
  return `${params.classId}/${params.studentId}/${params.artworkId}/thumbnail.jpg`;
}
