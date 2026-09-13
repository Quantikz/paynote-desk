import { useEffect } from "react";
import { useShop } from "@/lib/market-hooks";
import { DEFAULT_SHOP } from "@/lib/shop";
import { surface } from "@/lib/surface";

function clearAccent(root: HTMLElement) {
  root.style.removeProperty("--color-primary");
  root.style.removeProperty("--color-ring");
  root.style.removeProperty("--color-sage");
}

export function ShopTheme() {
  const shop = useShop();

  useEffect(() => {
    if (surface() === "admin") return;
    const root = document.documentElement;
    const apply = () => {
      if (root.classList.contains("admin-root")) {
        clearAccent(root);
        return;
      }
      const accent = shop.accent || DEFAULT_SHOP.accent;
      root.style.setProperty("--color-primary", accent);
      root.style.setProperty("--color-ring", accent);
      root.style.setProperty("--color-sage", accent);
      document.title = shop.name;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      clearAccent(root);
    };
  }, [shop.accent, shop.name]);

  return null;
}
