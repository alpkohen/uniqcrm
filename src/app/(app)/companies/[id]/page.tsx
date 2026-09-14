import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatTry, fullName } from "@/lib/format";
import { listDistinctSectors } from "@/lib/sectors";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { deleteCompany, updateCompany } from "@/actions/companies";
import { createDeal } from "@/actions/deals";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [currentUser, company, users, sectors, pipeline] = await Promise.all([
    requireUser(),
    prisma.company.findUnique({
      where: { id },
      include: {
        owner: true,
        contacts: { orderBy: { lastName: "asc" } },
        deals: { include: { stage: true } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    listDistinctSectors(),
    prisma.pipeline.findFirst({ include: { stages: { orderBy: { sortOrder: "asc" } } } }),
  ]);
  if (!company) notFound();
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
            <input
              name="sector"
              list="sector-options"
              required
              defaultValue={company.sector ?? ""}
              placeholder="Sektör seçin veya yazın"
              className="field-input"
            />
            <datalist id="sector-options">
              {sectors.map((sector) => (
                <option key={sector} value={sector} />
              ))}
            </datalist>
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

            {pipeline ? (
              <form action={createDeal} className="mt-4 grid gap-3 border-t pt-4">
                <input type="hidden" name="pipelineId" value={pipeline.id} />
                <input type="hidden" name="companyId" value={company.id} />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Başlık</span>
                  <input name="title" required className="field-input" placeholder="Fırsat başlığı" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Tutar (TRY)</span>
                    <input name="amount" type="number" min="0" defaultValue={0} className="field-input" />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Aşama</span>
                    <select name="stageId" className="field-select" defaultValue={pipeline.stages[0]?.id}>
                      {pipeline.stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Kişi</span>
                    <select name="contactId" className="field-select" defaultValue="">
                      <option value="">—</option>
                      {company.contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {fullName(contact.firstName, contact.lastName)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">Sahip</span>
                    <select name="ownerId" defaultValue={currentUser.id} className="field-select">
                      {users.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <Button type="submit" variant="outline">
                    Fırsat ekle
                  </Button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
