import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { useShop } from "@/lib/market-hooks";
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
  const shop = useShop();
  return (
    <Link to={to} className={cn("flex min-w-0 items-center gap-2.5 text-foreground", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <Leaf className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="font-display block truncate text-xl tracking-tight italic">{shop.name}</span>
        {subtitle ? (
          <span className="block text-xs tracking-[0.16em] text-muted-foreground uppercase">{subtitle}</span>
        ) : shop.tagline ? (
          <span className="hidden truncate text-xs tracking-[0.04em] text-muted-foreground sm:block">
            {shop.tagline}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
