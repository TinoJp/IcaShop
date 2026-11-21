import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, ImagePlus, Loader2, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { deleteImage, uploadImage } from '@/lib/imageStorage';
import { formatTsh } from '@/utils';
import type { Category, ProductAdmin, ProductVariant } from '@/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type AdminProductsProps = {
  onBack: () => void;
};

const emptyForm = {
  id: '',
  name: '',
  category_id: '',
  description: '',
  price: '',
  sale_price: '',
  stock: '',
  is_active: true,
  is_archived: false,
  image_url: '',
};

type VariantDraft = {
  id: string;
  name: string;
  price: string;
  stock: string;
  image_url: string;
  file?: File | null;
};

export function AdminProducts({ onBack }: AdminProductsProps) {
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<typeof emptyForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProductAdmin | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);

  const createVariantDraft = (name: string, price: string, stock: string, image_url = '', file?: File | null, id = crypto.randomUUID()): VariantDraft => ({
    id,
    name,
    price,
    stock,
    image_url,
    file,
  });

  const load = async () => {
    setLoading(true);
    const [prodRes, catRes, imageRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, category_id, name, slug, sku, description, price, sale_price, stock, is_active, is_archived')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, slug').order('display_order'),
      supabase
        .from('product_images')
        .select('id, product_id, image_url, alt_text, variant_name, variant_price, variant_stock, display_order, is_archived')
        .order('display_order'),
    ]);
    if (prodRes.error || catRes.error || imageRes.error) {
      setError('Could not load products. Please try again.');
    } else {
      const imageByProduct = new Map<string, ProductVariant[]>();
      for (const image of imageRes.data ?? []) {
        if (!image.variant_name?.trim() || image.is_archived) continue;
        const variant: ProductVariant = {
          id: image.id,
          product_id: image.product_id,
          image_url: image.image_url,
          alt_text: image.alt_text ?? image.variant_name,
          display_order: image.display_order ?? 0,
          variant_name: image.variant_name.trim(),
          variant_price: image.variant_price ?? null,
          variant_stock: image.variant_stock ?? 0,
        };
        const items = imageByProduct.get(image.product_id) ?? [];
        items.push(variant);
        imageByProduct.set(image.product_id, items);
      }
      setProducts((prodRes.data ?? []).map((product) => {
        const variants = imageByProduct.get(product.id) ?? [];
        return { ...product, image_url: (imageRes.data ?? []).find((image) => image.product_id === product.id)?.image_url ?? null, variants } as ProductAdmin;
      }));
      setCategories(catRes.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';

  const filtered = products.filter((p) => {
    const term = search.trim().toLowerCase();
    return !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
  });

  const startEdit = (product: ProductAdmin) => {
    const variants = (product.variants ?? []).map((variant) => createVariantDraft(
      variant.variant_name,
      variant.variant_price === null ? '' : String(variant.variant_price),
      String(variant.variant_stock),
      variant.image_url,
      null,
      variant.id,
    ));
    setEditing({
      id: product.id,
      name: product.name,
      category_id: product.category_id,
      description: product.description,
      price: String(product.price),
      sale_price: product.sale_price ? String(product.sale_price) : '',
      stock: String(product.stock),
      is_active: product.is_active,
      is_archived: product.is_archived,
      image_url: product.image_url ?? '',
    });
    setVariantDrafts(variants);
    setFormError('');
  };

  const startCreate = () => {
    setEditing({ ...emptyForm, category_id: categories[0]?.id ?? '' });
    setVariantDrafts([]);
    setFormError('');
  };

  const chooseImages = (files?: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    const validFiles = Array.from(files).filter((file) => {
      if (!accepted.includes(file.type)) {
        setFormError('Choose JPG, PNG, WEBP, or AVIF images only.');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Each image must be 5 MB or smaller.');
        return false;
      }
      return true;
    });
    if (!validFiles.length) return;
    setFormError('');
    setVariantDrafts((current) => [
      ...current,
      ...validFiles.map((file, index) => createVariantDraft(
        `${editing?.name?.trim() || 'Variant'} ${current.length + index + 1}`,
        editing?.price || '',
        editing?.stock || '1',
        '',
        file,
      )),
    ]);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setFormError('');
    setSaving(true);

    const price = Number(editing.price);
    const stock = Number(editing.stock);
    const salePrice = editing.sale_price ? Number(editing.sale_price) : null;

    if (!editing.name.trim()) {
      setFormError('Product name is required.');
      setSaving(false);
      return;
    }
    if (!editing.category_id) {
      setFormError('Please choose a category.');
      setSaving(false);
      return;
    }
    if (isNaN(price) || price < 0) {
      setFormError('Enter a valid price.');
      setSaving(false);
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setFormError('Enter a valid stock quantity.');
      setSaving(false);
      return;
    }
    if (salePrice !== null && (isNaN(salePrice) || salePrice < 0 || salePrice >= price)) {
      setFormError('Sale price must be less than the regular price.');
      setSaving(false);
      return;
    }
    if (variantDrafts.some((variant) => !variant.name.trim() || (!variant.image_url && !variant.file))) {
      setFormError('Every product option needs an image and a name/label.');
      setSaving(false);
      return;
    }

    const slug = editing.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const sku = `ICA-${categories.find((c) => c.id === editing.category_id)?.slug.toUpperCase().slice(0, 4) ?? 'GEN'}-${Date.now().toString(36).toUpperCase()}`;

    try {
      let productId = editing.id;
      if (editing.id) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: editing.name.trim(),
            category_id: editing.category_id,
            description: editing.description.trim(),
            price,
            sale_price: salePrice,
            stock,
            is_active: editing.is_active,
            is_archived: editing.is_archived,
          })
          .eq('id', editing.id);
        if (updateError) throw updateError;
      } else {
        const { data: insertedProduct, error: insertError } = await supabase.from('products').insert({
          name: editing.name.trim(),
          slug,
          sku,
          category_id: editing.category_id,
          description: editing.description.trim(),
          price,
          sale_price: salePrice,
          stock,
          is_active: editing.is_active,
          is_archived: editing.is_archived,
        }).select('id').single();
        if (insertError) throw insertError;
        productId = insertedProduct.id;
        setEditing((current) => current ? { ...current, id: productId } : current);
      }

      if (productId) {
        const { data: existingVariants, error: variantLookupError } = await supabase
          .from('product_images')
          .select('id, image_url')
          .eq('product_id', productId)
          .not('variant_name', 'is', null)
          .eq('is_archived', false);
        if (variantLookupError) throw variantLookupError;

        const existingById = new Map((existingVariants ?? []).map((variant) => [variant.id, variant]));
        const retainedIds = new Set(variantDrafts.filter((variant) => existingById.has(variant.id)).map((variant) => variant.id));
        const replacedImages: string[] = [];

        try {
          const prepared = await Promise.all(variantDrafts.map(async (variant, index) => {
            const imageUrl = variant.file ? await uploadImage(variant.file, 'product', productId) : variant.image_url;
            if (!imageUrl) throw new Error('Every product option must have an image.');
            const parsedPrice = variant.price.trim() === '' ? null : Number(variant.price);
            const parsedStock = Number(variant.stock);
            if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) throw new Error('Enter a valid option price.');
            if (!Number.isFinite(parsedStock) || parsedStock < 0) throw new Error('Enter a valid option stock quantity.');
            return { variant, index, imageUrl, parsedPrice, parsedStock };
          }));

          for (const item of prepared) {
            const values = {
              image_url: item.imageUrl,
              alt_text: item.variant.name.trim(),
              variant_name: item.variant.name.trim(),
              variant_price: item.parsedPrice,
              variant_stock: item.parsedStock,
              display_order: item.index,
              is_archived: false,
            };
            if (existingById.has(item.variant.id)) {
              const oldImage = existingById.get(item.variant.id)!.image_url;
              const { error: updateVariantError } = await supabase.from('product_images').update(values).eq('id', item.variant.id);
              if (updateVariantError) throw updateVariantError;
              if (oldImage !== item.imageUrl) replacedImages.push(oldImage);
            } else {
              const { error: insertVariantError } = await supabase.from('product_images').insert({ ...values, product_id: productId });
              if (insertVariantError) throw insertVariantError;
            }
          }

          const removed = (existingVariants ?? []).filter((variant) => !retainedIds.has(variant.id));
          const removedIds = removed.map((variant) => variant.id);
          if (removedIds.length) {
            const { data: orderedItems, error: orderLookupError } = await supabase
              .from('order_items')
              .select('variant_id')
              .in('variant_id', removedIds);
            if (orderLookupError) throw orderLookupError;
            const referencedIds = new Set((orderedItems ?? []).map((item) => item.variant_id));
            const archiveIds = removedIds.filter((id) => referencedIds.has(id));
            const deleteIds = removedIds.filter((id) => !referencedIds.has(id));

            if (archiveIds.length) {
              const { error: archiveError } = await supabase.from('product_images').update({ is_archived: true, variant_stock: 0 }).in('id', archiveIds);
              if (archiveError) throw archiveError;
            }
            if (deleteIds.length) {
              const { error: deleteError } = await supabase.from('product_images').delete().in('id', deleteIds);
              if (deleteError) throw deleteError;
              for (const removedVariant of removed.filter((variant) => deleteIds.includes(variant.id))) {
                replacedImages.push(removedVariant.image_url);
              }
            }
          }

          for (const oldImageUrl of new Set(replacedImages)) {
            try { await deleteImage('product', oldImageUrl); }
            catch (cleanupError) { console.error('Could not remove an unreferenced product image:', cleanupError); }
          }
        } catch (saveError) {
          // Do not remove staged objects here: an earlier row update may already reference one.
          throw saveError;
        }
      }
      setEditing(null);
      setVariantDrafts([]);
      void load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: ProductAdmin) => {
    setDeleting(true);
    const { data: images, error: imageLookupError } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', product.id);
    if (imageLookupError) {
      setError('Could not load this product’s images, so the product was not deleted.');
      setDeleting(false);
      return;
    }

    const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id);
    if (deleteError) {
      setError('Could not delete that product.');
    } else {
      setDeleteTarget(null);
      const cleanupResults = await Promise.allSettled(
        (images ?? []).map(({ image_url }) => deleteImage('product', image_url)),
      );
      if (cleanupResults.some((result) => result.status === 'rejected')) {
        console.error('Could not remove every image for the deleted product:', cleanupResults);
        setError('Product deleted, but one or more images could not be removed from Cloudflare.');
      }
      void load();
    }
    setDeleting(false);
  };

  if (editing) {
    return (
      <div className="mt-8">
        <button onClick={() => { setEditing(null); setVariantDrafts([]); onBack(); }} className="mb-5 flex items-center gap-2 text-sm font-bold text-orange-600">
          <ArrowLeft size={16} /> Back to products
        </button>
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">{editing.id ? 'Edit product' : 'New product'}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{editing.id ? editing.name : 'Add a product'}</h1>
        </div>
        <form onSubmit={handleSave} className="max-w-2xl space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100 sm:p-8">
          <label className="block text-sm font-bold">
            Product name
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>
          <label className="block text-sm font-bold">
            Category
            <select
              value={editing.category_id}
              onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold"><ImagePlus size={17} className="text-orange-600" />Product photo variants <span className="font-normal text-slate-400">multiple photos allowed</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {variantDrafts.map((variant, index) => (
                <div key={variant.id} className="rounded-2xl border border-orange-100 bg-white p-3">
                  {variant.image_url ? <img src={variant.image_url} alt={variant.name || 'Product variant'} className="mb-3 h-28 w-full rounded-xl bg-orange-50 object-cover" /> : <div className="mb-3 grid h-28 place-items-center rounded-xl bg-orange-50 text-orange-300"><ImagePlus size={26} /></div>}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, file, image_url: '' } : item));
                    }}
                    className="mb-3 block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-orange-500 file:px-2 file:py-1 file:text-xs file:font-bold file:text-white"
                  />
                  <label className="mb-2 block text-xs font-bold">Option name
                    <input
                      value={variant.name}
                      onChange={(e) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: e.target.value } : item))}
                      placeholder="e.g. Red / Size 39"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-bold">Price
                      <input
                        type="number"
                        min="0"
                        value={variant.price}
                        onChange={(e) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: e.target.value } : item))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>
                    <label className="block text-xs font-bold">Stock
                      <input
                        type="number"
                        min="0"
                        value={variant.stock}
                        onChange={(e) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stock: e.target.value } : item))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">
                Add images
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(event) => chooseImages(event.target.files)} />
              </label>
              <button type="button" onClick={() => setVariantDrafts((current) => [...current, createVariantDraft('', '', '1', '')])} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Add option</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Each image can have a unique option name, price, and stock count.</p>
          </div>
          <label className="block text-sm font-bold">
            Description
            <textarea
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block text-sm font-bold">
              Price (TSh)
              <input
                type="number"
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                required
                min="0"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>
            <label className="block text-sm font-bold">
              Sale price <span className="font-normal text-slate-400">(optional)</span>
              <input
                type="number"
                value={editing.sale_price}
                onChange={(e) => setEditing({ ...editing, sale_price: e.target.value })}
                min="0"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>
            <label className="block text-sm font-bold">
              Stock
              <input
                type="number"
                value={editing.stock}
                onChange={(e) => setEditing({ ...editing, stock: e.target.value })}
                required
                min="0"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                className="h-4 w-4 accent-orange-500"
              />
              Visible in store
            </label>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={editing.is_archived}
                onChange={(e) => setEditing({ ...editing, is_archived: e.target.checked })}
                className="h-4 w-4 accent-orange-500"
              />
              Archived
            </label>
          </div>
          {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{formError}</p>}
          <div className="flex gap-3">
            <button
              disabled={saving}
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:bg-slate-300"
            >
              {saving ? (
                <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Saving…</span>
              ) : (
                <span className="flex items-center gap-2"><Check size={16} /> Save product</span>
              )}
            </button>
            <button type="button" onClick={() => { setEditing(null); setVariantDrafts([]); }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:border-orange-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Admin</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Products</h1>
          <p className="mt-2 text-sm text-slate-500">{products.length} products in the catalogue.</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
          <Plus size={17} /> Add product
        </button>
      </div>

      <div className="mb-5 flex items-center rounded-xl border border-orange-100 bg-white px-4 py-2.5 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
        <Search size={18} className="shrink-0 text-orange-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU"
          className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
        />
        {search && <button onClick={() => setSearch('')}><X size={16} className="text-slate-400" /></button>}
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-orange-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-10 text-center text-sm text-slate-500">
          No products found. {search ? 'Try a different search.' : 'Add your first product.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-100">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-orange-100 bg-[#FAF7F4] text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="hidden px-4 py-3 sm:table-cell">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="hidden px-4 py-3 sm:table-cell">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-orange-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.image_url ? <img src={product.image_url} alt="" className="h-11 w-11 rounded-lg bg-orange-50 object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-lg bg-orange-50 text-orange-400"><Package size={19} /></span>}
                      <span><p className="font-bold">{product.name}</p><p className="text-xs text-slate-400">{product.sku}</p></span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{categoryName(product.category_id)}</td>
                  <td className="px-4 py-3">
                    <span className="font-black">{formatTsh(product.sale_price ?? product.price)}</span>
                    {product.sale_price && <span className="block text-xs text-slate-400 line-through">{formatTsh(product.price)}</span>}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={product.stock === 0 ? 'font-bold text-red-500' : 'text-slate-600'}>{product.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    {product.is_archived ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Archived</span>
                    ) : product.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Hidden</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => startEdit(product)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-orange-300 hover:text-orange-600">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(product)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label="Delete product">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {deleteTarget && <ConfirmDialog title="Delete this product?" message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`} confirmLabel="Delete product" busyLabel="Deleting..." busy={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDelete(deleteTarget)} />}
    </div>
  );
}
