import "server-only";

import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { normalizeCompanyName } from "@/lib/company-name";

// The training log lives in the "data" tab of the "Data Analiz" Google Sheet. The sheet is
// shared by link, so its CSV export can be read without a Google login. It is fetched fresh
// on every page view, so edits in the sheet show up on the next refresh.
// The sheet id comes from the environment only: this repository is public and the sheet holds
// revenue data, so its link must not be committed.
export function trainingSheetId() {
  return process.env.TRAINING_SHEET_ID?.trim() || null;
}

export function trainingSheetEditUrl() {
  const id = trainingSheetId();
  return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : null;
}

export const FIRST_YEAR = 2020;
export const EMPTY = "__empty";

export type TrainingRow = {
  year: number;
  company: string;
  days: number;
  statu: string;
  durum: string;
  icerik: string;
  hizmet: string;
};

export const FILTER_DEFS = [
  { key: "statu", label: "Statü", column: "STATÜ" },
  { key: "durum", label: "Durum", column: "DURUM" },
  { key: "icerik", label: "İçerik", column: "İÇERİK" },
  { key: "hizmet", label: "Hizmet", column: "HİZMET" },
] as const;

export type FilterKey = (typeof FILTER_DEFS)[number]["key"];
export type TrainingFilters = Record<FilterKey, string[]>;

function clean(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toLocaleUpperCase("tr-TR");
}

// Sheet numbers are Turkish formatted: "1.568,5" -> 1568.5, "2,0" -> 2.
function trNumber(value: string | undefined) {
  const s = (value ?? "").trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function loadTrainingRows(): Promise<TrainingRow[]> {
  const id = trainingSheetId();
  if (!id) throw new Error("TRAINING_SHEET_ID ortam değişkeni tanımlı değil (Data Analiz tablosunun kimliği).");
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?format=csv&gid=0`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Google Sheets verisi alınamadı (HTTP ${res.status})`);
  const text = await res.text();
  if (!text.startsWith("YIL")) throw new Error("Google Sheets verisi beklenen biçimde değil (paylaşım ayarı değişmiş olabilir)");

  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const out: TrainingRow[] = [];
  for (const r of parsed.data) {
    const year = Number((r["YIL"] ?? "").trim());
    const company = (r["ŞİRKET ADI"] ?? "").replace(/\s+/g, " ").trim();
    if (!Number.isInteger(year) || !company) continue;
    out.push({
      year,
      company,
      // "BI için Gün Sayısı" is the column the UNIQ dashboard counts; it is 0 for cancelled rows.
      days: trNumber(r["BI için Gün Sayısı"]),
      statu: clean(r["STATÜ"]),
      durum: clean(r["DURUM"]),
      icerik: clean(r["İÇERİK"]),
      hizmet: clean(r["HİZMET"]),
    });
  }
  return out;
}

type RawParams = Record<string, string | string[] | undefined>;

export function parseTrainingFilters(params: RawParams): TrainingFilters {
  const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
  return {
    statu: list(params.statu),
    durum: list(params.durum),
    icerik: list(params.icerik),
    hizmet: list(params.hizmet),
  };
}

const valueOf = (row: TrainingRow, key: FilterKey) => row[key] || EMPTY;

export function filterOptions(rows: TrainingRow[]) {
  const opts = {} as Record<FilterKey, { value: string; label: string; count: number }[]>;
  for (const def of FILTER_DEFS) {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(valueOf(r, def.key), (counts.get(valueOf(r, def.key)) ?? 0) + 1);
    opts[def.key] = [...counts.entries()]
      .map(([value, count]) => ({ value, label: value === EMPTY ? "(Boş)" : value, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "tr"));
  }
  return opts;
}

export type CompanyYearRow = { company: string; byYear: number[]; total: number; crmId: string | null };

export function buildMatrix(rows: TrainingRow[], f: TrainingFilters, lastYear: number) {
  const years: number[] = [];
  for (let y = FIRST_YEAR; y <= lastYear; y++) years.push(y);

  const map = new Map<string, number[]>();
  let rowCount = 0;
  for (const r of rows) {
    if (r.year < FIRST_YEAR || r.year > lastYear) continue;
    if (FILTER_DEFS.some((d) => f[d.key].length > 0 && !f[d.key].includes(valueOf(r, d.key)))) continue;
    rowCount += 1;
    const cells = map.get(r.company) ?? years.map(() => 0);
    cells[r.year - FIRST_YEAR] += r.days;
    map.set(r.company, cells);
  }

  const companies: CompanyYearRow[] = [...map.entries()].map(([company, byYear]) => ({
    company,
    byYear,
    total: byYear.reduce((a, b) => a + b, 0),
    crmId: null,
  }));
  const yearTotals = years.map((_, i) => companies.reduce((s, c) => s + c.byYear[i], 0));
  const grandTotal = yearTotals.reduce((a, b) => a + b, 0);
  return { years, companies, yearTotals, grandTotal, rowCount };
}

// Links each sheet company to the CRM company with the same normalized name, when there is one.
export async function attachCrmIds(rows: CompanyYearRow[]) {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const byKey = new Map<string, string>();
  for (const c of companies) {
    const key = normalizeCompanyName(c.name);
    if (key && !byKey.has(key)) byKey.set(key, c.id);
  }
  for (const row of rows) row.crmId = byKey.get(normalizeCompanyName(row.company)) ?? null;
}
