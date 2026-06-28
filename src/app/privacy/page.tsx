import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PRIVACY_POLICY_MD } from "@/content/privacyPolicy";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm font-medium text-[#6C5CE7]">
        ← 처음으로
      </Link>
      <article className="prose prose-sm prose-zinc mt-4 max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{PRIVACY_POLICY_MD}</ReactMarkdown>
      </article>
    </div>
  );
}
