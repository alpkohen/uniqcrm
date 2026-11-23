"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { normalizeCompanyName } from "@/lib/company-name";

export type MergeSelection = { primaryId: string; name: string; mergeIds: string[] };

type Company = {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  sector: string | null;
  notes: string | null;
  createdAt: Date;
  owner: { name: string };
};

// Re-checks a selection on the server so only genuine duplicate groups can be merged: every company must exist,
// ids must not repeat, and all names in a group must normalise to the same key.
async function resolve(selection: MergeSelection[]): Promise<{ error?: string; groups: { sel: MergeSelection; primary: Company; others: Company[] }[] }> {
  if (selection.length === 0) return { error: "Hiç grup seçilmedi.", groups: [] };
  const ids = selection.flatMap((s) => [s.primaryId, ...s.mergeIds]);
  if (new Set(ids).size !== ids.length) return { error: "Aynı firma birden fazla grupta görünüyor.", groups: [] };

  const found = await prisma.company.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, website: true, phone: true, city: true, sector: true, notes: true, createdAt: true, owner: { select: { name: true } } },
  });
  const byId = new Map(found.map((c) => [c.id, c]));

  const groups: { sel: MergeSelection; primary: Company; others: Company[] }[] = [];
  for (const sel of selection) {
    const primary = byId.get(sel.primaryId);
    const others = sel.mergeIds.map((id) => byId.get(id));
    if (!primary || others.some((o) => !o) || sel.mergeIds.length === 0) {
      return { error: "Seçimdeki bir firma bulunamadı. Sayfayı yenileyip tekrar deneyin.", groups: [] };
    }
    const key = normalizeCompanyName(primary.name);
    if (others.some((o) => normalizeCompanyName(o!.name) !== key)) {
      return { error: `Aynı olmayan firmalar birleştirilemez: ${primary.name}`, groups: [] };
    }
    if (!sel.name.trim()) return { error: "Birleşik firma adı boş olamaz.", groups: [] };
    groups.push({ sel, primary, others: others as Company[] });
  }
  return { groups };
}

// Excel copy of everything the merge touches: the companies, and which people/deals/cards moved from where.
export async function backupCompanyMerge(selection: MergeSelection[]): Promise<{ error?: string; filename: string; base64: string }> {
  await requireAdmin();
  const { error, groups } = await resolve(selection);
  if (error) return { error, filename: "", base64: "" };

  const all = groups.flatMap((g) => [g.primary, ...g.others]);
  const keepOf = new Map<string, string>();
  const nameOf = new Map(all.map((c) => [c.id, c.name]));
  for (const g of groups) for (const o of g.others) keepOf.set(o.id, g.primary.id);
  const moving = [...keepOf.keys()];

  const [contacts, deals, cards] = await Promise.all([
    prisma.contact.findMany({ where: { companyId: { in: moving } }, select: { id: true, firstName: true, lastName: true, email: true, companyId: true } }),
    prisma.deal.findMany({ where: { companyId: { in: moving } }, select: { id: true, title: true, companyId: true } }),
    prisma.workflowCard.findMany({ where: { companyId: { in: moving } }, select: { id: true, title: true, companyId: true } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  const add = (title: string, headers: string[], rows: unknown[][]) => {
    const sheet = workbook.addWorksheet(title);
    sheet.columns = headers.map((header) => ({ header, width: 26 }));
    rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };
  };

  add(
    "Firmalar",
    ["Firma ID", "Firma", "Sektör", "Şehir", "Web", "Telefon", "Notlar", "Sahip", "Eklenme", "İşlem", "Kalacak firma ID"],
    all.map((c) => [
      c.id, c.name, c.sector ?? "", c.city ?? "", c.website ?? "", c.phone ?? "", c.notes ?? "", c.owner.name,
      c.createdAt.toISOString().slice(0, 10),
      keepOf.has(c.id) ? "Silinecek" : "Kalacak",
      keepOf.get(c.id) ?? c.id,
    ]),
  );
  add(
    "Kişiler",
    ["Kişi ID", "Ad", "Soyad", "E-posta", "Eski firma ID", "Eski firma", "Yeni firma ID"],
    contacts.map((c) => [c.id, c.firstName, c.lastName, c.email ?? "", c.companyId, nameOf.get(c.companyId!) ?? "", keepOf.get(c.companyId!) ?? ""]),
  );
  add("Fırsatlar", ["Fırsat ID", "Başlık", "Eski firma ID", "Eski firma", "Yeni firma ID"], deals.map((d) => [d.id, d.title, d.companyId, nameOf.get(d.companyId!) ?? "", keepOf.get(d.companyId!) ?? ""]));
  add("İş akışı kartları", ["Kart ID", "Başlık", "Eski firma ID", "Eski firma", "Yeni firma ID"], cards.map((c) => [c.id, c.title, c.companyId, nameOf.get(c.companyId!) ?? "", keepOf.get(c.companyId!) ?? ""]));

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { filename: `firma-birlestirme-yedek-${new Date().toISOString().slice(0, 10)}.xlsx`, base64: buffer.toString("base64") };
}

export type MergeResult = { error?: string; groups: number; removed: number; contacts: number; deals: number; cards: number };

// Merges each group into its chosen company: people, deals and cards move over, empty fields on the kept
// company are filled from the others, then the duplicates are deleted. Run in small chunks by the caller.
export async function mergeCompanyGroups(selection: MergeSelection[], confirm: string): Promise<MergeResult> {
  await requireAdmin();
  const empty: MergeResult = { groups: 0, removed: 0, contacts: 0, deals: 0, cards: 0 };
  if (confirm.trim().toLocaleLowerCase("tr") !== "birleştir") return { ...empty, error: "Onay için BİRLEŞTİR yazmalısınız." };
  if (selection.length > 25) return { ...empty, error: "Tek seferde en fazla 25 grup birleştirilebilir." };

  const { error, groups } = await resolve(selection);
  if (error) return { ...empty, error };

  const total = { ...empty };
  for (const { sel, primary, others } of groups) {
    const pick = (field: "sector" | "city" | "website" | "phone") =>
      (primary[field] && primary[field]!.trim()) || others.map((o) => o[field]).find((v) => v && v.trim()) || null;
    const extraNotes = others
      .map((o) => (o.notes && o.notes.trim() && o.notes.trim() !== (primary.notes ?? "").trim() ? `— ${o.name}: ${o.notes.trim()}` : ""))
      .filter(Boolean);
    const notes = [primary.notes?.trim(), ...extraNotes].filter(Boolean).join("\n") || null;
    const ids = others.map((o) => o.id);

    const [contacts, deals, cards] = await prisma.$transaction([
      prisma.contact.updateMany({ where: { companyId: { in: ids } }, data: { companyId: primary.id } }),
      prisma.deal.updateMany({ where: { companyId: { in: ids } }, data: { companyId: primary.id } }),
      prisma.workflowCard.updateMany({ where: { companyId: { in: ids } }, data: { companyId: primary.id } }),
      prisma.company.update({
        where: { id: primary.id },
        data: { name: sel.name.trim(), sector: pick("sector"), city: pick("city"), website: pick("website"), phone: pick("phone"), notes },
      }),
      prisma.company.deleteMany({ where: { id: { in: ids } } }),
    ]);
    total.groups += 1;
    total.removed += ids.length;
    total.contacts += contacts.count;
    total.deals += deals.count;
    total.cards += cards.count;
  }

  revalidatePath("/company-analysis");
  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/deals");
  return total;
}
