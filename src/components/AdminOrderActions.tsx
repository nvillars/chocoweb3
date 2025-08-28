"use client";

import React, { useState } from 'react';

type Props = {
  id: string;
  initialStatus?: string;
  initialPaymentStatus?: string;
  initialProviderId?: string;
  initialApprovedBy?: string;
  initialApprovedAt?: string;
};

export default function AdminOrderActions({ id, initialStatus, initialPaymentStatus, initialProviderId, initialApprovedBy, initialApprovedAt }: Props) {
  const [status, setStatus] = useState<string | undefined>(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>(initialPaymentStatus);
  const [providerId, setProviderId] = useState<string | undefined>(initialProviderId);
  const [providerRefInput, setProviderRefInput] = useState<string>(initialProviderId || '');
  const [approvedBy, setApprovedBy] = useState<string | undefined>(initialApprovedBy);
  const [approvedAt, setApprovedAt] = useState<string | undefined>(initialApprovedAt);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleMarkPaid = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ approved: true, providerRef: providerRefInput || undefined })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      // success: update local state
      setStatus('paid');
      setPaymentStatus('succeeded');
      // parse response for providerRef and approval audit
      try {
        const data = await res.json().catch(() => ({}));
        if (data && data.providerRef) setProviderId(String(data.providerRef));
        if (data && data.approvedBy) setApprovedBy(String(data.approvedBy));
        if (data && data.approvedAt) setApprovedAt(String(data.approvedAt));
      } catch {}
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // minimal feedback: alert
      try { alert('Error marcando pagada: ' + msg); } catch {}
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  // appearance: if already paid, show "Orden pagada" with a distinct color (sky), otherwise action button (green)
  if (status === 'paid') {
    return (
      <div className="flex flex-col items-end gap-2">
        <button disabled className="px-2 py-1 rounded bg-indigo-600 text-white">Orden pagada</button>
        {approvedBy && <div className="text-xs text-gray-500">Aprobado por: {approvedBy}{approvedAt ? ` · ${new Date(approvedAt).toLocaleString()}` : ''}</div>}
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} className="px-2 py-1 rounded bg-green-500 text-white">Marcar pagada</button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow p-6 max-w-md w-full z-10">
            <h3 className="text-lg font-bold mb-2">Confirmar pago</h3>
            <p className="text-sm text-gray-700 mb-4">¿Estás seguro que deseas marcar esta orden como pagada? Esta acción actualizará el estado en la base de datos.</p>
            <label className="block text-sm text-gray-600 mb-2">Referencia / providerRef (opcional)</label>
            <input value={providerRefInput} onChange={(e) => setProviderRefInput(e.target.value)} className="w-full p-2 border rounded mb-4" placeholder="Referencia de pago (Yape/Plin/Transfer)" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-3 py-2 rounded border">Cancelar</button>
              <button disabled={loading} onClick={handleMarkPaid} className="px-3 py-2 rounded bg-green-600 text-white">{loading ? 'Procesando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
