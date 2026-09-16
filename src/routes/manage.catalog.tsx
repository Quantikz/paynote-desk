import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ProductThumb } from "@/components/product-still";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CATEGORIES,
  PLATES,
  type CategoryId,
  type PlateId,
  type Product,
} from "@/lib/catalog";
import { money, nid, ngn, slugify } from "@/lib/money";
import { compressProductImage } from "@/lib/product-image";
import { useMarket } from "@/lib/store";

export const Route = createFileRoute("/manage/catalog")({
  component: CatalogPage,
});

const emptyForm = (): Product => ({
  id: "",
  sku: "",
  name: "",
  subtitle: "",
  category: "produce",
  priceCents: ngn(1500),
  costCents: ngn(900),
  unit: "piece",
  stock: 12,
  reorderAt: 4,
  featured: false,
  active: true,
  plate: "leaf",
});

function CatalogPage() {
  const products = useMarket((s) => s.products);
  const upsertProduct = useMarket((s) => s.upsertProduct);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Product>(emptyForm);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) =>
      `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query),
    );
  }, [products, q]);

  function save() {
    if (!form.name.trim()) {
      toast.error("Please enter a product name.");
      return;
    }
    const id = form.id || slugify(form.name) || nid("p");
    upsertProduct({
      ...form,
      id,
      sku: form.sku.trim() || `PN-${id.slice(0, 6).toUpperCase()}`,
      name: form.name.trim(),
      priceCents: Math.max(1, Math.round(form.priceCents)),
      costCents: Math.max(0, Math.round(form.costCents || 0)),
    });
    toast.success("Product saved on this computer.");
    void import("@/components/hydrate").then(({ pushShelf }) => pushShelf());
    setOpen(false);
  }

  async function onPhoto(file?: File | null) {
    if (!file) return;
    setBusyPhoto(true);
    try {
      const image = await compressProductImage(file);
      setForm((current) => ({ ...current, image }));
    } catch {
      toast.error("Could not use that photo. Try a JPG or PNG.");
    } finally {
      setBusyPhoto(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Catalog</p>
          <h1 className="font-display text-4xl">Products</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Add a photo and the buying cost with each item. The catalog is the shop database on this computer.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          New product
        </Button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search SKU or name"
          className="pl-10"
        />
      </div>
      <div className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Aisle</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr
                  key={product.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                  onClick={() => {
                    setForm(product);
                    setOpen(true);
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb product={product} className="size-11 rounded-md" />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{product.category}</td>
                  <td className="px-4 py-3 tabular-nums">{money(product.priceCents)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {money(product.costCents ?? 0)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{product.stock}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {!product.active ? <Badge variant="danger">Off</Badge> : null}
                      {product.featured ? <Badge>Featured</Badge> : null}
                      {product.stock <= product.reorderAt ? <Badge variant="warn">Low</Badge> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
            Photos stay with the product in the shop book on this computer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Photo</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {form.image ? (
                  <img src={form.image} alt="" className="size-20 rounded-lg object-cover" />
                ) : (
                  <div className="grid size-20 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <ImagePlus className="size-5" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void onPhoto(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => photoRef.current?.click()}
                    disabled={busyPhoto}
                  >
                    <ImagePlus className="size-4" />
                    {busyPhoto ? "Reading…" : form.image ? "Change photo" : "Add photo"}
                  </Button>
                  {form.image ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setForm({ ...form, image: undefined })}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <Field
              label="Name"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
            />
            <Field
              label="Subtitle"
              value={form.subtitle}
              onChange={(subtitle) => setForm({ ...form, subtitle })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="SKU"
                value={form.sku}
                onChange={(sku) => setForm({ ...form, sku })}
              />
              <Field
                label="Unit"
                value={form.unit}
                onChange={(unit) => setForm({ ...form, unit })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cat">Aisle</Label>
                <select
                  id="cat"
                  className="mt-1.5 flex h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as CategoryId })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="plate">Plate</Label>
                <select
                  id="plate"
                  className="mt-1.5 flex h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={form.plate}
                  onChange={(e) => setForm({ ...form, plate: e.target.value as PlateId })}
                >
                  {PLATES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Selling price (₦)"
                type="number"
                value={String(form.priceCents / 100)}
                onChange={(v) => setForm({ ...form, priceCents: Math.round(Number(v) * 100) })}
              />
              <Field
                label="Buying cost (₦)"
                type="number"
                value={String((form.costCents ?? 0) / 100)}
                onChange={(v) => setForm({ ...form, costCents: Math.round(Number(v) * 100) })}
              />
            </div>
            <Field
              label="Compare at"
              type="number"
              value={form.compareAtCents ? String(form.compareAtCents / 100) : ""}
              onChange={(v) =>
                setForm({
                  ...form,
                  compareAtCents: v ? Math.round(Number(v) * 100) : undefined,
                })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Stock"
                type="number"
                value={String(form.stock)}
                onChange={(v) => setForm({ ...form, stock: Number(v) })}
              />
              <Field
                label="Reorder at"
                type="number"
                value={String(form.reorderAt)}
                onChange={(v) => setForm({ ...form, reorderAt: Number(v) })}
              />
            </div>
            <Field
              label="Origin"
              value={form.origin ?? ""}
              onChange={(origin) => setForm({ ...form, origin })}
            />
            <Field
              label="Deal label"
              value={form.dealLabel ?? ""}
              onChange={(dealLabel) => setForm({ ...form, dealLabel })}
            />
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <Label htmlFor="feat">Featured</Label>
              <Switch
                id="feat"
                checked={form.featured}
                onCheckedChange={(featured) => setForm({ ...form, featured })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <Label htmlFor="active">Show in shop</Label>
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(active) => setForm({ ...form, active })}
              />
            </div>
            <Button onClick={save}>Save product</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
