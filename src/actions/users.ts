"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function createUser(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "MEMBER") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (!name || !email || !password) {
    throw new Error("Ad, e-posta ve şifre gerekli.");
  }
  if (password.length < 8) {
    throw new Error("Şifre en az 8 karakter olmalı.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Bu e-posta zaten kayıtlı.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash, role } });

  revalidatePath("/settings");
}

export async function updateUserRole(userId: string, formData: FormData) {
  const admin = await requireAdmin();
  const role = String(formData.get("role") ?? "MEMBER") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (userId === admin.id && role !== "ADMIN") {
    throw new Error("Kendi yöneticilik rolünüzü kaldıramazsınız.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings");
}

export async function resetUserPassword(userId: string, formData: FormData) {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    throw new Error("Şifre en az 8 karakter olmalı.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/settings");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    throw new Error("Kendi hesabınızı silemezsiniz.");
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/settings");
}
