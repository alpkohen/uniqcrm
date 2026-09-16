"use client";

import { useState } from "react";
import Link from "next/link";
import { formatTry, fullName } from "@/lib/format";

type StageDeal = {
  id: string;
  title: string;
  amount: number;
  company: { name: string } | null;
  contact: { firstName: string; lastName: string } | null;
};

type Stage = { id: string; name: string; color: string; deals: StageDeal[] };

export function StageFunnel({ stages }: { stages: Stage[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const maxCount = Math.max(1, ...stages.map((s) => s.deals.length));

  return (
    <div className="grid gap-2">
      {stages.map((stage) => {
        const count = stage.deals.length;
        const amount = stage.deals.reduce((sum, deal) => sum + deal.amount, 0);
        const isOpen = openId === stage.id;
        return (
          <div key={stage.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : stage.id)}
              className="w-full text-left"
            >
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{stage.name}</span>
                <span>
                  {count} · {formatTry(amount)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: stage.color }}
                />
              </div>
            </button>
            {isOpen ? (
              count === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Bu aşamada fırsat yok.</p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Fırsat</th>
                        <th className="px-3 py-1.5 font-medium">Firma</th>
                        <th className="px-3 py-1.5 font-medium">Kişi</th>
                        <th className="px-3 py-1.5 font-medium">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stage.deals.map((deal) => (
                        <tr key={deal.id} className="border-b last:border-0">
                          <td className="px-3 py-1.5">
                            <Link href={`/deals/${deal.id}`} className="hover:underline">
                              {deal.title}
                            </Link>
                          </td>
                          <td className="px-3 py-1.5">{deal.company?.name ?? "—"}</td>
                          <td className="px-3 py-1.5">
                            {deal.contact ? fullName(deal.contact.firstName, deal.contact.lastName) : "—"}
                          </td>
                          <td className="px-3 py-1.5">{formatTry(deal.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
