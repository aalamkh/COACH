"use client";

import { useRouter } from "next/navigation";

export interface TaskOption {
  taskId: number;
  label: string;
}

interface Props {
  value: string;
  taskOptions: TaskOption[];
}

export function NotesFilterSelect({ value, taskOptions }: Props) {
  const router = useRouter();
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        router.push(next === "all" ? "/notes" : `/notes?filter=${encodeURIComponent(next)}`);
      }}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-auto"
      aria-label="Filter notes"
    >
      <option value="all">All notes</option>
      <option value="week">This week</option>
      {taskOptions.length > 0 ? (
        <optgroup label="Per task">
          {taskOptions.map((t) => (
            <option key={t.taskId} value={`task-${t.taskId}`}>
              {t.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}
