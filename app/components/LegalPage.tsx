import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { LEGAL_LAST_UPDATED } from "@/lib/site";

function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  const className =
    "text-[var(--accent)] transition duration-200 hover:brightness-110";

  if (href?.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target={href?.startsWith("mailto:") ? undefined : "_blank"}
      rel={href?.startsWith("mailto:") ? undefined : "noopener noreferrer"}
      className={className}
    >
      {children}
    </a>
  );
}

export default function LegalPage({
  title,
  content,
  relatedLink,
}: {
  title: string;
  content: string;
  relatedLink: { href: string; label: string };
}) {
  return (
    <div className="entry-aurora flex min-h-full flex-1 flex-col text-[var(--text-primary)]">
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 pb-12">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--text-secondary)] transition duration-200 hover:text-[var(--accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Pulse
        </Link>

        <div className="panel-glass flex min-h-0 flex-1 flex-col rounded-3xl shadow-2xl">
          <header className="border-b border-[var(--border-subtle)] px-6 py-5 sm:px-8">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {title}
            </h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Last updated: {LEGAL_LAST_UPDATED}
            </p>
          </header>

          <div className="changelog-content overflow-y-auto px-6 py-6 text-sm sm:px-8">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h2 className="mb-2 mt-5 text-base font-semibold text-[var(--text-primary)]">
                    {children}
                  </h2>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-2 mt-5 text-base font-semibold text-[var(--text-primary)]">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-sm font-semibold text-[var(--accent)]">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-2 text-[var(--text-secondary)]">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 list-disc space-y-2 pl-6">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="text-[var(--text-secondary)]">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--text-primary)]">
                    {children}
                  </strong>
                ),
                a: ({ href, children }) => (
                  <MarkdownLink href={href}>{children}</MarkdownLink>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          <footer className="border-t border-[var(--border-subtle)] px-6 py-4 sm:px-8">
            <Link
              href={relatedLink.href}
              className="text-xs text-[var(--text-secondary)] transition duration-200 hover:text-[var(--accent)]"
            >
              {relatedLink.label}
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
