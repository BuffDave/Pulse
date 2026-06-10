"use client";

import { ScrollText, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ChangelogPanel({
  content,
  open,
  onClose,
}: {
  content: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel-glass animate-scale-in flex max-h-[80vh] w-full max-w-5xl flex-col rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-8 py-5">
          <div className="flex items-center gap-2">
            <ScrollText
              className="h-4 w-4 text-[var(--accent)]"
              aria-hidden
            />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Changelog
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition duration-200 hover:bg-white/5 hover:text-[var(--text-primary)]"
            aria-label="Close changelog"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="changelog-content overflow-y-auto px-8 py-6 text-sm text-[var(--text-secondary)]">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="mb-3 text-lg font-bold text-[var(--text-primary)]">
                  {children}
                </h1>
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
                <p className="mb-2 text-[var(--text-secondary)]">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 list-disc space-y-3 pl-6">{children}</ul>
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
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline transition duration-200 hover:brightness-110"
                >
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
