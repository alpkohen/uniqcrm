"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function createActivity(contactId: string, formData: FormData) {
  const user = await requireUser();
  const type = String(formData.get("type") ?? "NOTE");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title) throw new Error("Başlık gerekli.");

  await prisma.activity.create({
    data: {
      type,
      title,
      body: body || null,
      contactId,
      ownerId: user.id,
    },
  });

  revalidatePath(`/contacts/${contactId}`);
}

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const dueAt = String(formData.get("dueAt") ?? "");
  if (!title || !dueAt) throw new Error("Başlık ve tarih gerekli.");

  const contactId = String(formData.get("contactId") ?? "") || null;

  await prisma.task.create({
    data: {
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      dueAt: new Date(dueAt),
      contactId,
      ownerId: String(formData.get("ownerId") ?? "") || user.id,
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function toggleTask(taskId: string) {
  await requireUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await prisma.task.update({
    where: { id: taskId },
    data: { completedAt: task.completedAt ? null : new Date() },
  });

  revalidatePath("/tasks");
  revalidatePath("/");
  if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);
}

export async function deleteTask(taskId: string) {
  await requireUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function createMeeting(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "");
  if (!title || !startsAt) throw new Error("Başlık ve tarih gerekli.");

  const contactId = String(formData.get("contactId") ?? "") || null;

  await prisma.meeting.create({
    data: {
      title,
      notes: String(formData.get("notes") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      startsAt: new Date(startsAt),
      contactId,
      ownerId: String(formData.get("ownerId") ?? "") || user.id,
    },
  });

  revalidatePath("/meetings");
  revalidatePath("/");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function deleteMeeting(meetingId: string) {
  await requireUser();
  await prisma.meeting.delete({ where: { id: meetingId } });
  revalidatePath("/meetings");
  revalidatePath("/");
}
