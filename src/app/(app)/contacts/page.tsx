import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/constants";
import { fullName } from "@/lib/format";
import { PageHeader, Pagination, EmptyState } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; owner?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const tag = params.tag ?? "";
  const owner = params.owner ?? "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const [tags, users] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  const where = {
    AND: [
      q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
              { title: { contains: q } },
              { company: { name: { contains: q } } },
            ],
          }
        : {},
      tag ? { tags: { some: { tagId: tag } } } : {},
      owner ? { ownerId: owner } : {},
    ],
  };

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      include: {
        company: true,
        owner: true,
        tags: { include: { tag: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (tag) query.set("tag", tag);
  if (owner) query.set("owner", owner);

  return (
    <div>
      <PageHeader
        title="Kişiler"
        description={`${total.toLocaleString("tr-TR")} kayıt · arama ve sayfalama ~20.000 kişi için tasarlandı.`}
        actions={
          <Button render={<Link href="/contacts/new" />} nativeButton={false}>Yeni kişi</Button>
        }
      />

      <form className="mb-4 grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Ad, e-posta, unvan, firma…"
          className="field-input sm:col-span-2"
        />
        <select name="tag" defaultValue={tag} className="field-select">
          <option value="">Tüm etiketler</option>
          {tags.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="owner" defaultValue={owner} className="field-select">
          <option value="">Tüm sahipler</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <div className="sm:col-span-4">
          <Button type="submit" variant="outline" size="sm">
            Filtrele
          </Button>
        </div>
      </form>

      {contacts.length === 0 ? (
        <EmptyState
          title="Kişi bulunamadı"
          description="Aramayı değiştirin veya Nimble dışa aktarımını İçe aktar ekranından yükleyin."
          action={
            <Button render={<Link href="/contacts/new" />} variant="outline" nativeButton={false}>
              Kişi ekle
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Kişi</th>
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="px-4 py-3 font-medium">Etiketler</th>
                <th className="px-4 py-3 font-medium">Sahip</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                      {fullName(contact.firstName, contact.lastName)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {contact.title ?? contact.email ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {contact.company ? (
                      <Link href={`/companies/${contact.company.id}`} className="hover:underline">
                        {contact.company.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map(({ tag: item }) => (
                        <Badge key={item.id} variant="secondary">
                          {item.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{contact.owner.name}</td>
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
          const nextQuery = new URLSearchParams(query);
          nextQuery.set("page", String(next));
          return `/contacts?${nextQuery.toString()}`;
        }}
      />
    </div>
  );
}
