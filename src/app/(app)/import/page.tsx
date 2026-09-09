import Link from "next/link";
import { PageHeader } from "@/components/ui-helpers";
import { CsvImport } from "@/components/csv-import";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="İçe aktar"
        description="Nimble kişi dışa aktarımı (CSV). Fırsat aktarımı sonraki sprint."
      />
      <CsvImport />
      <p className="mt-4 text-xs text-muted-foreground">
        Örnek dosya:{" "}
        <Link href="/sample-contacts.csv" className="underline">
          sample-contacts.csv
        </Link>
      </p>
      <div className="mt-8 rounded-xl border bg-muted/40 p-5">
        <h2 className="text-sm font-medium">Fırsat CSV (yakında)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deal pipeline aktarımı henüz açık değil. Kişi aktarımı çalışır; fırsatlar
          şimdilik uygulama içinden eklenir.
        </p>
      </div>
    </div>
  );
}
