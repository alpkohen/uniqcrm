import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { foldTitle } from "@/lib/title-groups";

// Search is done word by word: every word of the query must appear in at least one
// of the searched columns, so "Burcu Doğan" finds a contact whose first name is
// "Burcu" and last name is "Doğan". Case and Turkish letters are folded on both
// sides ("dogan" finds "DOĞAN"), which a plain `contains` cannot do.

const MAX_TOKENS = 6;
const MAX_IDS = 30000;

function tokenize(q: string) {
  return foldTitle(q)
    .split(" ")
    .filter(Boolean)
    .slice(0, MAX_TOKENS)
    .map((token) => `%${token.replace(/[\\%_]/g, "\\$&")}%`);
}

// Same folding as foldTitle() on the JS side, expressed with built-in translate()/lower()
// so it needs no database extension.
function fold(column: string) {
  return Prisma.sql`translate(lower(translate(COALESCE(${Prisma.raw(column)}, ''), 'İIıĞÜŞÖÇ', 'iiiGUSOC')), 'ğüşöç', 'gusoc')`;
}

function matchAll(columns: string[], tokens: string[]) {
  const perToken = tokens.map(
    (token) => Prisma.sql`(${Prisma.join(columns.map((column) => Prisma.sql`${fold(column)} LIKE ${token}`), " OR ")})`,
  );
  return Prisma.join(perToken, " AND ");
}

const CONTACT_COLUMNS = ['c."firstName"', 'c."lastName"', "c.email", "c.phone", "c.title", "co.name"];

// Ids of every contact matching q (null when q has no usable words).
export async function searchContactIds(q: string): Promise<string[] | null> {
  const tokens = tokenize(q);
  if (tokens.length === 0) return null;
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT c.id
    FROM "Contact" c
    LEFT JOIN "Company" co ON co.id = c."companyId"
    WHERE ${matchAll(CONTACT_COLUMNS, tokens)}
    LIMIT ${MAX_IDS}
  `);
  return rows.map((row) => row.id);
}

export type ContactHit = { id: string; firstName: string; lastName: string; email: string | null };

export async function searchContacts(q: string, limit: number): Promise<ContactHit[]> {
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];
  return prisma.$queryRaw<ContactHit[]>(Prisma.sql`
    SELECT c.id AS "id", c."firstName" AS "firstName", c."lastName" AS "lastName", c.email AS "email"
    FROM "Contact" c
    LEFT JOIN "Company" co ON co.id = c."companyId"
    WHERE ${matchAll(CONTACT_COLUMNS, tokens)}
    ORDER BY c."lastName" ASC, c."firstName" ASC
    LIMIT ${limit}
  `);
}

export async function searchCompanyIds(q: string, withCityAndSector = false): Promise<string[] | null> {
  const tokens = tokenize(q);
  if (tokens.length === 0) return null;
  const columns = withCityAndSector ? ["co.name", "co.city", "co.sector"] : ["co.name"];
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT co.id
    FROM "Company" co
    WHERE ${matchAll(columns, tokens)}
    LIMIT ${MAX_IDS}
  `);
  return rows.map((row) => row.id);
}

export type CompanyHit = { id: string; name: string };

export async function searchCompanies(q: string, limit: number): Promise<CompanyHit[]> {
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];
  return prisma.$queryRaw<CompanyHit[]>(Prisma.sql`
    SELECT co.id AS "id", co.name AS "name"
    FROM "Company" co
    WHERE ${matchAll(["co.name"], tokens)}
    ORDER BY co.name ASC
    LIMIT ${limit}
  `);
}

export type DealHit = { id: string; title: string };

export async function searchDeals(q: string, limit: number): Promise<DealHit[]> {
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];
  return prisma.$queryRaw<DealHit[]>(Prisma.sql`
    SELECT d.id AS "id", d.title AS "title"
    FROM "Deal" d
    WHERE ${matchAll(["d.title"], tokens)}
    ORDER BY d."updatedAt" DESC
    LIMIT ${limit}
  `);
}
