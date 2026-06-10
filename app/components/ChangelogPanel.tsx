"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import packageJson from "../../package.json";

export default function ChangelogPanel({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const version = packageJson.version;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute left-4 top-4 z-10 rounded-full bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur transition hover:bg-zinc-800/90 hover:text-zinc-200"
        aria-label="Open changelog"
      >
        v{version}
      </button>

      {open && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-100">Changelog</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                Close
              </button>
            </header>

            <div className="changelog-content overflow-y-auto px-5 py-4 text-sm text-zinc-300">
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
                    <ul className="mb-3 list-disc space-y-2 pl-5">{children}</ul>
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
      )}
    </>
  );
}
