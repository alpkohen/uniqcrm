import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const companies = await prisma.company.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { city: { contains: query } },
            { sector: { contains: query } },
          ],
        }
      : undefined,
    include: { owner: true, _count: { select: { contacts: true, deals: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Firmalar"
        description="Kurumsal hesaplar ve bağlı kişiler."
        actions={<Button render={<Link href="/companies/new" />}>Yeni firma</Button>}
      />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={query} placeholder="Firma, şehir, sektör…" className="field-input max-w-sm" />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>
      {companies.length === 0 ? (
        <EmptyState title="Firma yok" description="Yeni bir hesap ekleyin veya CSV ile kişi aktarırken firma adı kullanın." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="px-4 py-3 font-medium">Sektör</th>
                <th className="px-4 py-3 font-medium">Şehir</th>
                <th className="px-4 py-3 font-medium">Kişiler</th>
                <th className="px-4 py-3 font-medium">Sahip</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${company.id}`} className="font-medium hover:underline">
                      {company.name}
                    </Link>
                    {company.website ? (
                      <p className="text-xs text-muted-foreground">{company.website}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{company.sector ?? "—"}</td>
                  <td className="px-4 py-3">{company.city ?? "—"}</td>
                  <td className="px-4 py-3">{company._count.contacts}</td>
                  <td className="px-4 py-3 text-muted-foreground">{company.owner.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
