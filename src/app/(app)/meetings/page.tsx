import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDateTime, fullName } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/search-select";
import { createMeeting, deleteMeeting } from "@/actions/activities";

export default async function MeetingsPage() {
  const user = await requireUser();
  const now = new Date();
  const [upcoming, past, users] = await Promise.all([
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
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Toplantılar"
        description="Uniq içi ajanda. Google / Outlook senkronu yok."
      />

      <section className="mb-6 rounded-xl border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-medium">Yaklaşan</h2>
        {upcoming.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Yaklaşan toplantı yok.</p>
        ) : (
          <ul className="divide-y">
            {upcoming.map((meeting) => {
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

      <section className="mb-8 rounded-xl border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">Geçmiş</h2>
        {past.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Kayıt yok.</p>
        ) : (
          <ul className="divide-y">
            {past.map((meeting) => (
              <li key={meeting.id} className="px-4 py-3">
                <p className="text-sm">{meeting.title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(meeting.startsAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Toplantı ekle</h2>
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
