import Link from "next/link";
import { cn } from "cn";
import { LinkPending } from "@/components/link-pending";

export type FacetEntry = {
  key: string;
  label: string;
  color: string;
  count: number;
  active: boolean;
  href: string;
};

function FacetRow({ item, max, total }: { item: FacetEntry; max: number; total: number }) {
  const pct = total > 0 ? (item.count / total) * 100 : 0;
  return (
    <Link
      href={item.href}
      prefetch={false}
      aria-current={item.active ? "true" : undefined}
      className={cn(
        "group grid gap-1 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted/70",
        item.active && "bg-accent ring-1 ring-primary/25"
      )}
    >
      <span className="flex items-center gap-2 text-sm">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
        <span className={cn("min-w-0 flex-1 truncate", item.active && "font-medium")} title={item.label}>
          {item.label}
        </span>
        <LinkPending />
        <span className="tabular-nums font-medium">{item.count.toLocaleString("tr-TR")}</span>
        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
          {pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%
        </span>
      </span>
      <span className="ml-4 h-1 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full"
          style={{ width: `${max > 0 ? (item.count / max) * 100 : 0}%`, backgroundColor: item.color }}
        />
      </span>
    </Link>
  );
}

export function PeopleFacetCard({
  title,
  hint,
  items,
  total,
  visible = 99,
}: {
  title: string;
  hint?: string;
  items: FacetEntry[];
  total: number;
  visible?: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  // An active item that would be folded away must stay visible.
  const head = items.slice(0, visible);
  const tail = items.slice(visible);
  const shownHead = tail.some((i) => i.active) ? [...head, ...tail.filter((i) => i.active)] : head;
  const rest = tail.filter((i) => !i.active);

  return (
    <section className="rounded-xl border bg-card p-3">
      <div className="mb-1.5 px-2.5">
        <h2 className="text-sm font-medium">{title}</h2>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      {items.length === 0 ? (
        <p className="px-2.5 py-3 text-xs text-muted-foreground">Veri yok.</p>
      ) : (
        <div className="grid gap-0.5">
          {shownHead.map((item) => (
            <FacetRow key={item.key} item={item} max={max} total={total} />
          ))}
          {rest.length > 0 ? (
            <details className="group/more">
              <summary className="cursor-pointer list-none rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/70 group-open/more:hidden">
                + {rest.length} grup daha göster
              </summary>
              <div className="grid gap-0.5">
                {rest.map((item) => (
                  <FacetRow key={item.key} item={item} max={max} total={total} />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </section>
  );
}
