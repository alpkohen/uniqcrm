import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatTry, fullName } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { deleteCompany, updateCompany } from "@/actions/companies";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      owner: true,
      contacts: { orderBy: { lastName: "asc" } },
      deals: { include: { stage: true } },
    },
  });
  if (!company) notFound();
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  const update = updateCompany.bind(null, company.id);
  const remove = deleteCompany.bind(null, company.id);

  return (
    <div>
      <PageHeader
        title={company.name}
        description={[company.sector, company.city].filter(Boolean).join(" · ")}
        actions={
          <form action={remove}>
            <Button type="submit" variant="destructive">
              Sil
            </Button>
          </form>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <form action={update} className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Firma adı</span>
            <input name="name" required defaultValue={company.name} className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Web</span>
            <input name="website" defaultValue={company.website ?? ""} className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Telefon</span>
            <input name="phone" defaultValue={company.phone ?? ""} className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Şehir</span>
            <input name="city" defaultValue={company.city ?? ""} className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Sektör</span>
            <input name="sector" defaultValue={company.sector ?? ""} className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Sahip</span>
            <select name="ownerId" defaultValue={company.ownerId} className="field-select">
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Notlar</span>
            <textarea name="notes" defaultValue={company.notes ?? ""} className="field-textarea" />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Güncelle</Button>
          </div>
        </form>
        <div className="grid gap-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Kişiler</h2>
            <ul className="space-y-2 text-sm">
              {company.contacts.map((contact) => (
                <li key={contact.id}>
                  <Link href={`/contacts/${contact.id}`} className="hover:underline">
                    {fullName(contact.firstName, contact.lastName)}
                  </Link>
                  <span className="text-muted-foreground"> {contact.title ? `· ${contact.title}` : ""}</span>
                </li>
              ))}
              {company.contacts.length === 0 ? (
                <li className="text-muted-foreground">Bağlı kişi yok.</li>
              ) : null}
            </ul>
          </section>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Fırsatlar</h2>
            <ul className="space-y-2 text-sm">
              {company.deals.map((deal) => (
                <li key={deal.id}>
                  {deal.title} · {deal.stage.name} · {formatTry(deal.amount)}
                </li>
              ))}
              {company.deals.length === 0 ? (
                <li className="text-muted-foreground">Fırsat yok.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
