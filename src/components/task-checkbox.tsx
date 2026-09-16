"use client";

import { useState, useTransition } from "react";
import { toggleTask } from "@/actions/activities";
import { cn } from "cn";

export function TaskCheckbox({ taskId, completed: initialCompleted }: { taskId: string; completed: boolean }) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        setCompleted((prev) => !prev);
        startTransition(async () => {
          try {
            await toggleTask(taskId);
          } catch {
            setCompleted((prev) => !prev);
          }
        });
      }}
      className={cn("mt-0.5 size-4 rounded border", completed ? "bg-primary" : "bg-background")}
      aria-label="Tamamlandı olarak işaretle"
    />
  );
}
