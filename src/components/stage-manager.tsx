"use client";

import { useState } from "react";
import {
  createStage,
  deleteStage,
  moveStage,
  renameStage,
  setStageOutcome,
} from "@/actions/pipelines";
import { Button } from "@/components/ui/button";

type Stage = {
  id: string;
  name: string;
  isWon: boolean;
  isLost: boolean;
  dealCount: number;
};

function outcomeOf(stage: Stage) {
  if (stage.isWon) return "won";
  if (stage.isLost) return "lost";
  return "open";
}

function StageRow({ stage, index, count }: { stage: Stage; index: number; count: number }) {
  const [name, setName] = useState(stage.name);
  const rename = renameStage.bind(null, stage.id);
  const setOutcome = setStageOutcome.bind(null, stage.id);
  const remove = deleteStage.bind(null, stage.id);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2.5">
      <div className="flex gap-1">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => moveStage(stage.id, "up")}
          className="rounded-md border px-1.5 py-0.5 text-xs disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={index === count - 1}
          onClick={() => moveStage(stage.id, "down")}
          className="rounded-md border px-1.5 py-0.5 text-xs disabled:opacity-30"
        >
          ↓
        </button>
      </div>

      <form action={rename} className="flex items-center gap-1.5">
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field-input h-8 w-40"
        />
        <Button type="submit" size="sm" variant="outline">
          Kaydet
        </Button>
      </form>

      <form action={setOutcome} className="flex items-center gap-1.5 text-xs">
        <select
          name="outcome"
          defaultValue={outcomeOf(stage)}
          className="field-select h-8"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="open">Açık</option>
          <option value="won">Kazanıldı</option>
          <option value="lost">Kaybedildi</option>
        </select>
      </form>

      <span className="text-xs text-muted-foreground">{stage.dealCount} fırsat</span>

      <form action={remove} className="ml-auto">
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={stage.dealCount > 0}
          title={stage.dealCount > 0 ? "Önce fırsatları başka aşamaya taşıyın" : undefined}
        >
          Sil
        </Button>
      </form>
    </div>
  );
}

export function StageManager({ pipelineId, stages }: { pipelineId: string; stages: Stage[] }) {
  const addStage = createStage.bind(null, pipelineId);

  return (
    <details className="mt-6 rounded-xl border bg-card p-5">
      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
        Aşamaları yönet
      </summary>
      <div className="mt-4 grid gap-2">
        {stages.map((stage, index) => (
          <StageRow key={stage.id} stage={stage} index={index} count={stages.length} />
        ))}
      </div>
      <form action={addStage} className="mt-3 flex gap-2">
        <input name="name" required placeholder="Yeni aşama adı" className="field-input h-8 w-48" />
        <Button type="submit" size="sm" variant="outline">
          Aşama ekle
        </Button>
      </form>
    </details>
  );
}
