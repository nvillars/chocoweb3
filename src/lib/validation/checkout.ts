import { z } from 'zod';

export const phoneRegex = /^\d{9}$/; // Perú 9 dígitos

export const StepCustomerSchema = z.object({
  fullName: z.string().min(2, 'Nombre completo es requerido'),
  email: z.string().email('Email no válido'),
  phone: z.string().regex(phoneRegex, 'El teléfono debe tener 9 dígitos'),
  departamento: z.string().optional(),
  provincia: z.string().optional(),
  distrito: z.string().optional(),
  addressLine1: z.string().optional(),
  reference: z.string().optional(),
});

export const StepPaymentSchema = z.object({
  paymentMethod: z.enum(['card', 'wallet']),
});

export const StepReviewSchema = z.object({
  acceptPolicies: z.boolean().refine(v => v === true, 'Debes aceptar las políticas'),
});

export type StepCustomerValues = z.infer<typeof StepCustomerSchema>;
export type StepPaymentValues = z.infer<typeof StepPaymentSchema>;
export type StepReviewValues = z.infer<typeof StepReviewSchema>;
