import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Order } from "@/lib/catalog";
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
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const payload = ticketPayload(order);
    void QRCode.toDataURL(payload, {
      margin: 1,
      width: 420,
      color: { dark, light },
      errorCorrectionLevel: payload.length > 1200 ? "L" : "M",
    })
      .then((url) => {
        if (live) setSrc(url);
      })
      .catch(() => {
        if (live) setError("This order is too large for one code. Split the cart.");
      });
    return () => {
      live = false;
    };
  }, [order, dark, light]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!src) {
    return <div className="mx-auto aspect-square w-64 rounded-lg bg-muted" />;
  }

  return (
    <img
      src={src}
      alt={`Collection code ${order.number}`}
      className="mx-auto w-64 rounded-lg bg-white"
    />
  );
}
