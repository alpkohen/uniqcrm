import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(days: number, hours = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date;
}

async function main() {
  await prisma.workflowCard.deleteMany();
  await prisma.workflowColumn.deleteMany();
  await prisma.workflowBoard.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.task.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.contactTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.customField.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Uniq2026!", 10);

  const ayse = await prisma.user.create({
    data: {
      email: "ayse@uniq.com.tr",
      name: "Ayşe Yılmaz",
      passwordHash,
      role: "ADMIN",
    },
  });

  const mehmet = await prisma.user.create({
    data: {
      email: "mehmet@uniq.com.tr",
      name: "Mehmet Demir",
      passwordHash,
      role: "MEMBER",
    },
  });

  const tags = await prisma.$transaction([
    prisma.tag.create({ data: { name: "VIP", color: "#b45309" } }),
    prisma.tag.create({ data: { name: "Mevcut müşteri", color: "#0f766e" } }),
    prisma.tag.create({ data: { name: "Teklif", color: "#1d4ed8" } }),
    prisma.tag.create({ data: { name: "C-Level", color: "#7c3aed" } }),
    prisma.tag.create({ data: { name: "L&D", color: "#be185d" } }),
    prisma.tag.create({ data: { name: "Soğuk lead", color: "#64748b" } }),
    prisma.tag.create({ data: { name: "Telco", color: "#0e7490" } }),
    prisma.tag.create({ data: { name: "Bankacılık", color: "#1e3a8a" } }),
  ]);

  const tag = Object.fromEntries(tags.map((item) => [item.name, item.id]));

  await prisma.customField.createMany({
    data: [
      {
        key: "kaynak",
        label: "Kaynak",
        type: "SELECT",
        options: JSON.stringify(["LinkedIn", "Referans", "Etkinlik", "Nimble"]),
        sortOrder: 1,
      },
      {
        key: "egitim_ilgisi",
        label: "Eğitim ilgisi",
        type: "SELECT",
        options: JSON.stringify(["Liderlik", "Satış", "İletişim", "Dijital dönüşüm"]),
        sortOrder: 2,
      },
      {
        key: "dil",
        label: "Tercih edilen dil",
        type: "SELECT",
        options: JSON.stringify(["Türkçe", "İngilizce"]),
        sortOrder: 3,
      },
      {
        key: "son_iletisim",
        label: "Son iletişim",
        type: "DATE",
        sortOrder: 4,
      },
    ],
  });

  const companies = await prisma.$transaction([
    prisma.company.create({
      data: {
        name: "Türkiye İş Bankası",
        website: "https://www.isbank.com.tr",
        phone: "0850 724 0 724",
        city: "İstanbul",
        sector: "Bankacılık",
        notes: "Kurumsal akademi ile yıllık liderlik programı görüşülüyor.",
        ownerId: ayse.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Turkcell",
        website: "https://www.turkcell.com.tr",
        city: "İstanbul",
        sector: "Telekomünikasyon",
        notes: "Saha satış ekipleri için iletişim eğitimi.",
        ownerId: mehmet.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Türk Hava Yolları",
        website: "https://www.thy.com",
        city: "İstanbul",
        sector: "Havacılık",
        notes: "Kabin ve yer işletme yöneticileri için liderlik.",
        ownerId: ayse.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Arçelik",
        website: "https://www.arcelik.com.tr",
        city: "İstanbul",
        sector: "Üretim",
        ownerId: mehmet.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Koç Holding",
        website: "https://www.koc.com.tr",
        city: "İstanbul",
        sector: "Holding",
        notes: "Grup şirketleri için ortak satış akademisi.",
        ownerId: ayse.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Akbank",
        website: "https://www.akbank.com",
        city: "İstanbul",
        sector: "Bankacılık",
        ownerId: mehmet.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Vodafone Türkiye",
        website: "https://www.vodafone.com.tr",
        city: "İstanbul",
        sector: "Telekomünikasyon",
        ownerId: ayse.id,
      },
    }),
    prisma.company.create({
      data: {
        name: "Eczacıbaşı Holding",
        website: "https://www.eczacibasi.com.tr",
        city: "İstanbul",
        sector: "Holding",
        ownerId: mehmet.id,
      },
    }),
  ]);

  const [isBank, turkcell, thy, arcelik, koc, akbank, vodafone, eczacibasi] =
    companies;

  async function contact(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
    city?: string;
    companyId?: string;
    ownerId: string;
    custom?: Record<string, string>;
    tags?: string[];
  }) {
    return prisma.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        title: data.title,
        city: data.city ?? "İstanbul",
        companyId: data.companyId,
        ownerId: data.ownerId,
        customData: JSON.stringify(data.custom ?? {}),
        tags: data.tags
          ? { create: data.tags.map((name) => ({ tagId: tag[name] })) }
          : undefined,
      },
    });
  }

  const c1 = await contact({
    firstName: "Selin",
    lastName: "Acar",
    email: "selin.acar@isbank.com.tr",
    phone: "0532 111 22 01",
    title: "Öğrenme ve Gelişim Müdürü",
    companyId: isBank.id,
    ownerId: ayse.id,
    custom: {
      kaynak: "Referans",
      egitim_ilgisi: "Liderlik",
      dil: "Türkçe",
      son_iletisim: "2026-09-04",
    },
    tags: ["VIP", "Mevcut müşteri", "L&D", "Bankacılık"],
  });

  const c2 = await contact({
    firstName: "Burak",
    lastName: "Şahin",
    email: "burak.sahin@isbank.com.tr",
    title: "İnsan Kaynakları Direktörü",
    companyId: isBank.id,
    ownerId: ayse.id,
    custom: { kaynak: "Nimble", egitim_ilgisi: "Liderlik", dil: "Türkçe" },
    tags: ["C-Level", "Bankacılık"],
  });

  const c3 = await contact({
    firstName: "Deniz",
    lastName: "Koç",
    email: "deniz.koc@turkcell.com.tr",
    phone: "0533 200 10 20",
    title: "Satış Akademisi Lideri",
    companyId: turkcell.id,
    ownerId: mehmet.id,
    custom: { kaynak: "LinkedIn", egitim_ilgisi: "Satış", dil: "Türkçe" },
    tags: ["Teklif", "L&D", "Telco"],
  });

  const c4 = await contact({
    firstName: "Ece",
    lastName: "Yurt",
    email: "ece.yurt@thy.com",
    title: "Kabin Hizmetleri Eğitim Müdürü",
    companyId: thy.id,
    ownerId: ayse.id,
    custom: { kaynak: "Etkinlik", egitim_ilgisi: "İletişim", dil: "İngilizce" },
    tags: ["VIP", "Teklif"],
  });

  const c5 = await contact({
    firstName: "Hakan",
    lastName: "Polat",
    email: "hakan.polat@arcelik.com",
    title: "İK İş Ortağı",
    companyId: arcelik.id,
    ownerId: mehmet.id,
    custom: { kaynak: "Nimble", egitim_ilgisi: "Dijital dönüşüm" },
    tags: ["Soğuk lead"],
  });

  const c6 = await contact({
    firstName: "İpek",
    lastName: "Erdem",
    email: "ipek.erdem@koc.com.tr",
    title: "Grup L&D Direktörü",
    companyId: koc.id,
    ownerId: ayse.id,
    custom: { kaynak: "Referans", egitim_ilgisi: "Liderlik", dil: "İngilizce" },
    tags: ["VIP", "C-Level", "L&D"],
  });

  const c7 = await contact({
    firstName: "Onur",
    lastName: "Kılıç",
    email: "onur.kilic@akbank.com",
    title: "Şube Satış Koordinatörü",
    companyId: akbank.id,
    ownerId: mehmet.id,
    custom: { kaynak: "LinkedIn", egitim_ilgisi: "Satış" },
    tags: ["Teklif", "Bankacılık"],
  });

  const c8 = await contact({
    firstName: "Melis",
    lastName: "Arslan",
    email: "melis.arslan@vodafone.com",
    title: "People Development Manager",
    companyId: vodafone.id,
    ownerId: ayse.id,
    custom: { kaynak: "Etkinlik", egitim_ilgisi: "İletişim", dil: "İngilizce" },
    tags: ["Telco", "L&D"],
  });

  const c9 = await contact({
    firstName: "Cem",
    lastName: "Öztürk",
    email: "cem.ozturk@eczacibasi.com.tr",
    title: "Genel Müdür Yardımcısı",
    companyId: eczacibasi.id,
    ownerId: mehmet.id,
    custom: { kaynak: "Referans", egitim_ilgisi: "Liderlik" },
    tags: ["C-Level"],
  });

  await contact({
    firstName: "Zeynep",
    lastName: "Aksoy",
    email: "zeynep.aksoy@isbank.com.tr",
    title: "Bölge Müdürü",
    companyId: isBank.id,
    ownerId: ayse.id,
    tags: ["Mevcut müşteri", "Bankacılık"],
  });

  await contact({
    firstName: "Emre",
    lastName: "Çetin",
    email: "emre.cetin@turkcell.com.tr",
    title: "Saha Satış Müdürü",
    companyId: turkcell.id,
    ownerId: mehmet.id,
    tags: ["Telco"],
  });

  await contact({
    firstName: "Gül",
    lastName: "Karaca",
    email: "gul.karaca@thy.com",
    title: "Yer İşletme Eğitim Uzmanı",
    companyId: thy.id,
    ownerId: ayse.id,
    tags: ["Soğuk lead"],
  });

  await prisma.activity.createMany({
    data: [
      {
        type: "NOTE",
        title: "Nimble aktarımı",
        body: "Eski Nimble kaydından taşındı. 2025 liderlik programı tamamlandı, 2026 yenileme bekleniyor.",
        contactId: c1.id,
        ownerId: ayse.id,
      },
      {
        type: "CALL",
        title: "Keşif araması",
        body: "Q4 için 3 grup orta kademe liderlik programı talep etti. Bütçe onayı Eylül sonunda.",
        contactId: c1.id,
        ownerId: ayse.id,
      },
      {
        type: "MEETING",
        title: "Akademi ihtiyaç toplantısı",
        body: "İhtiyaç analizi sunuldu. Katılımcı profili: şube müdürleri.",
        contactId: c2.id,
        ownerId: ayse.id,
      },
      {
        type: "CALL",
        title: "Teklif takibi",
        body: "Satış akademisi 2 günlük program fiyatını bekliyor.",
        contactId: c3.id,
        ownerId: mehmet.id,
      },
      {
        type: "NOTE",
        title: "THY eğitim takvimi",
        body: "Kasım-Aralık kabin yöneticileri için iletişim atölyesi uygun.",
        contactId: c4.id,
        ownerId: ayse.id,
      },
    ],
  });

  await prisma.task.createMany({
    data: [
      {
        title: "İş Bankası teklifini gönder",
        description: "3 grup liderlik + 1 yönetici koçluğu paketi.",
        dueAt: daysFromNow(-6, 17),
        contactId: c1.id,
        ownerId: ayse.id,
      },
      {
        title: "Turkcell referans mektubunu iste",
        dueAt: daysFromNow(-2, 12),
        contactId: c3.id,
        ownerId: mehmet.id,
      },
      {
        title: "Koç Holding keşif notlarını yaz",
        dueAt: daysFromNow(0, 16),
        contactId: c6.id,
        ownerId: ayse.id,
      },
      {
        title: "THY katılımcı listesini al",
        dueAt: daysFromNow(1, 11),
        contactId: c4.id,
        ownerId: ayse.id,
      },
      {
        title: "Akbank demo oturumu planla",
        dueAt: daysFromNow(3, 14),
        contactId: c7.id,
        ownerId: mehmet.id,
      },
      {
        title: "Vodafone İngilizce içerik uyarlaması",
        dueAt: daysFromNow(4, 10),
        contactId: c8.id,
        ownerId: ayse.id,
      },
      {
        title: "Arçelik soğuk lead takip maili",
        dueAt: daysFromNow(8, 9),
        contactId: c5.id,
        ownerId: mehmet.id,
        completedAt: daysFromNow(-1, 15),
      },
    ],
  });

  await prisma.meeting.createMany({
    data: [
      {
        title: "İş Bankası — Q4 program kapsamı",
        notes: "Levent ofis, 8. kat toplantı salonu.",
        startsAt: daysFromNow(1, 10),
        location: "İş Kuleleri, Levent",
        contactId: c1.id,
        ownerId: ayse.id,
      },
      {
        title: "Koç Holding satış akademisi keşif",
        startsAt: daysFromNow(2, 14),
        location: "Nakkaştepe",
        contactId: c6.id,
        ownerId: ayse.id,
      },
      {
        title: "Turkcell teklif sunumu",
        startsAt: daysFromNow(4, 11),
        location: "Küçükyalı Plaza / çevrimiçi",
        contactId: c3.id,
        ownerId: mehmet.id,
      },
      {
        title: "Eczacıbaşı üst yönetim brifingi",
        startsAt: daysFromNow(9, 15),
        location: "Levent",
        contactId: c9.id,
        ownerId: mehmet.id,
      },
    ],
  });

  const pipeline = await prisma.pipeline.create({
    data: {
      name: "Satış hunisi",
      stages: {
        create: [
          { name: "Keşif", sortOrder: 1, color: "#64748b" },
          { name: "Teklif", sortOrder: 2, color: "#2563eb" },
          { name: "Müzakere", sortOrder: 3, color: "#d97706" },
          { name: "Kazanıldı", sortOrder: 4, color: "#0f766e", isWon: true },
          { name: "Kaybedildi", sortOrder: 5, color: "#be123c", isLost: true },
        ],
      },
    },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });

  const [kesif, teklif, muzakere, kazanildi, kaybedildi] = pipeline.stages;

  await prisma.deal.createMany({
    data: [
      {
        title: "İş Bankası orta kademe liderlik — 3 grup",
        amount: 420000,
        pipelineId: pipeline.id,
        stageId: muzakere.id,
        contactId: c1.id,
        companyId: isBank.id,
        ownerId: ayse.id,
      },
      {
        title: "Turkcell saha satış iletişimi",
        amount: 185000,
        pipelineId: pipeline.id,
        stageId: teklif.id,
        contactId: c3.id,
        companyId: turkcell.id,
        ownerId: mehmet.id,
      },
      {
        title: "THY kabin yöneticileri atölyesi",
        amount: 260000,
        pipelineId: pipeline.id,
        stageId: kesif.id,
        contactId: c4.id,
        companyId: thy.id,
        ownerId: ayse.id,
      },
      {
        title: "Koç Holding satış akademisi",
        amount: 750000,
        pipelineId: pipeline.id,
        stageId: kesif.id,
        contactId: c6.id,
        companyId: koc.id,
        ownerId: ayse.id,
      },
      {
        title: "Akbank şube satış programı",
        amount: 310000,
        pipelineId: pipeline.id,
        stageId: teklif.id,
        contactId: c7.id,
        companyId: akbank.id,
        ownerId: mehmet.id,
      },
      {
        title: "Vodafone people development",
        amount: 140000,
        pipelineId: pipeline.id,
        stageId: muzakere.id,
        contactId: c8.id,
        companyId: vodafone.id,
        ownerId: ayse.id,
      },
      {
        title: "Arçelik dijital liderlik (2025)",
        amount: 95000,
        status: "LOST",
        pipelineId: pipeline.id,
        stageId: kaybedildi.id,
        contactId: c5.id,
        companyId: arcelik.id,
        ownerId: mehmet.id,
      },
      {
        title: "Eczacıbaşı üst yönetim offsite",
        amount: 220000,
        status: "WON",
        pipelineId: pipeline.id,
        stageId: kazanildi.id,
        contactId: c9.id,
        companyId: eczacibasi.id,
        ownerId: mehmet.id,
      },
    ],
  });

  const leadBoard = await prisma.workflowBoard.create({
    data: {
      name: "Lead",
      description: "Yeni taleplerin nitelendirilmesi ve ilk görüşmeye taşınması.",
      columns: {
        create: [
          { name: "Yeni", sortOrder: 1, color: "#94a3b8" },
          { name: "Nitelendirme", sortOrder: 2, color: "#2563eb" },
          { name: "İlk görüşme", sortOrder: 3, color: "#d97706" },
          { name: "Teklif", sortOrder: 4, color: "#7c3aed" },
          { name: "Takip", sortOrder: 5, color: "#0f766e" },
        ],
      },
    },
    include: { columns: { orderBy: { sortOrder: "asc" } } },
  });

  const travelBoard = await prisma.workflowBoard.create({
    data: {
      name: "Seyahat",
      description: "Eğitmen ve katılımcı seyahat / lojistik takibi.",
      columns: {
        create: [
          { name: "Talep", sortOrder: 1, color: "#94a3b8" },
          { name: "Onay", sortOrder: 2, color: "#2563eb" },
          { name: "Rezervasyon", sortOrder: 3, color: "#d97706" },
          { name: "Seyahat", sortOrder: 4, color: "#7c3aed" },
          { name: "Tamamlandı", sortOrder: 5, color: "#0f766e" },
        ],
      },
    },
    include: { columns: { orderBy: { sortOrder: "asc" } } },
  });

  const [yeni, nitelendirme, ilkGorusme, teklifCol] = leadBoard.columns;
  const [talep, onay, rezervasyon] = travelBoard.columns;

  await prisma.workflowCard.createMany({
    data: [
      {
        boardId: leadBoard.id,
        columnId: yeni.id,
        title: "Arçelik — dijital liderlik yeniden açılış",
        notes: "2025 kaybından sonra yeni IK iş ortağı ile temas.",
        contactId: c5.id,
        companyId: arcelik.id,
        ownerId: mehmet.id,
        sortOrder: 1,
      },
      {
        boardId: leadBoard.id,
        columnId: nitelendirme.id,
        title: "THY yer işletme eğitimi",
        contactId: c4.id,
        companyId: thy.id,
        ownerId: ayse.id,
        sortOrder: 1,
      },
      {
        boardId: leadBoard.id,
        columnId: ilkGorusme.id,
        title: "Koç Holding grup akademisi",
        contactId: c6.id,
        companyId: koc.id,
        ownerId: ayse.id,
        sortOrder: 1,
      },
      {
        boardId: leadBoard.id,
        columnId: teklifCol.id,
        title: "Turkcell saha satış",
        contactId: c3.id,
        companyId: turkcell.id,
        ownerId: mehmet.id,
        sortOrder: 1,
      },
      {
        boardId: travelBoard.id,
        columnId: talep.id,
        title: "Ankara — Akbank şube eğitimi seyahati",
        notes: "2 eğitmen, 1 gece otel.",
        contactId: c7.id,
        companyId: akbank.id,
        ownerId: mehmet.id,
        sortOrder: 1,
      },
      {
        boardId: travelBoard.id,
        columnId: onay.id,
        title: "İzmir — Vodafone saha günü",
        contactId: c8.id,
        companyId: vodafone.id,
        ownerId: ayse.id,
        sortOrder: 1,
      },
      {
        boardId: travelBoard.id,
        columnId: rezervasyon.id,
        title: "Antalya — Eczacıbaşı offsite lojistik",
        contactId: c9.id,
        companyId: eczacibasi.id,
        ownerId: mehmet.id,
        sortOrder: 1,
      },
    ],
  });

  console.log("Uniq CRM seed tamamlandı.");
  console.log("Giriş: ayse@uniq.com.tr / Uniq2026!  (yönetici)");
  console.log("Giriş: mehmet@uniq.com.tr / Uniq2026!  (üye)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
