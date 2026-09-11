import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REAL_USERS: { name: string; email: string; role: "ADMIN" | "MEMBER" }[] = [
  { name: "Alp Kohen", email: "akohen@uniq-tr.com", role: "ADMIN" },
  { name: "O. Arık", email: "oarik@uniq-tr.com", role: "MEMBER" },
  { name: "E. Boz", email: "eboz@uniq-tr.com", role: "MEMBER" },
  { name: "F. Kaya", email: "fkaya@uniq-tr.com", role: "MEMBER" },
  { name: "S. Cebeci", email: "scebeci@uniq-tr.com", role: "MEMBER" },
  { name: "Eva Fryer", email: "evafryer@uniq.consulting", role: "MEMBER" },
];

function randomPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

async function main() {
  console.log("Oluşturulan kullanıcılar ve geçici şifreleri (bir kereye mahsus gösterilir):\n");
  for (const user of REAL_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      console.log(`${user.email} zaten var, atlandı.`);
      continue;
    }
    const password = randomPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name: user.name, email: user.email, passwordHash, role: user.role },
    });
    console.log(`${user.name} <${user.email}> (${user.role})  şifre: ${password}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
