"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";

export async function createTag(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#0f766e");
  if (!name) throw new Error("Etiket adı gerekli.");

  await prisma.tag.create({ data: { name, color } });
  revalidatePath("/settings");
  revalidatePath("/contacts");
}

export async function deleteTag(tagId: string) {
  await requireUser();
  await prisma.tag.delete({ where: { id: tagId } });
  revalidatePath("/settings");
  revalidatePath("/contacts");
}

export async function createCustomField(formData: FormData) {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "TEXT");
  if (!label) throw new Error("Alan adı gerekli.");

  const key =
    String(formData.get("key") ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_") ||
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  const options = String(formData.get("options") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const max = await prisma.customField.aggregate({ _max: { sortOrder: true } });

  await prisma.customField.create({
    data: {
      key: key || `alan_${Date.now()}`,
      label,
      type,
      options: JSON.stringify(options),
      required: formData.get("required") === "on",
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/contacts");
}

export async function deleteCustomField(fieldId: string) {
  await requireAdmin();
  await prisma.customField.delete({ where: { id: fieldId } });
  revalidatePath("/settings");
}
