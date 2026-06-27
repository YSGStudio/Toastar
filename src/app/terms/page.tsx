import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TERMS_MD } from "@/content/terms";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm font-medium text-[#0095F6]">
        ← 처음으로
      </Link>
      <article className="prose prose-sm prose-zinc mt-4 max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{TERMS_MD}</ReactMarkdown>
      </article>
    </div>
  );
}
