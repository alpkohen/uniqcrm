export const PAGE_SIZE = 25;

export const ROLES = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ACTIVITY_TYPES = [
  { value: "NOTE", label: "Not" },
  { value: "CALL", label: "Arama" },
  { value: "MEETING", label: "Toplantı" },
  { value: "TASK", label: "Görev" },
] as const;

export const FIELD_TYPES = [
  { value: "TEXT", label: "Metin" },
  { value: "NUMBER", label: "Sayı" },
  { value: "DATE", label: "Tarih" },
  { value: "SELECT", label: "Seçim" },
  { value: "BOOLEAN", label: "Evet / Hayır" },
] as const;

export const DEAL_STATUS = {
  OPEN: "OPEN",
  WON: "WON",
  LOST: "LOST",
} as const;

export const SESSION_COOKIE = "uniq_session";
