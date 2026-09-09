import type { ReactNode } from "react";
import { cn } from "cn";

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("grid gap-1.5 text-sm", className)}>
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Sayfa {page} / {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <a className="rounded-md border bg-card px-3 py-1.5 hover:bg-muted" href={hrefFor(page - 1)}>
            Önceki
          </a>
        ) : (
          <span className="rounded-md border px-3 py-1.5 opacity-40">Önceki</span>
        )}
        {page < pageCount ? (
          <a className="rounded-md border bg-card px-3 py-1.5 hover:bg-muted" href={hrefFor(page + 1)}>
            Sonraki
          </a>
        ) : (
          <span className="rounded-md border px-3 py-1.5 opacity-40">Sonraki</span>
        )}
      </div>
    </div>
  );
}
