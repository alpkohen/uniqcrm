import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ContactFields } from "@/components/contact-fields";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { createContact } from "@/actions/contacts";

export default async function NewContactPage() {
  const user = await requireUser();
  const [users, fields] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.customField.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Yeni kişi" description="Kişi kartı ve özel alanlar. Etiketleri sonradan kartından ekleyebilirsiniz." />
      <form action={createContact} className="rounded-xl border bg-card p-5">
        <ContactFields
          users={users}
          tags={[]}
          fields={fields}
          showTags={false}
          values={{ ownerId: user.id }}
        />
        <div className="mt-6">
          <Button type="submit">Kaydet</Button>
        </div>
      </form>
    </div>
  );
}
