import type { Artwork } from "@/types/database";

/**
 * 화면에 내려보내는 작품. 투표가 끝나기 전에는 학생에게 작성자와 받은 하트 수를 가린다.
 * 가린 값은 서버에서 아예 지워서 보내므로(블러는 표시일 뿐이다) 개발자 도구로도 볼 수 없다.
 */
export interface ArtworkListItem extends Omit<Artwork, "like_count"> {
  /** 가린 경우 null. 본인 작품은 이름을 가리지 않는다. */
  students: { name: string } | null;
  /** 가린 경우 null. */
  like_count: number | null;
  /** 투표가 끝나기 전이라 결과(작성자·하트 수)를 가렸는지. */
  results_hidden: boolean;
  liked_by_me: boolean;
  is_winner: boolean;
  can_manage: boolean;
  file_url: string;
  thumbnail_url: string | null;
}
