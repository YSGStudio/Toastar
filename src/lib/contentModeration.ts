import OpenAI from "openai";

export interface ModerationResult {
  flagged: boolean;
  reason: string | null;
}

const SYSTEM_PROMPT = `당신은 초등학생 작품 공유 플랫폼의 글 검수자입니다.
학생이 작성한 글에 욕설, 비속어, 또래나 다른 사람에 대한 비난·혐오 표현이 있는지 확인하세요.
실제로 그런 표현이 있을 때만 flagged를 true로 하세요. 단순한 솔직한 감정 표현이나 평범한 문장은 통과시키세요.
반드시 아래 JSON 형식으로만 답하세요:
{"flagged": boolean, "reason": "문제가 있다면 학생이 이해할 수 있는 짧은 한국어 설명, 없으면 빈 문자열"}`;

/**
 * 학생이 작성한 글에 욕설·비속어·타인 비난이 있는지 OpenAI로 검사한다.
 * API 키가 없거나 호출이 실패하면 업로드 자체를 막지 않도록 통과(flagged: false) 처리한다.
 */
export async function checkForAbusiveContent(text: string): Promise<ModerationResult> {
  const trimmed = text.trim();
  if (!trimmed) return { flagged: false, reason: null };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { flagged: false, reason: null };

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { flagged?: boolean; reason?: string };
    return {
      flagged: parsed.flagged === true,
      reason: parsed.reason || null,
    };
  } catch (err) {
    console.error("[contentModeration] OpenAI 호출 실패, 통과 처리:", err);
    return { flagged: false, reason: null };
  }
}
