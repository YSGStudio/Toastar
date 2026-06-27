"use client";

import { useEffect, useState } from "react";

const GUIDE_ACK_KEY = "toastar_ethics_guide_ack";

const VALUE_STYLES: Record<string, string> = {
  주도성: "bg-sky-50 text-sky-600",
  합목적성: "bg-emerald-50 text-emerald-600",
  안전성: "bg-cyan-50 text-cyan-600",
  투명성: "bg-amber-50 text-amber-600",
};

const GUIDES = [
  {
    values: ["주도성", "합목적성"],
    title: "가이드 1 · 활용 목적",
    heading: "생성형 AI를 쓰기 전, '왜' 쓰는지 말할 수 있어야 해요.",
    body: "생성형 AI를 사용하기 전에 '지금 내가 왜 쓰려고 하지?'라고 스스로 물어보세요. 생성형 AI는 내 생각을 대신하는 게 아니라, 내 생각을 도와주는 도구임을 기억하세요. 모든 공부에 생성형 AI가 필요한 것은 아니므로, 지금 하는 활동에 생성형 AI를 사용하는 것이 나의 학습에 정말 도움이 될지 먼저 고민해요.",
  },
  {
    values: ["주도성"],
    title: "가이드 2 · 주도적 학습",
    heading: "생성형 AI에게 물어보기 전, 내 생각을 먼저 말해요.",
    body: "막막할 때 바로 생성형 AI에게 묻고 싶은 마음이 들 수 있지만, 먼저 스스로 시도해 보아야 나의 성장에 도움이 돼요. 주제에 대해 내가 아는 것과 내 아이디어를 먼저 공책에 적거나 정리한 뒤에 생성형 AI를 활용하세요.",
  },
  {
    values: ["주도성"],
    title: "가이드 3 · 비판적 검증",
    heading: "생성형 AI가 틀릴 수 있다는 점을 알아요.",
    body: "생성형 AI는 틀린 정보를 마치 사실인 것처럼 제시하기도 하므로, 알려준 내용은 항상 '정말 맞을까?' 하고 한 번 더 확인하는 습관을 가져요. 중요한 내용일수록 책을 찾아보거나 선생님께 여쭤보는 등 다른 방법으로도 꼭 다시 확인하세요.",
  },
  {
    values: ["주도성", "합목적성"],
    title: "가이드 4 · 사고의 확장",
    heading: "생성형 AI와 함께 상상하며 내 생각을 더 크게 키워요.",
    body: "생성형 AI를 내 생각의 범위를 넓혀주는 도구로 사용해보세요. 생성형 AI의 결과물을 그대로 사용하지 않고, 나의 경험과 생각을 더해서 나만의 색깔을 담은 최종 결과물을 만들어요.",
  },
  {
    values: ["안전성"],
    title: "가이드 5 · 안전과 관계",
    heading: "나의 정보와 비밀을 말하지 않아요.",
    body: "내가 입력한 정보는 어디에서 어떻게 사용될지 모르기 때문에 이름, 주소, 학교, 전화번호 같은 개인정보는 생성형 AI에게 알려주면 안돼요. 생성형 AI는 계산된 답변을 내놓는 프로그램이라 감정이 없어요. 나의 고민을 털어놓고 지나치게 의지하기보다, 친구나 부모님, 선생님과의 실제 대화를 통해 마음을 나누어요.",
  },
  {
    values: ["투명성"],
    title: "가이드 6 · 투명성·윤리",
    heading: "생성형 AI의 도움을 받았다면 숨기지 않고 정직하게 이야기해요.",
    body: "어느 부분이 생성형 AI의 것이고 어느 부분이 나의 것인지 명확히 밝히는 것은 나 자신을 속이지 않는 정직한 태도예요. 생성형 AI를 쓴 사실을 정직하게 밝힐 때 나의 노력이 더 빛나고 가치 있게 인정받을 수 있어요.",
  },
];

/** 학생이 로그인할 때마다(세션 단위) 보여주는 생성형 AI 윤리 가이드 동의 게이트. */
export function EthicsGuideGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const acknowledged = sessionStorage.getItem(GUIDE_ACK_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!acknowledged) setOpen(true);
  }, []);

  function handleAgree() {
    sessionStorage.setItem(GUIDE_ACK_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="text-lg font-bold text-zinc-900">생성형 AI 윤리 핵심 가이드</h2>
          <p className="mt-1 text-sm text-zinc-500">작품을 만들고 나누기 전에 아래 가이드를 꼭 읽어주세요.</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {GUIDES.map((g) => (
            <div key={g.title} className="rounded-md border border-zinc-200 p-3">
              <div className="mb-1 flex items-center gap-1.5">
                {g.values.map((v) => (
                  <span
                    key={v}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${VALUE_STYLES[v]}`}
                  >
                    {v}
                  </span>
                ))}
                <span className="text-xs font-semibold text-zinc-400">{g.title}</span>
              </div>
              <p className="text-sm font-bold text-zinc-900">{g.heading}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">{g.body}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-200 px-5 py-4">
          <button
            type="button"
            onClick={handleAgree}
            className="w-full rounded-md bg-[#0095F6] py-2.5 text-sm font-semibold text-white"
          >
            나는 윤리 핵심가이드를 빠짐없이 읽고 이를 실천하겠습니다.
          </button>
        </div>
      </div>
    </div>
  );
}
