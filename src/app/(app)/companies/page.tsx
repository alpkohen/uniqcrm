import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/constants";
import { buildCompanyWhere } from "@/lib/company-filters";
import { PageHeader, Pagination, EmptyState } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const where = buildCompanyWhere(query);

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      include: {
        owner: { select: { name: true } },
        _count: { select: { contacts: true, deals: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportQuery = new URLSearchParams();
  if (query) exportQuery.set("q", query);

  return (
    <div>
      <PageHeader
        title="Firmalar"
        description="Kurumsal hesaplar ve bağlı kişiler."
        actions={
          <>
            <Button
              render={<a href={`/api/companies/export?${exportQuery.toString()}`} />}
              variant="outline"
              nativeButton={false}
            >
              Dışa aktar
            </Button>
            <Button render={<Link href="/companies/new" />} nativeButton={false}>Yeni firma</Button>
          </>
        }
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

      <Pagination
        page={page}
        pageCount={pageCount}
        hrefFor={(next) => {
          const nextQuery = new URLSearchParams(exportQuery);
          nextQuery.set("page", String(next));
          return `/companies?${nextQuery.toString()}`;
        }}
      />
    </div>
  );
}
