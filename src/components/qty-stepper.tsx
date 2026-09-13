import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QtyStepper({
  value,
  min = 0,
  max,
  onChange,
  className,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-md border border-border bg-card",
        className,
      )}
    >
      <button
        type="button"
        className="grid size-11 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-6 text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        className="grid size-11 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
