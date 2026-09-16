import { useState } from "react";
import { plateClasses, type Product } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function productImageSrc(product: Product) {
  if (product.image) return product.image;
  return `/products/${product.id}.jpg`;
}

export function ProductStill({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = productImageSrc(product);
  const showPhoto = Boolean(product.image) || !failed;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex min-h-40 overflow-hidden rounded-lg",
        showPhoto ? "bg-muted" : `product-still flex-col justify-between p-4 ${plateClasses(product.plate)}`,
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <div className="relative z-10 flex items-start justify-between gap-2">
            <span className="text-xs font-medium tracking-[0.16em] uppercase opacity-70">
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
  const src = productImageSrc(product);
  const showPhoto = Boolean(product.image) || !failed;
  return (
    <div
      className={cn(
        "relative size-11 shrink-0 overflow-hidden rounded-md bg-muted",
        !showPhoto && plateClasses(product.plate),
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
