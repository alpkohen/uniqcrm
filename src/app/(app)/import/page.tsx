import Link from "next/link";
import { PageHeader } from "@/components/ui-helpers";
import { CsvImport } from "@/components/csv-import";
import { CompanyCsvImport } from "@/components/company-csv-import";
import { DealCsvImport } from "@/components/deal-csv-import";

export default function ImportPage() {
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
    </div>
  );
}
