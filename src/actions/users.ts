"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// Production builds replace a thrown server-action error with a generic React error page, so these
// actions report problems as a result the form can show instead.
export type UserActionResult = { ok?: boolean; error?: string };

function failure(error: unknown, fallback: string): UserActionResult {
  const detail = error instanceof Error ? error.message : "";
  return { error: detail ? `${fallback} (${detail.slice(0, 200)})` : fallback };
}

export async function createUser(_prev: UserActionResult, formData: FormData): Promise<UserActionResult> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "MEMBER") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (!name || !email || !password) {
    return { error: "Ad, e-posta ve şifre gerekli." };
  }
  if (password.length < 8) {
    return { error: "Şifre en az 8 karakter olmalı." };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "Bu e-posta zaten kayıtlı. Listeden o kullanıcının rolünü ve şifresini güncelleyin." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { name, email, passwordHash, role } });
  } catch (error) {
    return failure(error, "Kullanıcı eklenemedi.");
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateUserRole(
  userId: string,
  _prev: UserActionResult,
  formData: FormData,
): Promise<UserActionResult> {
  const admin = await requireAdmin();
  const role = String(formData.get("role") ?? "MEMBER") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (userId === admin.id && role !== "ADMIN") {
    return { error: "Kendi yöneticilik rolünüzü kaldıramazsınız." };
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { role } });
  } catch (error) {
    return failure(error, "Rol güncellenemedi.");
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function resetUserPassword(
  userId: string,
  _prev: UserActionResult,
  formData: FormData,
): Promise<UserActionResult> {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Şifre en az 8 karakter olmalı." };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  } catch (error) {
    return failure(error, "Şifre güncellenemedi.");
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteUser(userId: string, _prev: UserActionResult): Promise<UserActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    return { error: "Kendi hesabınızı silemezsiniz." };
  }
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    return failure(error, "Kullanıcı silinemedi (ilişkili kayıtları olabilir).");
  }
  revalidatePath("/settings");
  return { ok: true };
}
