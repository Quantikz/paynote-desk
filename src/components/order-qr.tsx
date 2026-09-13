import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Order } from "@/lib/catalog";
import { useShop } from "@/lib/market-hooks";
import { ticketPayload } from "@/lib/ticket";

export function OrderQr({
  order,
  light = "#ffffff",
  dark = "#0a0a0a",
}: {
  order: Order;
  light?: string;
  dark?: string;
}) {
  const shop = useShop();
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const [bytes, setBytes] = useState(0);

  useEffect(() => {
    let live = true;
    const payload = ticketPayload(order, shop);
    setBytes(payload.length);
    void QRCode.toDataURL(payload, {
      margin: 1,
      width: 480,
      color: { dark, light },
      errorCorrectionLevel: "L",
    })
      .then((url) => {
        if (live) {
          setSrc(url);
          setError("");
        }
      })
      .catch(() => {
        if (live) setError("This order is too large for one code. Download the JSON file and load it at the desk.");
      });
    return () => {
      live = false;
    };
  }, [order, shop, dark, light]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!src) {
    return <div className="mx-auto aspect-square w-64 rounded-lg bg-muted" />;
  }

  return (
    <figure>
      <img
        src={src}
        alt={`Collection JSON for ${order.number}`}
        className="mx-auto w-64 rounded-lg bg-white"
      />
      <figcaption className="mt-2 text-center text-[11px] tracking-wide text-muted-foreground uppercase">
        Full order JSON · {bytes} bytes · works offline
      </figcaption>
    </figure>
  );
}
