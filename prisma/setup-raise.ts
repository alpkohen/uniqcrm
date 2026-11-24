// One-time setup of an empty RAISE database (run after `prisma db push` against it).
//
//   DATABASE_URL=<RAISE db> npx tsx prisma/setup-raise.ts "Ad Soyad <eposta>" "Ad Soyad <eposta>" ...
//
// The first user becomes Yönetici, the rest Üye. Each user gets a one-time password printed here.
// Also creates the "Hedef firmalar" pipeline used for the RAISE go-to list. Safe to re-run:
// existing users and an existing pipeline with the same name are left alone.
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const RAISE_PIPELINE = "Hedef firmalar";

const STAGES = [
  { name: "Hedef", color: "#94a3b8" },
  { name: "İlk temas", color: "#60a5fa" },
  { name: "Toplantı yapıldı", color: "#818cf8" },
  { name: "Teklif", color: "#f59e0b" },
  { name: "Kazanıldı", color: "#10b981", isWon: true },
  { name: "Kaybedildi", color: "#f87171", isLost: true },
];

function parseUser(arg: string) {
  const m = arg.match(/^(.+?)\s*<([^>]+)>$/);
  if (!m) throw new Error(`Kullanıcı "Ad Soyad <eposta>" biçiminde olmalı: ${arg}`);
  return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
}

async function main() {
  const users = process.argv.slice(2).map(parseUser);
  if (users.length === 0) throw new Error('En az bir kullanıcı verin: "Ad Soyad <eposta>"');

  for (const [i, u] of users.entries()) {
    if (await prisma.user.findUnique({ where: { email: u.email } })) {
      console.log(`${u.email} zaten var, atlandı.`);
      continue;
    }
    const password = crypto.randomBytes(9).toString("base64url");
    await prisma.user.create({
      data: { name: u.name, email: u.email, role: i === 0 ? "ADMIN" : "MEMBER", passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`${u.name} <${u.email}> (${i === 0 ? "Yönetici" : "Üye"})  geçici şifre: ${password}`);
  }

  if (await prisma.pipeline.findFirst({ where: { name: RAISE_PIPELINE } })) {
    console.log(`"${RAISE_PIPELINE}" hattı zaten var.`);
  } else {
    await prisma.pipeline.create({
      data: {
        name: RAISE_PIPELINE,
        stages: { create: STAGES.map((s, i) => ({ name: s.name, color: s.color, sortOrder: i, isWon: !!s.isWon, isLost: !!s.isLost })) },
      },
    });
    console.log(`"${RAISE_PIPELINE}" hattı oluşturuldu: ${STAGES.map((s) => s.name).join(" → ")}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
