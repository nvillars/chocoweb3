import React from 'react';

type Props = {
  step: number;
  setStep: (n: number) => void;
};

export default function CheckoutStepper({ step, setStep }: Props) {
  const steps = ['Datos y envío', 'Pago', 'Confirmación'];
  return (
    <nav aria-label="Progreso del checkout" className="mb-4">
      <ol className="flex gap-2">
        {steps.map((label, i) => {
          const idx = i + 1;
          const state = idx === step ? 'current' : idx < step ? 'done' : 'upcoming';
          return (
            <li key={label}>
              <button
                onClick={() => setStep(idx)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`px-3 py-1 rounded-xl ${state === 'current' ? 'bg-amber-200' : state === 'done' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                {label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
