"use client";

import React from 'react';

type Props = {
  value: number;
  max: number;
  onChange: (q: number) => void;
  'aria-label'?: string;
  small?: boolean;
};

export default function QuantitySelector({ value, max, onChange, small }: Props) {
  const inc = () => onChange(Math.min(max, value + 1));
  const dec = () => onChange(Math.max(1, value - 1));
  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value || 0);
    if (!Number.isFinite(v)) return;
    onChange(Math.max(1, Math.min(max, Math.floor(v))));
  };

  // slightly larger sizes for the "small" variant to improve usability
  const btnClass = small
    ? 'w-8 h-8 text-sm' // increased from w-6/h-6
    : 'w-9 h-9 text-base';
  const inputClass = small
    ? 'w-12 text-sm px-1 py-0.5'
    : 'w-16 text-base px-2 py-1';

  return (
    <div className={`inline-flex items-center gap-1 ${small ? '' : 'gap-2'}`}>
      <button aria-label="Decrementar cantidad" onClick={dec} disabled={value <= 1} className={`bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center ${btnClass}`}>-</button>
      <input role="spinbutton" aria-valuemin={1} aria-valuemax={max} aria-valuenow={value} type="number" min={1} max={max} value={value} onChange={onInput} className={`text-center rounded border ${inputClass}`} />
      <button aria-label="Incrementar cantidad" onClick={inc} disabled={value >= max} className={`bg-[#4E260E] hover:bg-[#6a331a] text-white rounded-lg flex items-center justify-center ${btnClass}`}>+</button>
    </div>
  );
}
