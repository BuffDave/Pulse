"use client";

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
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-5xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-8 py-5">
          <h2 className="text-sm font-semibold text-zinc-100">Changelog</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            Close
          </button>
        </header>

        <div className="changelog-content overflow-y-auto px-8 py-6 text-sm text-zinc-300">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="mb-3 text-lg font-bold text-zinc-100">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 mt-5 text-base font-semibold text-zinc-100">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-4 text-sm font-semibold text-emerald-400">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-2 text-zinc-400">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 list-disc space-y-3 pl-6">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="text-zinc-300">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-100">
                  {children}
                </strong>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 underline hover:text-emerald-300"
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
