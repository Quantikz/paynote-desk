import { Link } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  to = "/",
  subtitle,
}: {
  className?: string;
  to?: "/" | "/manage";
  subtitle?: string;
}) {
  return (
    <Link to={to} className={cn("flex items-center gap-2 text-foreground", className)}>
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <Receipt className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="font-display block text-xl tracking-tight italic">Paynote</span>
        {subtitle ? <span className="block text-[10px] tracking-[0.16em] text-muted-foreground uppercase">{subtitle}</span> : null}
      </span>
    </Link>
  );
}
