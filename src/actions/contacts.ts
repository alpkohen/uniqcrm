"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

async function customDataFromForm(formData: FormData) {
  const fields = await prisma.customField.findMany();
  const data: Record<string, string> = {};
  for (const field of fields) {
    const value = String(formData.get(`custom_${field.key}`) ?? "").trim();
    if (value) data[field.key] = value;
  }
  return JSON.stringify(data);
}

async function tagIdsFromForm(formData: FormData) {
  return formData
    .getAll("tagIds")
    .map((value) => String(value))
    .filter(Boolean);
}

export async function createContact(formData: FormData) {
  const user = await requireUser();
  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  if (!firstName || !lastName) {
    throw new Error("Ad ve soyad gerekli.");
  }

  const contact = await prisma.contact.create({
    data: {
      firstName,
      lastName,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      title: str(formData, "title"),
      city: str(formData, "city"),
      companyId: str(formData, "companyId"),
      ownerId: str(formData, "ownerId") ?? user.id,
      customData: await customDataFromForm(formData),
      tags: {
        create: (await tagIdsFromForm(formData)).map((tagId) => ({ tagId })),
      },
    },
  });

  revalidatePath("/contacts");
  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(contactId: string, formData: FormData) {
  const user = await requireUser();
  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  if (!firstName || !lastName) {
    throw new Error("Ad ve soyad gerekli.");
  }

  const tagIds = await tagIdsFromForm(formData);

  await prisma.$transaction([
    prisma.contactTag.deleteMany({ where: { contactId } }),
    prisma.contact.update({
      where: { id: contactId },
      data: {
        firstName,
        lastName,
        email: str(formData, "email"),
        phone: str(formData, "phone"),
        title: str(formData, "title"),
        city: str(formData, "city"),
        companyId: str(formData, "companyId"),
        ownerId: str(formData, "ownerId") ?? user.id,
        customData: await customDataFromForm(formData),
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
    }),
  ]);

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
}

export async function deleteContact(contactId: string) {
  await requireUser();
  await prisma.contact.delete({ where: { id: contactId } });
  revalidatePath("/contacts");
  redirect("/contacts");
}
