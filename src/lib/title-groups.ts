// Contact.title is free text, so seniority and department are derived from it
// with keyword rules instead of stored columns (no schema change needed).
// Titles are folded to lowercase ASCII first, so every pattern below is written
// without Turkish characters ("müdür" -> "mudur", "ı" -> "i").

export type LevelKey =
  | "csuite"
  | "founder"
  | "director"
  | "manager"
  | "consultant"
  | "specialist"
  | "student"
  | "other"
  | "none";

export type DeptKey =
  | "cx"
  | "hr"
  | "sales"
  | "marketing"
  | "tech"
  | "finance"
  | "ops"
  | "legal"
  | "learning"
  | "exec"
  | "other"
  | "none";

export const LEVELS: { key: LevelKey; label: string; color: string }[] = [
  { key: "csuite", label: "C-Suite & Yönetim Kurulu", color: "#7c3aed" },
  { key: "founder", label: "Kurucu / Ortak", color: "#f59e0b" },
  { key: "director", label: "Direktör / VP", color: "#4f46e5" },
  { key: "manager", label: "Müdür / Yönetici", color: "#2563eb" },
  { key: "consultant", label: "Danışman / Eğitmen", color: "#0d9488" },
  { key: "specialist", label: "Uzman / Analist", color: "#16a34a" },
  { key: "student", label: "Öğrenci / Stajyer", color: "#db2777" },
  { key: "other", label: "Diğer", color: "#64748b" },
  { key: "none", label: "Unvan girilmemiş", color: "#94a3b8" },
];

export const DEPTS: { key: DeptKey; label: string; color: string }[] = [
  { key: "cx", label: "Müşteri Deneyimi / Çağrı Merkezi", color: "#0d9488" },
  { key: "hr", label: "İnsan Kaynakları / Yetenek", color: "#7c3aed" },
  { key: "learning", label: "Eğitim & Gelişim", color: "#db2777" },
  { key: "sales", label: "Satış & İş Geliştirme", color: "#ea580c" },
  { key: "marketing", label: "Pazarlama & İletişim", color: "#f59e0b" },
  { key: "tech", label: "Teknoloji / BT", color: "#2563eb" },
  { key: "finance", label: "Finans & Muhasebe", color: "#16a34a" },
  { key: "ops", label: "Operasyon & Tedarik", color: "#4f46e5" },
  { key: "legal", label: "Hukuk, Risk & Uyum", color: "#be123c" },
  { key: "exec", label: "Genel Yönetim", color: "#475569" },
  { key: "other", label: "Diğer", color: "#64748b" },
  { key: "none", label: "Unvan girilmemiş", color: "#94a3b8" },
];

export const DECISION_LEVELS: ReadonlySet<LevelKey> = new Set<LevelKey>([
  "csuite",
  "founder",
  "director",
  "manager",
]);

const LEVEL_BY_KEY = new Map(LEVELS.map((l) => [l.key, l]));
const DEPT_BY_KEY = new Map(DEPTS.map((d) => [d.key, d]));

export function levelMeta(key: LevelKey) {
  return LEVEL_BY_KEY.get(key)!;
}

export function deptMeta(key: DeptKey) {
  return DEPT_BY_KEY.get(key)!;
}

export function isLevelKey(value: string): value is LevelKey {
  return LEVEL_BY_KEY.has(value as LevelKey);
}

export function isDeptKey(value: string): value is DeptKey {
  return DEPT_BY_KEY.has(value as DeptKey);
}

export function foldTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/̇/g, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

const LEVEL_RULES: [LevelKey, RegExp][] = [
  ["student", /\b(student|ogrenci|stajyer|intern|internship|trainee)\b/],
  // Deputy roles must be checked before C-Suite ("Genel Müdür Yardımcısı" is not a GM).
  [
    "director",
    /\b(vice president|vp|svp|evp|avp)\b|(genel mudur|baskan|ceo)\s+yardimcisi|deputy (general manager|ceo)/,
  ],
  [
    "csuite",
    /\b(ceo|cfo|coo|cto|cmo|cio|chro|cxo|cco|cdo|cpo|cro|chief|president|chairman|chairwoman|baskan|baskani)\b|genel mudur|managing director|general manager|yonetim kurulu|icra kurulu|board (member|of directors)/,
  ],
  [
    "founder",
    /\b(founder|co-?founder|entrepreneur|managing partner|senior partner|general partner)\b|(?<!product |process |data |budget |business |service )\bowner\b|^partner$|kurucu|girisimci|(?<!urun )sahibi\b|\bortagi\b|\bortak\b/,
  ],
  ["director", /\bdirector\b|direktor/],
  [
    "manager",
    /\b(manager|head|lead|leader|supervisor|coordinator|superintendent)\b|mudur|yonetici|\bsef\b|supervizor|koordinator|\blider\b/,
  ],
  [
    "consultant",
    /consult|danisman|\badvis[eo]r\b|\btrainer\b|egitmen|\bkoc\b|coach|mentor|facilitator|konusmaci|speaker/,
  ],
  [
    "specialist",
    /specialist|uzman|analyst|analist|engineer|muhendis|developer|gelistirici|officer|gorevlisi|sorumlu|expert|representative|temsilci|executive|associate|asistan|assistant|designer|tasarimci|accountant|muhasebeci|architect|mimar|technician|teknisyen|programmer|programci|researcher|arastirmaci|planner|memur|\bagent\b|\bstaff\b|\bemployee\b|calisan/,
  ],
];

