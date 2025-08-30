import React, { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StepCustomerSchema, StepCustomerValues } from '../../lib/validation/checkout';

type Props = {
  defaultValues?: Partial<StepCustomerValues>;
  onNext: (values: StepCustomerValues) => void;
  loading?: boolean;
  onChange?: (values: StepCustomerValues) => void;
};

export default function StepCustomer({ defaultValues, onNext, loading, onChange }: Props) {
  const { register, handleSubmit, formState: { errors }, control, reset } = useForm<StepCustomerValues>({
    resolver: zodResolver(StepCustomerSchema),
    defaultValues: defaultValues as any,
  });

  // when parent provides updated defaultValues (e.g., from localStorage or autosave), reset the form
  React.useEffect(() => {
    if (defaultValues) {
      reset(defaultValues as any);
    }
  }, [defaultValues, reset]);

  const values = useWatch({ control }) as StepCustomerValues | undefined;
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!onChange) return;
    // debounce autosave
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (values) onChange(values);
    }, 400);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [values, onChange]);

  return (
    <form onSubmit={handleSubmit(onNext)} aria-label="Formulario de datos y envío">
      <div className="grid grid-cols-1 gap-3">
        <label className="flex flex-col">
          <span className="text-sm font-medium">Nombre completo</span>
          <input aria-required="true" aria-invalid={!!errors.fullName} {...register('fullName')} className="rounded-xl p-2 border" />
          {errors.fullName && <small role="alert" className="text-red-600">{errors.fullName.message}</small>}
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Email</span>
          <input aria-required="true" aria-invalid={!!errors.email} {...register('email')} className="rounded-xl p-2 border" />
          {errors.email && <small role="alert" className="text-red-600">{errors.email.message}</small>}
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Teléfono</span>
          <input aria-required="true" aria-invalid={!!errors.phone} placeholder="9 dígitos, ej. 987654321" {...register('phone')} className="rounded-xl p-2 border" />
          {errors.phone && <small role="alert" className="text-red-600">{errors.phone.message}</small>}
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Departamento</span>
          <input {...register('departamento')} className="rounded-xl p-2 border" />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Provincia</span>
          <input {...register('provincia')} className="rounded-xl p-2 border" />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Distrito</span>
          <input {...register('distrito')} className="rounded-xl p-2 border" />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Dirección (línea 1)</span>
          <input {...register('addressLine1')} className="rounded-xl p-2 border" />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium">Referencia</span>
          <input {...register('reference')} className="rounded-xl p-2 border" />
        </label>

        <div className="flex gap-2 mt-2">
          <button disabled={!!loading} type="submit" className="btn-primary rounded-xl px-4 py-2 flex items-center gap-2" aria-busy={!!loading}>
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            Continuar
          </button>
        </div>
      </div>
    </form>
  );
}
