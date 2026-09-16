import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDateTime, fullName, isOverdue } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/search-select";
import { createMeeting, createTask, deleteMeeting, toggleTask } from "@/actions/activities";
import { cn } from "cn";

function TaskGroup({
  items,
  empty,
}: {
  items: {
    id: string;
    title: string;
    dueAt: Date;
    completedAt: Date | null;
    owner: { name: string };
    contact: { id: string; firstName: string; lastName: string } | null;
  }[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y">
      {items.map((task) => {
        const toggle = toggleTask.bind(null, task.id);
        const overdueItem = isOverdue(task.dueAt, task.completedAt);
        return (
          <li key={task.id} className="flex items-start gap-3 px-4 py-3">
            <form action={toggle}>
              <button
                type="submit"
                className={cn(
                  "mt-0.5 size-4 rounded border",
                  task.completedAt ? "bg-primary" : "bg-background"
                )}
                aria-label="Tamamlandı olarak işaretle"
              />
            </form>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", task.completedAt && "text-muted-foreground line-through")}>
                {task.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {task.owner.name}
                {task.contact ? (
                  <>
                    {" · "}
                    <Link href={`/contacts/${task.contact.id}`} className="hover:underline">
                      {fullName(task.contact.firstName, task.contact.lastName)}
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            <span className={cn("text-xs", overdueItem ? "font-medium text-destructive" : "text-muted-foreground")}>
              {formatDateTime(task.dueAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function TasksPage() {
  const user = await requireUser();
  const now = new Date();
  const [tasks, users, upcomingMeetings, pastMeetings] = await Promise.all([
    prisma.task.findMany({
      include: { owner: true, contact: true },
      orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.meeting.findMany({
      where: { startsAt: { gte: now } },
      include: { owner: true, contact: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.meeting.findMany({
      where: { startsAt: { lt: now } },
      include: { owner: true, contact: true },
      orderBy: { startsAt: "desc" },
      take: 8,
    }),
  ]);

  const overdue = tasks.filter((task) => isOverdue(task.dueAt, task.completedAt));
  const open = tasks.filter((task) => !task.completedAt && !isOverdue(task.dueAt, task.completedAt));
  const done = tasks.filter((task) => task.completedAt);

  return (
    <div>
      <PageHeader
        title="Görevler"
        description="Gecikenler üstte vurgulanır. Takvim senkronu yok — Uniq içi teslim tarihleri ve toplantılar."
      />

      <section className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5">
        <h2 className="border-b border-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
          Geciken ({overdue.length})
        </h2>
        <TaskGroup items={overdue} empty="Geciken görev yok." />
      </section>

      <section className="mb-6 rounded-xl border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-medium">Açık</h2>
        <TaskGroup items={open} empty="Açık görev yok." />
      </section>

      <section className="mb-8 rounded-xl border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">Tamamlanan</h2>
        <TaskGroup items={done} empty="Henüz tamamlanan görev yok." />
      </section>

      <section className="mb-8 rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Yeni görev</h2>
        <form action={createTask} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Başlık</span>
            <input name="title" required className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Teslim</span>
            <input name="dueAt" type="datetime-local" required className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Sahip</span>
            <select name="ownerId" defaultValue={user.id} className="field-select">
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Kişi</span>
            <SearchSelect name="contactId" searchUrl="/api/contacts/search" placeholder="Kişi ara..." />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Açıklama</span>
            <textarea name="description" className="field-textarea min-h-16" />
          </label>
          <div>
            <Button type="submit">Görev ekle</Button>
          </div>
        </form>
      </section>

      <h2 className="mb-3 text-base font-medium">Toplantılar</h2>

      <section className="mb-6 rounded-xl border bg-card">
        <h3 className="border-b px-4 py-3 text-sm font-medium">Yaklaşan</h3>
        {upcomingMeetings.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Yaklaşan toplantı yok.</p>
        ) : (
          <ul className="divide-y">
            {upcomingMeetings.map((meeting) => {
              const remove = deleteMeeting.bind(null, meeting.id);
              return (
                <li key={meeting.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(meeting.startsAt)}
                      {meeting.location ? ` · ${meeting.location}` : ""}
                      {meeting.contact ? (
                        <>
                          {" · "}
                          <Link href={`/contacts/${meeting.contact.id}`} className="hover:underline">
                            {fullName(meeting.contact.firstName, meeting.contact.lastName)}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <form action={remove}>
                    <Button type="submit" variant="ghost" size="sm">
                      Sil
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-6 rounded-xl border bg-card">
        <h3 className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">Geçmiş</h3>
        {pastMeetings.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Kayıt yok.</p>
        ) : (
          <ul className="divide-y">
            {pastMeetings.map((meeting) => (
              <li key={meeting.id} className="px-4 py-3">
                <p className="text-sm">{meeting.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(meeting.startsAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-medium">Toplantı ekle</h3>
        <form action={createMeeting} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Başlık</span>
            <input name="title" required className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Tarih / saat</span>
            <input name="startsAt" type="datetime-local" required className="field-input" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Yer</span>
            <input name="location" className="field-input" placeholder="Ofis veya çevrimiçi" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Kişi</span>
            <SearchSelect name="contactId" searchUrl="/api/contacts/search" placeholder="Kişi ara..." />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Sahip</span>
            <select name="ownerId" defaultValue={user.id} className="field-select">
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Not</span>
            <textarea name="notes" className="field-textarea min-h-16" />
          </label>
          <div>
            <Button type="submit">Kaydet</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
