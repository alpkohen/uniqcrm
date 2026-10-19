import Link from "next/link";
import { PageHeader } from "@/components/ui-helpers";
import { CsvImport } from "@/components/csv-import";
import { CompanyCsvImport } from "@/components/company-csv-import";
import { DealCsvImport } from "@/components/deal-csv-import";
import { DealUpdateImport } from "@/components/deal-update-import";
import { MailOptOutImport } from "@/components/mail-optout-import";
import { TagByEmailImport } from "@/components/tag-by-email-import";
import { DeleteByEmailImport } from "@/components/delete-by-email-import";
import { requireUser } from "@/lib/session";

export default async function ImportPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  return (
    <div className="mx-auto max-w-3xl grid gap-10">
      <div>
        <PageHeader title="İçe aktar" description="Kişi, firma ve fırsat verilerini CSV ile toplu ekleyin." />
        <h2 className="mb-3 text-sm font-medium">Kişiler</h2>
        <CsvImport />
        <p className="mt-4 text-xs text-muted-foreground">
          Örnek dosya:{" "}
          <Link href="/sample-contacts.csv" className="underline">
            sample-contacts.csv
          </Link>
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Firmalar</h2>
        <CompanyCsvImport />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Fırsatlar</h2>
        <DealCsvImport />
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium">Fırsatları güncelle (Nimble dışa aktarımı)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Mevcut fırsatları silmeden kayıp nedeni ve tarihleri işler. Önce önizleme gösterir, onaylayınca uygular.
        </p>
        <DealUpdateImport />
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium">Mail tercihi (Nimble kişi dışa aktarımı)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          “Mail almak istemiyor” işaretli kişileri CRM’de de işaretler. Önce önizleme gösterir.
        </p>
        <MailOptOutImport />
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium">E-posta listesinden etiket ekle</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Örn. doğrulama sonucu “risky” çıkan adreslere risky etiketi ekler. Önce önizleme gösterir.
        </p>
        <TagByEmailImport />
      </div>

      {isAdmin ? (
        <div>
          <h2 className="mb-1 text-sm font-medium text-destructive">E-posta listesinden kişi sil</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Yalnızca yöneticiler. Geri alınamaz; önizleme ve zorunlu yedek adımı vardır.
          </p>
          <DeleteByEmailImport />
        </div>
      ) : null}
    </div>
  );
}
