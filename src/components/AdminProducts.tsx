import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, ImagePlus, Loader2, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { deleteImage, uploadImage } from '@/lib/imageStorage';
import { formatTsh } from '@/utils';
import type { Category, ProductAdmin } from '@/types';
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return; }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const load = async () => {
    setLoading(true);
    const [prodRes, catRes, imageRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, category_id, name, slug, sku, description, price, sale_price, stock, is_active, is_archived')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, slug').order('display_order'),
      supabase.from('product_images').select('product_id,image_url,display_order').order('display_order'),
    ]);
    if (prodRes.error || catRes.error || imageRes.error) {
      setError('Could not load products. Please try again.');
    } else {
      const imageByProduct = new Map<string, string>();
      for (const image of imageRes.data ?? []) if (!imageByProduct.has(image.product_id)) imageByProduct.set(image.product_id, image.image_url);
      setProducts((prodRes.data ?? []).map((product) => ({ ...product, image_url: imageByProduct.get(product.id) ?? null })) as ProductAdmin[]);
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
    setImageFile(null);
    setFormError('');
  };

  const startCreate = () => {
    setEditing({ ...emptyForm, category_id: categories[0]?.id ?? '' });
    setImageFile(null);
    setFormError('');
  };

  const chooseImage = (file?: File) => {
    if (!file) { setImageFile(null); return; }
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!accepted.includes(file.type)) { setFormError('Choose a JPG, PNG, WEBP, or AVIF image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setFormError('Image must be 5 MB or smaller.'); return; }
    setFormError('');
    setImageFile(file);
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

      if (imageFile && productId) {
        const imageUrl = await uploadImage(imageFile, 'product', productId);
        const { data: existingImage, error: lookupError } = await supabase.from('product_images').select('id,image_url').eq('product_id', productId).order('display_order').limit(1).maybeSingle();
        if (lookupError) {
          try {
            await deleteImage('product', imageUrl);
          } catch (cleanupError) {
            console.error('Could not remove the unlinked product image:', cleanupError);
          }
          throw lookupError;
        }
        const imageWrite = existingImage
          ? await supabase.from('product_images').update({ image_url: imageUrl, alt_text: editing.name.trim(), display_order: 0 }).eq('id', existingImage.id)
          : await supabase.from('product_images').insert({ product_id: productId, image_url: imageUrl, alt_text: editing.name.trim(), display_order: 0 });
        if (imageWrite.error) {
          try {
            await deleteImage('product', imageUrl);
          } catch (cleanupError) {
            console.error('Could not remove the unlinked product image:', cleanupError);
          }
          throw imageWrite.error;
        }
        if (existingImage?.image_url && existingImage.image_url !== imageUrl) {
          try {
            await deleteImage('product', existingImage.image_url);
          } catch (cleanupError) {
            console.error('Could not remove the replaced product image:', cleanupError);
            setError('Product saved, but the previous image could not be removed from Cloudflare.');
          }
        }
      }
      setEditing(null);
      setImageFile(null);
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
        <button onClick={() => setEditing(null)} className="mb-5 flex items-center gap-2 text-sm font-bold text-orange-600">
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
            <div className="mb-3 flex items-center gap-2 text-sm font-bold"><ImagePlus size={17} className="text-orange-600" />Product photo <span className="font-normal text-slate-400">optional</span></div>
            {(imagePreview || editing.image_url) ? <img src={imagePreview || editing.image_url} alt="Product preview" className="mb-3 h-44 w-full rounded-xl bg-white object-contain" /> : <div className="mb-3 grid h-32 place-items-center rounded-xl bg-white text-orange-300"><ImagePlus size={34} /></div>}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => chooseImage(event.target.files?.[0])} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-orange-600" />
            <p className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP or AVIF. Maximum 5 MB.</p>
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
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:border-orange-300">
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
