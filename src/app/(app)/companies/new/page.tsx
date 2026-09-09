import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createCompany } from "@/actions/companies";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";

export default async function NewCompanyPage() {
  const user = await requireUser();
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Yeni firma" />
      <form action={createCompany} className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Firma adı</span>
          <input name="name" required className="field-input" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Web</span>
          <input name="website" className="field-input" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Telefon</span>
          <input name="phone" className="field-input" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Şehir</span>
          <input name="city" className="field-input" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Sektör</span>
          <input name="sector" className="field-input" />
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">
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
          <span className="font-medium">Notlar</span>
          <textarea name="notes" className="field-textarea" />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit">Kaydet</Button>
        </div>
      </form>
    </div>
  );
}
