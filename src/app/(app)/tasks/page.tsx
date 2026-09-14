import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDateTime, fullName, isOverdue } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/search-select";
import { createTask, toggleTask } from "@/actions/activities";
import { cn } from "cn";

export default async function TasksPage() {
  const user = await requireUser();
  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      include: { owner: true, contact: true },
      orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  const overdue = tasks.filter((task) => isOverdue(task.dueAt, task.completedAt));
  const open = tasks.filter((task) => !task.completedAt && !isOverdue(task.dueAt, task.completedAt));
  const done = tasks.filter((task) => task.completedAt);

  function TaskList({
    items,
    empty,
  }: {
    items: typeof tasks;
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

  return (
    <div>
      <PageHeader
        title="Görevler"
        description="Gecikenler üstte vurgulanır. Takvim senkronu yok — Uniq içi teslim tarihleri."
      />

      <section className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5">
        <h2 className="border-b border-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
          Geciken ({overdue.length})
        </h2>
        <TaskList items={overdue} empty="Geciken görev yok." />
      </section>

      <section className="mb-6 rounded-xl border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-medium">Açık</h2>
        <TaskList items={open} empty="Açık görev yok." />
      </section>

      <section className="mb-8 rounded-xl border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">Tamamlanan</h2>
        <TaskList items={done} empty="Henüz tamamlanan görev yok." />
      </section>

      <section className="rounded-xl border bg-card p-5">
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
    </div>
  );
}
