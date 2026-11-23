import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { loadCompanyRows } from "@/lib/company-analysis";
import { buildMergeGroups } from "@/lib/company-merge";
import { listDistinctSectors } from "@/lib/sectors";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { CompanyMergeTool } from "@/components/company-merge-tool";

export default async function CompanyMergePage() {
  await requireAdmin();
  const [rows, sectors] = await Promise.all([loadCompanyRows(), listDistinctSectors()]);
  const groups = buildMergeGroups(rows);

  return (
    <div>
      <PageHeader
        title="Firmaları birleştir"
        description="Aynı firmanın farklı yazımlarını tek kayda indirin. Yalnızca yöneticiler; önizleme, zorunlu yedek ve onay adımı vardır."
        actions={
          <Button render={<Link href="/company-analysis?seg=dup" />} variant="outline" nativeButton={false}>
            Firma Analizi
          </Button>
        }
      />
      {groups.length === 0 ? (
        <EmptyState title="Mükerrer firma yok" description="Aynı görünen firma bulunamadı." />
      ) : (
        <CompanyMergeTool groups={groups} sectors={sectors} />
      )}
    </div>
  );
}
