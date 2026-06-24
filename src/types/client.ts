import type { Artwork } from "@/types/database";

export interface ArtworkListItem extends Artwork {
  students: { name: string } | null;
  liked_by_me: boolean;
  is_winner: boolean;
  file_url: string;
  thumbnail_url: string | null;
}