const DEPT_RULES: [DeptKey, RegExp][] = [
  [
    "cx",
    /\bcx\b|customer|musteri|call cent|contact cent|cagri|iletisim merkezi|help ?desk|destek hizmet/,
  ],
  [
    "hr",
    /human resources|human capital|insan kaynaklari|\bhr\b|\bhrbp\b|\bik\b|talent|yetenek|recruit|ise alim|\bpeople\b|calisan|employee|bordro|payroll|personel|staffing|employer brand|isveren markasi/,
  ],
  [
    "sales",
    /\bsales\b|satis|business development|\bbd\b|biz dev|is gelistirme|account (manager|executive|director)|key account|hesap yonetici|bayi|\bkanal\b|\bchannel\b|ticari|commercial|revenue|pre-?sales|ihracat|\bexport\b/,
  ],
  [
    "tech",
    /\bit\b|\bbt\b|bilgi (teknoloji|islem|sistem)|information (technology|system)|software|yazilim|developer|devops|\bdata\b|\bveri\b|analytics|yapay zeka|artificial|\bai\b|machine learning|siber|cyber|sistem|system|network|\berp\b|\bsap\b|teknoloji|technology|transformation|donusum|automation|otomasyon|\bux\b|\bui\b|product owner/,
  ],
  [
    "marketing",
    /marketing|pazarlama|brand|marka|communication|iletisim|\bpr\b|halkla iliski|digital|dijital|content|icerik|social media|sosyal medya|reklam|advertis|growth|\bseo\b|medya|\bmedia\b|kampanya|campaign/,
  ],
  [
    "finance",
    /financ|finans|muhasebe|accounting|accountant|controller|denetim|audit|butce|budget|treasury|hazine|\bmali\b|vergi|\btax\b|yatirim|investment|tahsilat|collections?/,
  ],
  [
    "ops",
    /operasyon|operation|uretim|production|supply chain|tedarik|lojistik|logistic|satin alma|purchas|procure|kalite|quality|planlama|planning|surec|process|proje|project|\bpmo\b|bakim|maintenance|fabrika|factory|depo|warehouse|insaat|construction|tesis|facility|\bisg\b/,
  ],
  [
    "legal",
    /legal|hukuk|avukat|lawyer|compliance|uyum|\brisk\b|kvkk|gdpr|mevzuat|regulat|counsel|\bdpo\b/,
  ],
  [
    "learning",
    /egitim|training|\btrainer\b|learning|\bl ?& ?d\b|akademi|academy|gelisim|coach|\bkoc\b|egitmen/,
  ],
  [
    "exec",
    /\bceo\b|genel mudur|general manager|yonetim kurulu|\bboard\b|chairman|managing (director|partner)|president|baskan|founder|kurucu|\bowner\b|sahibi|girisimci|entrepreneur|\bortak\b|\bortagi\b|\bchief\b/,
  ],
];

export type TitleClass = { level: LevelKey; dept: DeptKey };

const cache = new Map<string, TitleClass>();

export function classifyTitle(rawTitle: string | null | undefined): TitleClass {
  const raw = rawTitle ?? "";
  const hit = cache.get(raw);
  if (hit) return hit;

  const t = foldTitle(raw);
  let result: TitleClass;
  if (!t) {
    result = { level: "none", dept: "none" };
  } else {
    const level = LEVEL_RULES.find(([, rx]) => rx.test(t))?.[0] ?? "other";
    const dept = DEPT_RULES.find(([, rx]) => rx.test(t))?.[0] ?? "other";
    result = { level, dept };
  }
  cache.set(raw, result);
  return result;
}
