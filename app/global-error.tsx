"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#0a0f0d] p-6 text-center text-[#e8f5ef] antialiased">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 max-w-sm text-sm text-[#9cb8ab]">
          Reload to reconnect. Your session is anonymous — nothing was saved.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="mt-3 max-w-md text-xs text-red-400">{error.message}</p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 cursor-pointer rounded-full bg-[#34d399] px-6 py-2.5 text-sm font-semibold text-[#0a0f0d] transition duration-200 hover:brightness-110"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
