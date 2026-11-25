"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpDown,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Building2,
  ChartBar,
  ChartPie,
  History,
  Import,
  LayoutDashboard,
  ListTodo,
  Menu,
  Settings,
  Users,
  Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GlobalSearch } from "@/components/global-search";
import { logoutAction } from "@/actions/auth";
import { cn } from "cn";

const NAV = [
  { href: "/", label: "Özet", icon: LayoutDashboard },
  { href: "/people", label: "Kişi Analizi", icon: ChartPie },
  { href: "/contacts", label: "Kişiler", icon: Users },
  { href: "/company-analysis", label: "Firma Analizi", icon: ChartBar },
  { href: "/training-history", label: "Eğitim Geçmişi", icon: History },
  { href: "/companies", label: "Firmalar", icon: Building2 },
  { href: "/deals", label: "Fırsatlar", icon: Handshake },
  { href: "/tasks", label: "Görevler", icon: ListTodo },
  { href: "/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/import", label: "İçe aktar", icon: Import },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

const ORDER_KEY = "nav-order";
const ORDER_EVENT = "nav-order-change";

// The menu order is a per-browser preference: kept in localStorage, never required.
function readOrder(): string[] {
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeOrder(order: string[]) {
  try {
    if (order.length) window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    else window.localStorage.removeItem(ORDER_KEY);
  } catch {
    // Storage blocked (private mode): the order just isn't remembered.
  }
  window.dispatchEvent(new Event(ORDER_EVENT));
}

function useNavOrder() {
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setOrder(readOrder());
    sync();
    window.addEventListener(ORDER_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ORDER_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return order;
}

// Saved positions first (in saved order), then any item not in the saved list at its default place.
function applyOrder<T extends { href: string }>(items: T[], order: string[]) {
  const rank = (href: string) => {
    const i = order.indexOf(href);
    return i === -1 ? order.length + items.findIndex((x) => x.href === href) : i;
  };
  return [...items].sort((a, b) => rank(a.href) - rank(b.href));
}

function NavLinks({ onNavigate, hidden = [] }: { onNavigate?: () => void; hidden?: string[] }) {
  const pathname = usePathname();
  const order = useNavOrder();
  const [editing, setEditing] = useState(false);
  const items = applyOrder(
    NAV.filter((item) => !hidden.includes(item.href)),
    order,
  );

  const move = (index: number, delta: number) => {
    const next = items.map((i) => i.href);
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    writeOrder(next);
  };

  return (
    <nav className="grid gap-0.5">
      {items.map((item, index) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        if (editing) {
          return (
            <div
              key={item.href}
              className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/40 py-1 pr-1 pl-3 text-sm text-sidebar-foreground"
            >
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`${item.label} yukarı taşı`}
                className="rounded p-1 hover:bg-sidebar-accent disabled:opacity-25"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label={`${item.label} aşağı taşı`}
                className="rounded p-1 hover:bg-sidebar-accent disabled:opacity-25"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-2 flex items-center gap-3 px-3 text-xs text-sidebar-foreground/50">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex items-center gap-1.5 hover:text-sidebar-foreground"
        >
          {editing ? <Check className="size-3.5" /> : <ArrowUpDown className="size-3.5" />}
          {editing ? "Bitti" : "Menüyü düzenle"}
        </button>
        {editing && order.length > 0 ? (
          <button type="button" onClick={() => writeOrder([])} className="hover:text-sidebar-foreground">
            Varsayılana dön
          </button>
        ) : null}
      </div>
    </nav>
  );
}

export function AppShell({
  user,
  brandName = "UNIQ",
  hiddenNav = [],
  children,
}: {
  user: { name: string; email: string; role: string };
  brandName?: string;
  hiddenNav?: string[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-5 py-5">
          <p className="text-[11px] font-medium tracking-[0.2em] text-sidebar-primary uppercase">
            {brandName}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">CRM</p>
        </div>
        <div className="px-3 pb-3">
          <GlobalSearch />
        </div>
        <div className="flex-1 px-3">
          <NavLinks hidden={hiddenNav} />
        </div>
        <div className="border-t border-sidebar-border px-4 py-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
          <form action={logoutAction} className="mt-3">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              Çıkış
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-primary uppercase">{brandName}</p>
            <p className="text-sm font-semibold">CRM</p>
          </div>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon-sm" />}>
              <Menu />
              <span className="sr-only">Menü</span>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar text-sidebar-foreground sm:max-w-64">
              <SheetHeader>
                <SheetTitle className="text-sidebar-foreground">Menü</SheetTitle>
              </SheetHeader>
              <div className="px-3 pb-3">
                <GlobalSearch />
              </div>
              <div className="px-3">
                <NavLinks hidden={hiddenNav} />
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
