import Link from "next/link";
import { dealStatusLabel, formatTry, fullName } from "@/lib/format";

type DealRow = {
  id: string;
  title: string;
  amount: number;
  status: string;
  stage: { name: string };
  owner: { name: string };
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
};

export function DealList({ deals }: { deals: DealRow[] }) {
  if (deals.length === 0) {
    return <p className="text-sm text-muted-foreground">Fırsat yok.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Başlık</th>
            <th className="px-4 py-3 font-medium">Aşama</th>
            <th className="px-4 py-3 font-medium">Tutar</th>
            <th className="px-4 py-3 font-medium">Firma / Kişi</th>
            <th className="px-4 py-3 font-medium">Sahip</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link href={`/deals/${deal.id}`} className="font-medium hover:underline">
                  {deal.title}
                </Link>
                {deal.status !== "OPEN" ? (
                  <p className="text-xs text-muted-foreground">{dealStatusLabel(deal.status)}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">{deal.stage.name}</td>
              <td className="px-4 py-3">{formatTry(deal.amount)}</td>
              <td className="px-4 py-3">
                {deal.company ? (
                  <Link href={`/companies/${deal.company.id}`} className="hover:underline">
                    {deal.company.name}
                  </Link>
                ) : deal.contact ? (
                  <Link href={`/contacts/${deal.contact.id}`} className="hover:underline">
                    {fullName(deal.contact.firstName, deal.contact.lastName)}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{deal.owner.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
