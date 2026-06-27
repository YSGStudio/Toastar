import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-4 text-center text-xs text-zinc-400">
      <Link href="/privacy" className="hover:underline">
        개인정보처리방침
      </Link>
      <span className="mx-2">·</span>
      <Link href="/terms" className="hover:underline">
        이용약관
      </Link>
    </footer>
  );
}
