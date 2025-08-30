"use client";

import React, { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import CheckoutStepper from '../../components/checkout/CheckoutStepper';
import StepCustomer from '../../components/checkout/StepCustomer';
import StepPayment from '../../components/checkout/StepPayment';
import StepReview from '../../components/checkout/StepReview';
import OrderSummary from '../../components/checkout/OrderSummary';
import { CheckoutPayload, OrderItem, ShippingOption } from '../../types/checkout';

const STORAGE_KEY = 'checkout_state_v1';

export default function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shipping, setShipping] = useState<ShippingOption>({ method: 'envio', price: 10 });
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<any>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [paymentResult, setPaymentResult] = useState<any | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [orderToken, setOrderToken] = useState<string | null>(null);

  useEffect(() => {
    // try to load from localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
          const parsed = JSON.parse(raw);
          setItems(parsed.items || []);
          // default to envio S/10 when not present
          setShipping(parsed.shipping || { method: 'envio', price: 10 });
          setAddress(parsed.address ?? null);
        }
    } catch (e) {}
  }, []);

  // initialize items from CartContext (keeps checkout in sync when user navigates from cart)
  const cart = useCart();
  useEffect(() => {
    try {
      const citems = cart.getCartItems();
  const mapped = citems.map(ci => ({
        productId: ci.id,
        name: ci.name ?? (ci as any).title ?? 'Producto',
        qty: ci.quantity,
        unitPrice: ci.price ?? 0,
        lineTotal: (ci.price ?? 0) * ci.quantity,
      }));
  // always set mapped items so the summary reflects the cart immediately
  setItems(mapped);
    } catch (e) {
      // ignore
    }

    // also listen to cross-tab changes on the cart storage key
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'ladulcerina_cart_v1') {
        try {
          const citems = cart.getCartItems();
          const mapped = citems.map(ci => ({
            productId: ci.id,
            name: ci.name ?? (ci as any).title ?? 'Producto',
            qty: ci.quantity,
            unitPrice: ci.price ?? 0,
            lineTotal: (ci.price ?? 0) * ci.quantity,
          }));
          setItems(mapped);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, shipping, address }));
  }, [items, shipping, address]);

  const handleCustomerNext = (values: any) => {
    // store address/data and proceed
    setAddress(values);
    setNotice({ type: 'success', message: 'Guardamos tu dirección' });
    // persist address immediately to checkout_state to avoid races
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '{}';
      const parsed = JSON.parse(raw || '{}');
      parsed.address = values;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {}
    setStep(2);
  };

  const handleCustomerChange = (values: any) => {
    setAddress(values);
    // keep local checkout_state in sync (StepCustomer debounces calls)
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '{}';
      const parsed = JSON.parse(raw || '{}');
      parsed.address = values;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {}
  };

  const handlePaymentNext = async (values: any) => {
    // client-side validation: if shipping is envio, we require an address
    if (shipping.method === 'envio' && !address) {
      setNotice({ type: 'error', message: 'Por favor completa la dirección de envío antes de continuar.' });
      setStep(1);
      return;
    }
    setLoading(true);
    // build checkout payload (use in-memory address state to avoid stale reads)
    const payload: CheckoutPayload = {
      items,
      address: address ?? null,
      shipping,
      paymentMethod: values.paymentMethod,
      idempotencyKey: `cli_${Date.now()}`,
    };

    try {
      const res = await fetch('/api/checkout/initialize', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      console.log('initialize response', json);
      if (!res.ok) {
        setNotice({ type: 'error', message: json?.error || 'No se pudo iniciar el pago' });
        return;
      }

  // persist order info returned by the initialize endpoint so confirm can reference it
  if (json.order) setOrder(json.order);
  if (json.orderId) setOrder((prev: any) => prev ?? { id: json.orderId });
  if (json.orderToken) setOrderToken(json.orderToken);

      // handle response by payment method
      if (json.redirectUrl) {
        // redirect for hosted checkout
        setNotice({ type: 'success', message: 'Redirigiendo al pago seguro...' });
        // small delay to show notice
        setTimeout(() => window.location.assign(json.redirectUrl), 600);
        return;
      }

      if (json.pending && json.provider) {
        // wallet flow: show QR and instructions
        setPaymentResult(json);
        setStep(3);
        return;
      }

      if (json.pending && json.cod) {
        setPaymentResult(json);
        setStep(3);
        return;
      }

      // default: advance to review
  setStep(3);
    } catch (e) {
      console.error(e);
      setNotice({ type: 'error', message: 'Error de red al iniciar el pago' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // call confirm endpoint (mock). Prefer orderToken, then order id from state returned by initialize
      const body: any = { idempotencyKey: `cli_confirm_${Date.now()}` };
      if (orderToken) body.orderToken = orderToken; else if (order && (order.id || order._id)) body.orderId = order.id ?? order._id;

      const res = await fetch('/api/payments/confirm', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      console.log('confirm', json);
      if (!res.ok) {
        setNotice({ type: 'error', message: json?.error || 'No se pudo confirmar el pedido' });
        return;
      }

      // success: mark UI and clear cart
      setNotice({ type: 'success', message: 'Pedido confirmado. Gracias por tu compra.' });
      setPaymentResult(null);
      setOrder(json.order ?? (order ?? null));
      setStep(3);

      try {
        // clear local cart via context
        const citems = cart.getCartItems();
        citems.forEach(it => cart.removeFromCart(it.id));
      } catch (e) {
        // ignore clearing errors
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (paymentSession?: string) => {
    if (!paymentSession) {
      setNotice({ type: 'error', message: 'Payment session no disponible' });
      return;
    }
    setLoading(true);
    try {
      // send paymentSession and the cart payload so backend can create the order atomically on confirmation
      const body: any = { paymentSession, idempotencyKey: `cli_markpaid_${Date.now()}`, items, shipping, address };
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      console.log('markPaid', json);
      if (!res.ok) {
        setNotice({ type: 'error', message: json?.error || 'No se pudo notificar el pago' });
        return;
      }
      setNotice({ type: 'success', message: 'Pago notificado correctamente. Tu pedido ha sido registrado.' });
      // show created order
      setOrder(json.order ?? null);
      // clear pending payment UI
      setPaymentResult(null);
      // clear cart
      try { const citems = cart.getCartItems(); citems.forEach(it => cart.removeFromCart(it.id)); } catch (e) {}
    } catch (e) {
      console.error(e);
      setNotice({ type: 'error', message: 'Error de red al notificar pago' });
    } finally {
      setLoading(false);
    }
  };

  // when moving between steps, ensure the active step is visible and focusable
  useEffect(() => {
    if (step === 2) {
      // small delay to allow DOM to render StepPayment
      setTimeout(() => {
        const el = document.querySelector('input[name="paymentMethod"]') as HTMLElement | null;
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const main = document.getElementById('checkout-main');
          main?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  }, [step]);

  return (
    <div className="container mx-auto py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <main id="checkout-main" className="lg:col-span-2">
        {notice && (
          <div role="status" className={`mb-4 p-3 rounded ${notice.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {notice.message}
          </div>
        )}
        <CheckoutStepper step={step} setStep={setStep} />

  {step === 1 && <StepCustomer defaultValues={address ?? undefined} onNext={handleCustomerNext} onChange={handleCustomerChange} loading={loading} />}
  {step === 2 && <StepPayment onNext={handlePaymentNext} onBack={() => setStep(1)} loading={loading} />}
  {step === 3 && <StepReview itemsCount={items.length} total={items.reduce((s, it) => s + it.lineTotal, 0) + (shipping?.price || 0)} onBack={() => setStep(2)} onConfirm={handleConfirm} loading={loading} paymentResult={paymentResult} onMarkPaid={handleMarkPaid} />}

      </main>

      <aside className="lg:col-span-1">
        <div className="mb-4" role="group" aria-label="Opciones de envío">
          <label className="flex items-center gap-2">
            <input aria-describedby="ship-envio" type="radio" name="shipping" checked={shipping.method === 'envio'} onChange={() => setShipping({ method: 'envio', price: 10 })} />
            <span>Envío (S/10)</span>
          </label>
          <p id="ship-envio" className="text-xs text-gray-500">Entrega en 2–4 días hábiles</p>
          <label className="flex items-center gap-2 mt-2">
            <input aria-describedby="ship-recojo" type="radio" name="shipping" checked={shipping.method === 'recojo'} onChange={() => setShipping({ method: 'recojo', price: 0 })} />
            <span>Recojo en tienda (Gratis)</span>
          </label>
          <p id="ship-recojo" className="text-xs text-gray-500">Recoge tu pedido en nuestra tienda en horario de atención</p>
        </div>
        <OrderSummary items={items} shipping={shipping} address={address} onEditAddress={() => setStep(1)} />
      </aside>
    </div>
  );
}
