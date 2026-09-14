"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
      <p className="text-sm font-medium text-destructive">{error.message || "Bir şeyler ters gitti."}</p>
      <button
        onClick={reset}
        className="rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-muted"
      >
        Tekrar dene
      </button>
    </div>
  );
}
