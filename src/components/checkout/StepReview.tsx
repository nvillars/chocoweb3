import React from 'react';

type Props = {
  itemsCount: number;
  total: number;
  onBack?: () => void;
  onConfirm: () => void;
  loading?: boolean;
  paymentResult?: any | null;
  onMarkPaid?: (token?: string) => Promise<void>;
};

export default function StepReview({ itemsCount, total, onBack, onConfirm, loading, paymentResult, onMarkPaid }: Props) {
  const [paidChecked, setPaidChecked] = React.useState(false);
  return (
    <div>
      <h3 className="text-lg font-semibold">Revisa tu pedido</h3>
      <p>{itemsCount} items</p>
      <p>Total: S/ {total.toFixed(2)}</p>
      {paymentResult && paymentResult.provider === 'Yape' && (
        <div className="mt-4 p-3 border rounded">
          <h4 className="font-medium">Instrucciones de pago ({paymentResult.provider})</h4>
          <p className="text-sm">{paymentResult.instructions}</p>
          {paymentResult.qrDataUrl && <img src={paymentResult.qrDataUrl} alt="QR de pago" className="w-40 h-40 mt-2" />}
          {paymentResult.payTo && (
            <div className="mt-2 text-sm">
              <div><strong>{paymentResult.payTo.label}</strong></div>
              <div>Tel: {paymentResult.payTo.phone}</div>
              <div>Titular: {paymentResult.payTo.owner}</div>
            </div>
          )}
          <p className="text-xs text-gray-600 mt-2">Cuando completes el pago, marca la casilla o espera la confirmación por webhook.</p>
          <div className="mt-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={paidChecked} onChange={(e) => setPaidChecked(e.target.checked)} />
              <span className="text-sm">Ya realicé el pago</span>
            </label>
            <div className="mt-2">
              <button disabled={!paidChecked || loading} onClick={() => onMarkPaid && onMarkPaid(paymentResult.paymentSession)} className="btn-primary rounded-xl px-3 py-2">Notificar pago</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2 mt-4">
        {onBack && <button onClick={onBack} className="rounded-xl px-4 py-2 border">Volver</button>}
        <button disabled={!!loading} onClick={onConfirm} className="btn-primary rounded-xl px-4 py-2">{loading ? 'Confirmando...' : 'Confirmar pedido'}</button>
      </div>
      {/* show order details if available in parent via paymentResult.order or similar */}
      {paymentResult?.order && (
        <div className="mt-4 p-3 border rounded bg-green-50">
          <div className="text-sm">Pedido creado: <strong>{paymentResult.order.id ?? paymentResult.order._id}</strong></div>
          <div className="text-sm">Estado: <strong>{paymentResult.order.status}</strong></div>
        </div>
      )}
    </div>
  );
}
