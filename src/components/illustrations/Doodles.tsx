type DoodleProps = { className?: string };

/** 손그림 느낌의 간단한 캐릭터 도형 일러스트. Jambo 참고 디자인의 무드를 본떠 직접 새로 그렸다. */

export function BunnyDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 140" fill="none" className={className}>
      <ellipse cx="40" cy="30" rx="12" ry="28" fill="white" stroke="currentColor" strokeWidth="6" />
      <ellipse cx="80" cy="30" rx="12" ry="28" fill="white" stroke="currentColor" strokeWidth="6" />
      <circle cx="60" cy="82" r="38" fill="white" stroke="currentColor" strokeWidth="6" />
      <circle cx="48" cy="77" r="4" fill="currentColor" />
      <circle cx="72" cy="77" r="4" fill="currentColor" />
      <path d="M52 94 Q60 100 68 94" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function CatDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className}>
      <path d="M30 35 L45 8 L55 35 Z" fill="white" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="M90 35 L75 8 L65 35 Z" fill="white" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <circle cx="60" cy="66" r="38" fill="white" stroke="currentColor" strokeWidth="6" />
      <circle cx="48" cy="61" r="4" fill="currentColor" />
      <circle cx="72" cy="61" r="4" fill="currentColor" />
      <path d="M52 79 Q60 85 68 79" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M18 64 L40 68 M18 76 L40 72" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M102 64 L80 68 M102 76 L80 72" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function StarDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className}>
      <path
        d="M60 8 L72 44 L110 44 L79 66 L90 102 L60 80 L30 102 L41 66 L10 44 L48 44 Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="58" r="4" fill="currentColor" />
      <circle cx="70" cy="58" r="4" fill="currentColor" />
      <path d="M52 70 Q60 76 68 70" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function CloudDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 140 100" fill="none" className={className}>
      <path
        d="M32 72 C14 72 8 50 24 42 C20 22 46 14 58 28 C66 12 94 16 96 36 C114 36 116 64 96 70 C96 72 34 72 32 72 Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx="55" cy="48" r="4" fill="currentColor" />
      <circle cx="82" cy="48" r="4" fill="currentColor" />
      <path d="M58 58 Q68 64 78 58" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function HeartDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 110" fill="none" className={className}>
      <path
        d="M60 100 C20 75 5 50 5 30 a25 25 0 0 1 50-10 a25 25 0 0 1 50 10 c0 20-15 45-45 70 Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx="45" cy="40" r="4" fill="currentColor" />
      <circle cx="75" cy="40" r="4" fill="currentColor" />
      <path d="M48 52 Q60 60 72 52" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
