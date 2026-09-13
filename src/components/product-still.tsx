import { useState } from "react";
import { plateClasses, type Product } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function productImageSrc(id: string) {
  return `/products/${id}.jpg`;
}

export function ProductStill({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex min-h-40 overflow-hidden rounded-lg",
        failed
          ? `product-still flex-col justify-between p-4 ${plateClasses(product.plate)}`
          : "bg-muted",
        className,
      )}
    >
      {failed ? (
        <>
          <div className="relative z-10 flex items-start justify-between gap-2">
            <span className="text-[11px] font-medium tracking-[0.16em] uppercase opacity-70">
              {product.unit}
            </span>
            <span className="font-display text-4xl leading-none opacity-25">
              {product.name.slice(0, 1)}
            </span>
          </div>
          <div className="relative z-10">
            <p className="font-display text-xl leading-tight text-balance">{product.name}</p>
          </div>
        </>
      ) : (
        <img
          src={productImageSrc(product.id)}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function ProductThumb({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn(
        "h-14 w-14 shrink-0 overflow-hidden rounded-md",
        failed && plateClasses(product.plate),
        className,
      )}
    >
      {failed ? null : (
        <img
          src={productImageSrc(product.id)}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
