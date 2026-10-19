"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { listSectorOptions, quickCreateCompany } from "@/actions/quick-company";
import { SearchSelect, type SearchOption } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Company picker for the contact form: search existing companies, or create a new one (name + sector) without leaving the page.
export function CompanySelect({
  name = "companyId",
  defaultValue,
}: {
  name?: string;
  defaultValue?: SearchOption | null;
}) {
  const apply = useRef<((option: SearchOption) => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<SearchOption | null>(null);
  const [busy, setBusy] = useState(false);

  function begin(query: string, done: (option: SearchOption) => void) {
    apply.current = done;
    setCompanyName(query);
    setSector("");
    setCity("");
    setWebsite("");
    setPhone("");
    setError(null);
    setExisting(null);
    setOpen(true);
    listSectorOptions()
      .then(setSectors)
      .catch(() => setSectors([]));
  }

  function close() {
    if (busy) return;
    setOpen(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setExisting(null);
    try {
      const result = await quickCreateCompany({ name: companyName, sector, city, website, phone });
      if (result.ok) {
        apply.current?.({ id: result.company.id, label: result.company.name });
        toast.success(`Firma oluşturuldu: ${result.company.name}`);
        setOpen(false);
      } else {
        setError(result.error);
        if (result.existing) setExisting({ id: result.existing.id, label: result.existing.name });
      }
    } catch {
      setError("Firma oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  // Enter in a field saves instead of submitting the surrounding contact form.
  function onEnter(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    }
  }

  return (
    <>
      <SearchSelect
        name={name}
        searchUrl="/api/companies/search"
        placeholder="Firma ara veya yeni firma yaz..."
        defaultValue={defaultValue}
        createOption={{ label: (query) => `“${query}” firmasını oluştur`, onSelect: begin }}
      />

      <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni firma</DialogTitle>
            <DialogDescription>Firma kaydedilir ve bu kişiye bağlanır. Sektör zorunludur.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <label className="grid gap-1.5">
              <span className="font-medium">Firma adı</span>
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                onKeyDown={onEnter}
                className="field-input"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="font-medium">Sektör</span>
              <input
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                onKeyDown={onEnter}
                list="quick-company-sectors"
                placeholder="Seçin veya yazın"
                className="field-input"
                autoFocus
              />
              <datalist id="quick-company-sectors">
                {sectors.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1.5">
                <span className="font-medium">Şehir</span>
                <input value={city} onChange={(event) => setCity(event.target.value)} onKeyDown={onEnter} className="field-input" />
              </label>
              <label className="grid gap-1.5">
                <span className="font-medium">Web</span>
                <input value={website} onChange={(event) => setWebsite(event.target.value)} onKeyDown={onEnter} className="field-input" />
              </label>
              <label className="grid gap-1.5">
                <span className="font-medium">Telefon</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} onKeyDown={onEnter} className="field-input" />
              </label>
            </div>
            {error ? (
              <div className="grid gap-2">
                <p className="text-xs text-destructive">{error}</p>
                {existing ? (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        apply.current?.(existing);
                        setOpen(false);
                      }}
                    >
                      Mevcut firmayı seç: {existing.label}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={busy}>
              Vazgeç
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? "Kaydediliyor…" : "Firmayı oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
