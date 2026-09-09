import type { CustomField, Tag, User, Company } from "@prisma/client";

export function ContactFields({
  users,
  companies,
  tags,
  fields,
  values,
}: {
  users: Pick<User, "id" | "name">[];
  companies: Pick<Company, "id" | "name">[];
  tags: Tag[];
  fields: CustomField[];
  values?: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    city?: string | null;
    companyId?: string | null;
    ownerId?: string;
    tagIds?: string[];
    customData?: Record<string, string>;
  };
}) {
  const custom = values?.customData ?? {};
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Ad</span>
        <input name="firstName" required defaultValue={values?.firstName} className="field-input" />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Soyad</span>
        <input name="lastName" required defaultValue={values?.lastName} className="field-input" />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">E-posta</span>
        <input name="email" type="email" defaultValue={values?.email ?? ""} className="field-input" />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Telefon</span>
        <input name="phone" defaultValue={values?.phone ?? ""} className="field-input" />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Unvan</span>
        <input name="title" defaultValue={values?.title ?? ""} className="field-input" />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Şehir</span>
        <input name="city" defaultValue={values?.city ?? ""} className="field-input" />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Firma</span>
        <select name="companyId" defaultValue={values?.companyId ?? ""} className="field-select">
          <option value="">—</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Sahip</span>
        <select name="ownerId" defaultValue={values?.ownerId} className="field-select">
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium">Etiketler</legend>
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="tagIds"
                value={tag.id}
                defaultChecked={values?.tagIds?.includes(tag.id)}
              />
              <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </label>
          ))}
        </div>
      </fieldset>
      {fields.map((field) => {
        const options = JSON.parse(field.options || "[]") as string[];
        const name = `custom_${field.key}`;
        const value = custom[field.key] ?? "";
        return (
          <label key={field.id} className="grid gap-1.5 text-sm">
            <span className="font-medium">{field.label}</span>
            {field.type === "SELECT" ? (
              <select name={name} defaultValue={value} className="field-select">
                <option value="">—</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === "BOOLEAN" ? (
              <select name={name} defaultValue={value} className="field-select">
                <option value="">—</option>
                <option value="Evet">Evet</option>
                <option value="Hayır">Hayır</option>
              </select>
            ) : (
              <input
                name={name}
                type={field.type === "DATE" ? "date" : field.type === "NUMBER" ? "number" : "text"}
                defaultValue={value}
                className="field-input"
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
