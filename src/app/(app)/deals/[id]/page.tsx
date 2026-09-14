import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDateTime, formatFileSize, formatTry, fullName } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/search-select";
import {
  deleteDeal,
  deleteDealAttachment,
  updateDeal,
  uploadDealAttachment,
} from "@/actions/deals";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      stage: true,
      pipeline: { include: { stages: { orderBy: { sortOrder: "asc" } } } },
      company: true,
      contact: true,
      owner: true,
      attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!deal) notFound();

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  const update = updateDeal.bind(null, deal.id);
  const remove = deleteDeal.bind(null, deal.id);
  const upload = uploadDealAttachment.bind(null, deal.id);

  return (
    <div>
      <PageHeader
        title={deal.title}
        description={`${deal.stage.name} · ${formatTry(deal.amount)}`}
        actions={
          <>
            <Button render={<Link href="/deals" />} nativeButton={false} variant="outline">
              Fırsatlara dön
            </Button>
            <form action={remove}>
              <Button type="submit" variant="destructive">
                Sil
              </Button>
            </form>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form action={update} className="grid gap-3 rounded-xl border bg-card p-5">
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">Fırsat</h2>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Başlık</span>
            <input name="title" required defaultValue={deal.title} className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Tutar (TRY)</span>
            <input
              name="amount"
              type="number"
              min="0"
              defaultValue={deal.amount}
              className="field-input"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Aşama</span>
            <select name="stageId" defaultValue={deal.stageId} className="field-select">
              {deal.pipeline.stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Firma</span>
            <SearchSelect
              name="companyId"
              searchUrl="/api/companies/search"
              placeholder="Firma ara..."
              defaultValue={deal.company ? { id: deal.company.id, label: deal.company.name } : null}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Kişi</span>
            <SearchSelect
              name="contactId"
              searchUrl="/api/contacts/search"
              placeholder="Kişi ara..."
              defaultValue={
                deal.contact
                  ? { id: deal.contact.id, label: fullName(deal.contact.firstName, deal.contact.lastName) }
                  : null
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Sahip</span>
            <select name="ownerId" defaultValue={deal.ownerId} className="field-select">
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2">
            <Button type="submit">Güncelle</Button>
          </div>
        </form>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Dosyalar (teklif, sözleşme vb.)
          </h2>
          <form action={upload} className="flex flex-wrap items-center gap-2">
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.doc,.docx"
              className="field-input h-9 flex-1"
            />
            <Button type="submit" variant="outline">
              Yükle
            </Button>
          </form>
          <div className="mt-4 divide-y">
            {deal.attachments.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Henüz dosya yok.</p>
            ) : (
              deal.attachments.map((attachment) => {
                const remove = deleteDealAttachment.bind(null, attachment.id);
                return (
                  <div key={attachment.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <a
                        href={`/api/deal-attachments/${attachment.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {attachment.fileName}
                      </a>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatFileSize(attachment.fileSize)} · {attachment.uploadedBy.name} ·{" "}
                        {formatDateTime(attachment.createdAt)}
                      </p>
                    </div>
                    <form action={remove}>
                      <Button type="submit" size="sm" variant="ghost">
                        Sil
                      </Button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
