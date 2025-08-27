"use client";

import React, { useEffect, useState } from 'react';
import useEventSource from '../../../hooks/useEventSource';
import Image from 'next/image';
import { useToast } from '../../../context/ToastContext';

type P = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  stock: number;
  published: boolean;
  slug?: string;
  price?: number;
};

export default function ProductsAdmin() {
  const [products, setProducts] = useState<P[]>([]);
  const toast = useToast();
  // --- form state for creating a product ---
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
  image: '',
  imageFile: null as File | null,
  price: 0,
    stock: 0,
    published: false,
    tags: '' // comma separated
  });

  // editing state
  const [editingProduct, setEditingProduct] = useState<P | null>(null);
  const [editingForm, setEditingForm] = useState(() => ({
    name: '',
    slug: '',
    description: '',
  image: '',
  imageFile: null as unknown as File | null,
  price: 0,
    stock: 0,
    published: false,
    tags: ''
  }));
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const [formPreview, setFormPreview] = useState<string | null>(null);
  const [editingPreview, setEditingPreview] = useState<string | null>(null);

  const createProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name || !form.slug) return toast.push({ message: 'Name y slug son requeridos' });
    setCreating(true);
    try {
      let imageUrl = form.image;
      // if a file selected, upload it first (FormData preferred)
      if (form.imageFile) {
        try {
          const fd = new FormData();
          fd.append('file', form.imageFile as File);
          const upl = await fetch('/api/uploads', { method: 'POST', body: fd });
          if (upl.ok) {
            const j = await upl.json();
            imageUrl = j.url || imageUrl;
          }
        } catch (e) {}
      }
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        image: imageUrl,
  price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        published: Boolean(form.published),
        tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : []
      };
      const res = await fetch('/api/products', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error' }));
        toast.push({ message: err?.error || 'Error al crear producto' });
      } else {
        const created = await res.json();
        // rely on SSE to sync other clients, but optimistically add to list
  setProducts(prev => [created, ...prev]);
  setForm({ name: '', slug: '', description: '', image: '', imageFile: null, price: 0, stock: 0, published: false, tags: '' });
  setShowCreateForm(false);
  toast.push({ message: 'Producto creado' });
      }
    } catch (err) {
      toast.push({ message: 'Error de red al crear producto' });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/products')
      .then(r => r.json())
      .then((data) => { if (mounted) setProducts(data || []); })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  // preview management for create/edit image files
  useEffect(() => {
    if (form.imageFile) {
      const u = URL.createObjectURL(form.imageFile);
      setFormPreview(u);
      return () => { URL.revokeObjectURL(u); setFormPreview(null); };
    } else {
      setFormPreview(form.image || null);
    }
  }, [form.imageFile, form.image]);

  useEffect(() => {
    if (editingForm.imageFile) {
      const u = URL.createObjectURL(editingForm.imageFile as File);
      setEditingPreview(u);
      return () => { URL.revokeObjectURL(u); setEditingPreview(null); };
    } else {
      setEditingPreview(editingForm.image || null);
    }
  }, [editingForm.imageFile, editingForm.image]);

  // use SSE with reconnection
  useEventSource('/api/events', 'product.changed', (ev: MessageEvent) => {
    try {
      const payload = JSON.parse(ev.data) as { action: string; product: P & { slug?: string; price?: number } };
      const { action, product } = payload;
      setProducts(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(p => p._id === product._id || p.slug === product.slug);
  if (action === 'create' || action === 'restore') {
          if (idx === -1) copy.unshift(product);
          else copy[idx] = product;
        } else if (action === 'update') {
          if (idx === -1) copy.unshift(product);
          else copy[idx] = product;
        } else if (action === 'delete') {
          if (idx !== -1) copy.splice(idx, 1);
        }
        return copy;
      });
    } catch (e) {}
  });

  const togglePublish = async (id: string, published: boolean) => {
    // optimistic update with rollback on failure
    const prev = products.find(p => p._id === id);
    if (!prev) return;
    // apply optimistic
    setProducts(prevList => prevList.map(p => p._id === id ? { ...p, published } : p));
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify({ published }), headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        toast.push({ message: published ? 'Publicado' : 'Oculto' });
      } else {
        // revert
        setProducts(prevList => prevList.map(p => p._id === id ? { ...p, published: prev.published } : p));
        const err = await res.json().catch(() => ({}));
        toast.push({ message: err?.error || 'Error al actualizar' });
      }
    } catch (e) {
      // revert
      setProducts(prevList => prevList.map(p => p._id === id ? { ...p, published: prev.published } : p));
      toast.push({ message: 'Error al actualizar' });
    }
  };

  // Request deletion: open confirm modal
  const requestDeleteProduct = (id: string) => {
    setConfirmDeleteId(id);
  };

  const performDeleteProduct = async () => {
    if (!confirmDeleteId) return;
    setConfirmDeleting(true);
    const id = confirmDeleteId;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // optimistic removal; SSE will keep other clients in sync
        setProducts(prev => prev.filter(p => p._id !== id));
        // show undo toast which calls restore API
        toast.push({
          message: 'Producto movido a papelera',
          actionLabel: 'Deshacer',
          action: async () => {
            try {
              const r = await fetch('/api/products/restore', { method: 'POST', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } });
              if (r.ok) {
                const restored = await r.json();
                setProducts(prev => [restored, ...prev]);
                toast.push({ message: 'Restaurado' });
              } else {
                const err = await r.json().catch(() => ({}));
                toast.push({ message: err?.error || 'Error al restaurar' });
              }
            } catch (e) { toast.push({ message: 'Error de red al restaurar' }); }
          }
        }, 7000);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.push({ message: err?.error || 'Error al eliminar' });
      }
    } catch (e) {
      toast.push({ message: 'Error al eliminar' });
    } finally {
      setConfirmDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#4E260E]">Productos</h2>
        <p className="text-sm text-gray-500">Administra el catálogo: publica, oculta o mueve productos a la papelera.</p>
      </div>

      <div className="overflow-x-auto">
                {formPreview && (
                  <img src={formPreview} alt="preview" className="mt-2 w-24 h-24 object-cover rounded" />
                )}

        {showCreateForm ? (
          <form onSubmit={createProduct} className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input className="mt-1 block w-full rounded border p-2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slug (único)</label>
              <input className="mt-1 block w-full rounded border p-2" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio (cents)</label>
              <input type="number" step="0.01" className="mt-1 block w-full rounded border p-2" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stock</label>
              <input type="number" className="mt-1 block w-full rounded border p-2" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Descripción</label>
              <textarea className="mt-1 block w-full rounded border p-2" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Imagen (url)</label>
              <input className="mt-1 block w-full rounded border p-2" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
              {/* Allow admins to upload an image file from their device when creating a product */}
              <input type="file" accept="image/*" onChange={e => setForm(f => ({ ...f, imageFile: e.target.files ? e.target.files[0] : null }))} className="mt-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (coma-separado)</label>
              <input className="mt-1 block w-full rounded border p-2" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center">
                <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
                <span className="ml-2">Publicado</span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowCreateForm(false); setForm({ name: '', slug: '', description: '', image: '', imageFile: null, price: 0, stock: 0, published: false, tags: '' }); }} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
              <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded">{creating ? 'Creando...' : 'Aceptar'}</button>
            </div>
          </div>
          </form>
        ) : (
          <div className="mb-6">
            <button onClick={() => setShowCreateForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Crear producto</button>
          </div>
        )}

        {/* edit modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
              <h3 className="text-lg font-bold mb-4">Editar producto</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const id = editingProduct._id;
                try {
                    let imageUrl = editingForm.image;
                    if (editingForm.imageFile) {
                      try {
                        const fd = new FormData();
                        fd.append('file', editingForm.imageFile as File);
                        const upl = await fetch('/api/uploads', { method: 'POST', body: fd });
                        if (upl.ok) {
                          const j = await upl.json();
                          imageUrl = j.url || imageUrl;
                        }
                      } catch (e) {}
                    }
                    const payload = {
                    name: editingForm.name,
                    slug: editingForm.slug,
                    description: editingForm.description,
                    image: imageUrl,
                    price: Number(editingForm.price) || 0,
                    stock: Number(editingForm.stock) || 0,
                    published: Boolean(editingForm.published),
                    tags: editingForm.tags ? editingForm.tags.split(',').map(s => s.trim()).filter(Boolean) : []
                  };
                  const res = await fetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
                  if (res.ok) {
                    const updated = await res.json();
                    setProducts(prev => prev.map(p => p._id === id ? updated : p));
                    setEditingProduct(null);
                    toast.push({ message: 'Producto actualizado' });
                  } else {
                    const err = await res.json().catch(() => ({}));
                    toast.push({ message: err?.error || 'Error al actualizar' });
                  }
                } catch (err) { toast.push({ message: 'Error de red al actualizar' }); }
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                    <input className="mt-1 block w-full rounded border p-2" value={editingForm.name} onChange={e => setEditingForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Slug (único)</label>
                    <input className="mt-1 block w-full rounded border p-2" value={editingForm.slug} onChange={e => setEditingForm(f => ({ ...f, slug: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Precio (cents)</label>
                    <input type="number" step="0.01" className="mt-1 block w-full rounded border p-2" value={editingForm.price} onChange={e => setEditingForm(f => ({ ...f, price: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stock</label>
                    <input type="number" className="mt-1 block w-full rounded border p-2" value={editingForm.stock} onChange={e => setEditingForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                  </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Descripción</label>
                        <textarea className="mt-1 block w-full rounded border p-2" value={editingForm.description} onChange={e => setEditingForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Imagen (url)</label>
                        <input className="mt-1 block w-full rounded border p-2" value={editingForm.image} onChange={e => setEditingForm(f => ({ ...f, image: e.target.value }))} />
                        {editingPreview && (
                          <img src={editingPreview} alt="preview" className="mt-2 w-24 h-24 object-cover rounded" />
                        )}
                        <input type="file" accept="image/*" onChange={e => setEditingForm(f => ({ ...f, imageFile: e.target.files ? e.target.files[0] : null }))} className="mt-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tags (coma-separado)</label>
                        <input className="mt-1 block w-full rounded border p-2" value={editingForm.tags} onChange={e => setEditingForm(f => ({ ...f, tags: e.target.value }))} />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center">
                          <input type="checkbox" checked={editingForm.published} onChange={e => setEditingForm(f => ({ ...f, published: e.target.checked }))} />
                          <span className="ml-2">Publicado</span>
                        </label>
                      </div>
                  <div className="text-right col-span-2">
                    <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-gray-200 rounded mr-2">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Aceptar</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
        <table className="w-full text-left border-separate [border-spacing:0_12px]">
          <thead>
            <tr className="text-sm text-gray-600">
              <th className="pl-6">Imagen</th>
              <th>Nombre</th>
              <th>Stock</th>
              <th>Publicado</th>
              <th className="pr-6">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} className="bg-white rounded-xl shadow-sm align-top">
                <td className="pl-6 py-4 w-32">
                  {p.image ? <Image src={p.image} alt={p.name} width={96} height={64} className="object-cover rounded-lg shadow-sm" /> : null}
                </td>
                <td className="py-4">
                  <div className="font-semibold text-[#4E260E]">{p.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{p.description}</div>
                </td>
                <td className="py-4">
                  {p.stock > 0 ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">{p.stock} en stock</span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">SIN STOCK</span>
                  )}
                </td>
                <td className="py-4">
                  {p.published ? (
                    <span className="px-3 py-1 rounded-full bg-yellow-50 text-[#4E260E] text-sm font-medium">Publicado</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">Oculto</span>
                  )}
                </td>
                <td className="py-4 pr-6 text-right">
                  <button onClick={() => { setEditingProduct(p); setEditingForm({ name: p.name, slug: p.slug || '', description: p.description || '', image: p.image || '', imageFile: null, price: p['price'] || 0, stock: p.stock || 0, published: !!p.published, tags: '' }); }} className="mr-3 inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-[#4E260E] rounded-lg text-sm shadow-sm">Editar</button>
                  <button onClick={() => togglePublish(p._id, !p.published)} className="mr-3 inline-flex items-center gap-2 px-3 py-2 bg-[#FFF3D9] hover:bg-[#FFE7B3] text-[#4E260E] rounded-lg text-sm shadow-sm">{p.published ? 'Ocultar' : 'Publicar'}</button>
                  <button onClick={() => requestDeleteProduct(p._id)} className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Confirm delete modal */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Confirmar eliminación</h3>
              <p className="mb-4">¿Estás seguro de que quieres mover este producto a la papelera? Podrás restaurarlo desde Papelera.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                <button onClick={performDeleteProduct} disabled={confirmDeleting} className="px-4 py-2 bg-red-600 text-white rounded">{confirmDeleting ? 'Eliminando...' : 'Eliminar'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
