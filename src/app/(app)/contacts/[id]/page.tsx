import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { activityLabel, formatDateTime, fullName } from "@/lib/format";
import { ContactFields } from "@/components/contact-fields";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteContact, updateContact } from "@/actions/contacts";
import { createActivity, createTask } from "@/actions/activities";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      owner: true,
      tags: { include: { tag: true } },
      activities: { include: { owner: true }, orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { dueAt: "asc" }, take: 8 },
      deals: { include: { stage: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!contact) notFound();

  const [users, companies, tags, fields] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.customField.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  let customData: Record<string, string> = {};
  try {
    customData = JSON.parse(contact.customData || "{}") as Record<string, string>;
  } catch {
    customData = {};
  }

  const update = updateContact.bind(null, contact.id);
  const remove = deleteContact.bind(null, contact.id);
  const addActivity = createActivity.bind(null, contact.id);

  return (
    <div>
      <PageHeader
        title={fullName(contact.firstName, contact.lastName)}
        description={[contact.title, contact.company?.name, contact.email].filter(Boolean).join(" · ")}
        actions={
          <form action={remove}>
            <Button type="submit" variant="destructive">
              Sil
            </Button>
          </form>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {contact.tags.map(({ tag }) => (
          <Badge key={tag.id} variant="secondary">
            {tag.name}
          </Badge>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form action={update} className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Kart</h2>
          <ContactFields
            users={users}
            companies={companies}
            tags={tags}
            fields={fields}
            values={{
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
              phone: contact.phone,
              title: contact.title,
              city: contact.city,
              companyId: contact.companyId,
              ownerId: contact.ownerId,
              tagIds: contact.tags.map((item) => item.tagId),
              customData,
            }}
          />
          <div className="mt-6">
            <Button type="submit">Güncelle</Button>
          </div>
        </form>

        <div className="grid gap-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Aktivite ekle</h2>
            <form action={addActivity} className="grid gap-3">
              <select name="type" className="field-select" defaultValue="NOTE">
                <option value="NOTE">Not</option>
                <option value="CALL">Arama</option>
                <option value="MEETING">Toplantı</option>
                <option value="TASK">Görev notu</option>
              </select>
              <input name="title" required placeholder="Başlık" className="field-input" />
              <textarea name="body" placeholder="Detay" className="field-textarea min-h-20" />
              <Button type="submit" variant="outline">
                Kaydet
              </Button>
            </form>
            <div className="mt-5 divide-y">
              {contact.activities.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Henüz aktivite yok.</p>
              ) : (
                contact.activities.map((activity) => (
                  <div key={activity.id} className="py-3">
                    <p className="text-sm font-medium">
                      {activityLabel(activity.type)} · {activity.title}
                    </p>
                    {activity.body ? (
                      <p className="mt-1 text-sm text-muted-foreground">{activity.body}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.owner.name} · {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Görev oluştur</h2>
            <form action={createTask} className="grid gap-3">
              <input type="hidden" name="contactId" value={contact.id} />
              <input name="title" required placeholder="Görev" className="field-input" />
              <input name="dueAt" type="datetime-local" required className="field-input" />
              <Button type="submit" variant="outline">
                Görev ekle
              </Button>
            </form>
            <ul className="mt-4 space-y-2 text-sm">
              {contact.tasks.map((task) => (
                <li key={task.id} className="flex justify-between gap-2">
                  <span className={task.completedAt ? "text-muted-foreground line-through" : ""}>
                    {task.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(task.dueAt)}</span>
                </li>
              ))}
            </ul>
          </section>

          {contact.deals.length ? (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Fırsatlar</h2>
              <ul className="space-y-2 text-sm">
                {contact.deals.map((deal) => (
                  <li key={deal.id}>
                    <Link href="/deals" className="hover:underline">
                      {deal.title}
                    </Link>
                    <span className="text-muted-foreground"> · {deal.stage.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
