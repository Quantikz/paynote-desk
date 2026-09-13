import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardList,
  LayoutDashboard,
  Lock,
  Package,
  QrCode,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";
import { CartDrawer } from "@/components/cart-drawer";
import { LiveShelfChip } from "@/components/live-shelf";
import { SearchDialog } from "@/components/search-dialog";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { useCartCount, useShop } from "@/lib/market-hooks";
import { clearStaffSession, staffMsLeft } from "@/lib/staff-session";
import { useMarket } from "@/lib/store";
import { shopUrl, surface } from "@/lib/surface";
import { cn } from "@/lib/utils";

const MANAGE = [
  { to: "/manage/scan", label: "Scan" },
  { to: "/manage", label: "Sales" },
  { to: "/manage/catalog", label: "Products" },
  { to: "/manage/inventory", label: "Stock" },
  { to: "/manage/orders", label: "Orders" },
  { to: "/manage/run", label: "Packing" },
  { to: "/manage/register", label: "Walk-in" },
  { to: "/manage/customers", label: "Customers" },
  { to: "/manage/promos", label: "Promos" },
  { to: "/manage/company", label: "Company" },
] as const;

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const cartCount = useCartCount();
  const shop = useShop();
  const setCartOpen = useMarket((s) => s.setCartOpen);
  const pruneCart = useMarket((s) => s.pruneCart);
  const products = useMarket((s) => s.products);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showDesk = surface() === "both";

  useEffect(() => {
    pruneCart();
  }, [products, pruneCart]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Wordmark />
          <nav className="ml-4 hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground">
              Shop
            </Link>
            <Link to="/" search={{ deals: true }} className="hover:text-foreground">
              Promos
            </Link>
            <Link to="/orders" className="hover:text-foreground">
              My orders
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingBag className="size-5" />
              {cartCount > 0 ? (
                <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-medium text-primary-foreground tabular-nums">
                  {cartCount}
                </span>
              ) : null}
            </Button>
            {showDesk ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin">Staff desk</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="hidden border-t border-border px-4 py-6 text-center text-xs text-muted-foreground md:block">
        {shop.name} · {shop.street}, {shop.city} · {shop.phone}
        {showDesk ? (
          <>
            <span className="mx-2">·</span>
            <Link to="/admin" className="underline-offset-2 hover:text-foreground hover:underline">
              Staff desk
            </Link>
          </>
        ) : null}
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-3">
          <TabLink to="/" icon={Store} label="Shop" active={pathname === "/"} />
          <TabLink
            to="/orders"
            icon={ClipboardList}
            label="Orders"
            active={pathname.startsWith("/orders") || pathname.startsWith("/receipt")}
          />
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground"
          >
            <span className="relative">
              <ShoppingBag className="size-5" />
              {cartCount > 0 ? (
                <span className="absolute -top-1 -right-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground tabular-nums">
                  {cartCount}
                </span>
              ) : null}
            </span>
            Cart
          </button>
        </div>
      </nav>
      <CartDrawer />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export function ManageShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [left, setLeft] = useState(staffMsLeft());

  useEffect(() => {
    const tick = window.setInterval(() => {
      const ms = staffMsLeft();
      setLeft(ms);
      if (ms <= 0) window.location.reload();
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);

  function lock() {
    clearStaffSession();
    window.location.reload();
  }

  return (
    <div className="admin-root min-h-dvh pb-20 md:pb-0">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-foreground px-4 py-1.5 text-[11px] tracking-[0.16em] text-background uppercase">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3" />
          Restricted desk
        </span>
        <span className="font-mono tabular-nums">
          Session {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Wordmark to="/manage" subtitle="Staff desk" />
          <nav className="ml-auto hidden items-center gap-1 xl:flex">
            {MANAGE.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm",
                  pathname === item.to
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 xl:ml-2">
            <LiveShelfChip />
            <Button asChild variant="outline" size="sm">
              {surface() === "admin" ? <a href={shopUrl()}>View shop</a> : <Link to="/">View shop</Link>}
            </Button>
            <Button variant="ghost" size="sm" onClick={lock}>
              Lock
            </Button>
          </div>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 xl:hidden">
          {MANAGE.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-sm",
                pathname === item.to
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-4">
          <TabLink to="/manage" icon={LayoutDashboard} label="Sales" active={pathname === "/manage"} />
          <TabLink
            to="/manage/catalog"
            icon={Package}
            label="Products"
            active={pathname.startsWith("/manage/catalog")}
          />
          <TabLink
            to="/manage/orders"
            icon={ClipboardList}
            label="Orders"
            active={pathname.startsWith("/manage/orders")}
          />
          <TabLink
            to="/manage/scan"
            icon={QrCode}
            label="Scan"
            active={pathname.startsWith("/manage/scan")}
          />
        </div>
      </nav>
    </div>
  );
}

function TabLink({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: "/" | "/orders" | "/manage" | "/manage/orders" | "/manage/catalog" | "/manage/register" | "/manage/scan";
  icon: typeof Store;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
