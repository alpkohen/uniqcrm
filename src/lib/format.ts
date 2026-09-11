import { format, isPast, isToday, isTomorrow, startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";

export function formatTry(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "d MMM yyyy", { locale: tr });
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "d MMM yyyy HH:mm", { locale: tr });
}

export function formatShortDate(date: Date | string) {
  return format(new Date(date), "d MMM", { locale: tr });
}

export function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export function roleLabel(role: string) {
  return role === "ADMIN" ? "Yönetici" : "Üye";
}

export function activityLabel(type: string) {
  switch (type) {
    case "CALL":
      return "Arama";
    case "MEETING":
      return "Toplantı";
    case "TASK":
      return "Görev";
    default:
      return "Not";
  }
}

export function dealStatusLabel(status: string) {
  switch (status) {
    case "WON":
      return "Kazanıldı";
    case "LOST":
      return "Kaybedildi";
    default:
      return "Açık";
  }
}

export function dueLabel(date: Date) {
  if (isToday(date)) return "Bugün";
  if (isTomorrow(date)) return "Yarın";
  return formatDate(date);
}

export function isOverdue(date: Date, completedAt: Date | null) {
  return !completedAt && isPast(date) && !isToday(date);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function thisWeekRange(now = new Date()) {
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}
