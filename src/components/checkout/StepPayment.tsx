import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StepPaymentSchema, StepPaymentValues } from '../../lib/validation/checkout';

type Props = {
  defaultValues?: Partial<StepPaymentValues>;
  onNext: (values: StepPaymentValues) => void;
  onBack?: () => void;
  loading?: boolean;
};

export default function StepPayment({ defaultValues, onNext, onBack, loading }: Props) {
  const { register, handleSubmit } = useForm<StepPaymentValues>({
    resolver: zodResolver(StepPaymentSchema),
    defaultValues: defaultValues as any,
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <fieldset className="space-y-3">
        <legend className="sr-only">Método de pago</legend>
        <label className="flex items-center gap-2">
          <input type="radio" value="card" {...register('paymentMethod')} /> Pago con tarjeta
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" value="wallet" {...register('paymentMethod')} /> Yape/Plin (QR)
        </label>
  {/* COD removed: Contraentrega no es soportado */}

        <div className="flex gap-2">
          {onBack && (
            <button disabled={!!loading} type="button" onClick={onBack} className="rounded-xl px-4 py-2 border">Volver</button>
          )}
          <button disabled={!!loading} type="submit" className="btn-primary rounded-xl px-4 py-2">{loading ? 'Procesando...' : 'Continuar'}</button>
        </div>
      </fieldset>
    </form>
  );
}
