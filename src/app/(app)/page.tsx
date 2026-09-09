import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDateTime, formatTry, thisWeekRange, isOverdue } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  await requireUser();
  const week = thisWeekRange();
  const now = new Date();

  const [openDeals, weekTasks, overdueTasks, upcomingMeetings] = await Promise.all([
    prisma.deal.aggregate({
      where: { status: "OPEN" },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.task.findMany({
      where: {
        completedAt: null,
        dueAt: { gte: week.start, lte: week.end },
      },
      include: { owner: true, contact: true },
      orderBy: { dueAt: "asc" },
    }),
    prisma.task.findMany({
      where: { completedAt: null, dueAt: { lt: now } },
      include: { owner: true },
      orderBy: { dueAt: "asc" },
      take: 6,
    }),
    prisma.meeting.findMany({
      where: { startsAt: { gte: now } },
      include: { contact: true },
      orderBy: { startsAt: "asc" },
      take: 4,
    }),
  ]);

  const overdueThisWeek = overdueTasks.filter((task) => isOverdue(task.dueAt, task.completedAt));

  return (
    <div>
      <PageHeader
        title="Özet"
        description="Açık fırsatlar, bu haftanın işi ve yaklaşan toplantılar."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Açık fırsatlar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{openDeals._count._all}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Toplam {formatTry(openDeals._sum.amount ?? 0)}
            </p>
            <Link href="/deals" className="mt-3 inline-block text-sm text-primary hover:underline">
              Huniyi aç
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bu haftanın görevleri</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{weekTasks.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Teslim tarihi bu hafta içinde</p>
            <Link href="/tasks" className="mt-3 inline-block text-sm text-primary hover:underline">
              Görev listesi
            </Link>
          </CardContent>
        </Card>
        <Card className={overdueThisWeek.length ? "ring-1 ring-destructive/30" : undefined}>
          <CardHeader>
            <CardTitle>Geciken görevler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-destructive">
              {overdueThisWeek.length}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Tamamlanmamış ve tarihi geçmiş</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Bu hafta</h2>
          <div className="divide-y rounded-xl border bg-card">
            {weekTasks.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">Bu hafta açık görev yok.</p>
            ) : (
              weekTasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.owner.name}
                      {task.contact
                        ? ` · ${task.contact.firstName} ${task.contact.lastName}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={
                      isOverdue(task.dueAt, task.completedAt)
                        ? "text-xs font-medium text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {formatDateTime(task.dueAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Yaklaşan toplantılar</h2>
          <div className="divide-y rounded-xl border bg-card">
            {upcomingMeetings.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">Planlı toplantı yok.</p>
            ) : (
              upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="px-4 py-3">
                  <p className="text-sm font-medium">{meeting.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(meeting.startsAt)}
                    {meeting.location ? ` · ${meeting.location}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
          <Link href="/meetings" className="mt-3 inline-block text-sm text-primary hover:underline">
            Tüm toplantılar
          </Link>
        </section>
      </div>
    </div>
  );
}
