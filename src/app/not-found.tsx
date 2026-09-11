import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="text-sm text-muted-foreground">Bu kayıt silinmiş veya adres hatalı olabilir.</p>
      <Button render={<Link href="/" />} nativeButton={false}>Özete dön</Button>
    </div>
  );
}
