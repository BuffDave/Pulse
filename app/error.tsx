"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[var(--bg-base)] p-6 text-center text-[var(--text-primary)]">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
        Reload to reconnect. Your session is anonymous — nothing was saved.
      </p>
      {process.env.NODE_ENV === "development" && error.message && (
        <p className="mt-3 max-w-md text-xs text-red-400">{error.message}</p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 cursor-pointer rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--bg-base)] shadow-[0_0_16px_var(--accent-glow)] transition duration-200 hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}
