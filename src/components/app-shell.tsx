"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChartPie,
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
  { href: "/companies", label: "Firmalar", icon: Building2 },
  { href: "/deals", label: "Fırsatlar", icon: Handshake },
  { href: "/tasks", label: "Görevler", icon: ListTodo },
  { href: "/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/import", label: "İçe aktar", icon: Import },
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
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
    </nav>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-5 py-5">
          <p className="text-[11px] font-medium tracking-[0.2em] text-sidebar-primary uppercase">
            UNIQ
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">CRM</p>
        </div>
        <div className="px-3 pb-3">
          <GlobalSearch />
        </div>
        <div className="flex-1 px-3">
          <NavLinks />
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
            <p className="text-[11px] font-medium tracking-[0.2em] text-primary uppercase">UNIQ</p>
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
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
