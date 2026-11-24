import "server-only";

// The same code runs two separate CRMs: UNIQ (default) and RAISE, each with its own database and
// Netlify site. APP_BRAND picks the name shown in the app and switches off what is UNIQ-only.
export type BrandKey = "uniq" | "raise";

export function brandKey(): BrandKey {
  return process.env.APP_BRAND?.trim().toLowerCase() === "raise" ? "raise" : "uniq";
}

export function brand() {
  const key = brandKey();
  if (key === "raise") {
    return {
      key,
      name: "RAISE",
      title: "RAISE CRM",
      description: "RAISE iç CRM ve saha satış uygulaması",
      logo: null as string | null,
      tagline: "RAISE ekibine özel CRM. Hedef firmalar, kişiler, fırsatlar ve görevler tek ekranda.",
      footer: "RAISE · Yapay zekâ eğitimleri · İç kullanım",
    };
  }
  return {
    key,
    name: "UNIQ",
    title: "Uniq CRM",
    description: "Uniq iç CRM ve saha satış uygulaması",
    logo: "/uniq-logo-white.png" as string | null,
    tagline:
      "UNIQ ekibine özel CRM. Kişiler, firmalar, fırsatlar, iş akışları ve görevler tek ekranda; her kayıt güncel ve ekibin erişiminde.",
    footer: "UNIQ Eğitim ve Danışmanlık · İç kullanım",
  };
}

// UNIQ-only features. Training history needs the Data Analiz sheet; RAISE targets are picked in UNIQ.
export const features = {
  trainingHistory: () => brandKey() === "uniq" && Boolean(process.env.TRAINING_SHEET_ID?.trim()),
  raiseTargets: () => brandKey() === "uniq",
};
