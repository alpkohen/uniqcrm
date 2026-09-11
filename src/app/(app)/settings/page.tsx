import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { roleLabel } from "@/lib/format";
import { PageHeader } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createCustomField,
  createTag,
  deleteCustomField,
  deleteTag,
} from "@/actions/settings";
import { createUser, deleteUser, resetUserPassword, updateUserRole } from "@/actions/users";

export default async function SettingsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const [tags, fields, users] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { contacts: true } } } }),
    prisma.customField.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Ayarlar"
        description="Etiketler, kişi özel alanları ve kullanıcılar. E-posta entegrasyonu yok."
      />

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-medium">Kullanıcılar</h2>
        <ul className="mt-4 divide-y">
          {users.map((item) => {
            const setRole = updateUserRole.bind(null, item.id);
            const resetPassword = resetUserPassword.bind(null, item.id);
            const remove = deleteUser.bind(null, item.id);
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.email}</p>
                </div>
                {isAdmin ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={setRole} className="flex items-center gap-1.5">
                      <select name="role" defaultValue={item.role} className="field-select h-8 text-xs">
                        <option value="ADMIN">Yönetici</option>
                        <option value="MEMBER">Üye</option>
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        Kaydet
                      </Button>
                    </form>
                    <form action={resetPassword} className="flex items-center gap-1.5">
                      <input
                        name="password"
                        type="password"
                        placeholder="Yeni şifre"
                        minLength={8}
                        className="field-input h-8 w-32 text-xs"
                      />
                      <Button type="submit" size="sm" variant="outline">
                        Şifre sıfırla
                      </Button>
                    </form>
                    <form action={remove}>
                      <Button type="submit" size="sm" variant="ghost">
                        Sil
                      </Button>
                    </form>
                  </div>
                ) : (
                  <Badge variant="secondary">{roleLabel(item.role)}</Badge>
                )}
              </li>
            );
          })}
        </ul>
        {isAdmin ? (
          <form action={createUser} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Ad soyad</span>
              <input name="name" required className="field-input" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">E-posta</span>
              <input name="email" type="email" required className="field-input" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Şifre</span>
              <input name="password" type="password" required minLength={8} className="field-input" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Rol</span>
              <select name="role" className="field-select" defaultValue="MEMBER">
                <option value="MEMBER">Üye</option>
                <option value="ADMIN">Yönetici</option>
              </select>
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit">Kullanıcı ekle</Button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-medium">Etiketler / segmentler</h2>
        <ul className="mt-4 space-y-2">
          {tags.map((tag) => {
            const remove = deleteTag.bind(null, tag.id);
            return (
              <li key={tag.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                  <span className="text-xs text-muted-foreground">{tag._count.contacts} kişi</span>
                </span>
                <form action={remove}>
                  <Button type="submit" variant="ghost" size="sm">
                    Sil
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
        <form action={createTag} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Ad</span>
            <input name="name" required className="field-input w-48" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Renk</span>
            <input name="color" type="color" defaultValue="#0f766e" className="h-8 w-12 rounded border" />
          </label>
          <Button type="submit">Etiket ekle</Button>
        </form>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-medium">Kişi özel alanları</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Şema tüm kişilerde geçerlidir. Değerler kişi kartında tutulur.
        </p>
        <ul className="mt-4 space-y-2">
          {fields.map((field) => {
            const remove = deleteCustomField.bind(null, field.id);
            return (
              <li key={field.id} className="flex items-center justify-between text-sm">
                <span>
                  {field.label}{" "}
                  <span className="text-xs text-muted-foreground">
                    {field.key} · {field.type}
                  </span>
                </span>
                {isAdmin ? (
                  <form action={remove}>
                    <Button type="submit" variant="ghost" size="sm">
                      Sil
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
        {isAdmin ? (
          <form action={createCustomField} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Etiket</span>
              <input name="label" required className="field-input" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Tip</span>
              <select name="type" className="field-select" defaultValue="TEXT">
                <option value="TEXT">Metin</option>
                <option value="NUMBER">Sayı</option>
                <option value="DATE">Tarih</option>
                <option value="SELECT">Seçim</option>
                <option value="BOOLEAN">Evet / Hayır</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Seçenekler (virgülle)</span>
              <input name="options" className="field-input" placeholder="LinkedIn, Referans, Etkinlik" />
            </label>
            <div>
              <Button type="submit">Alan ekle</Button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Özel alan şemasını yalnızca yöneticiler değiştirir.</p>
        )}
      </section>
    </div>
  );
}
