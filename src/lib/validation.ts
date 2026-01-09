import { z } from 'zod';

// Expense validation schema
export const expenseSchema = z.object({
  description: z.string().max(500, 'Descrição muito longa').nullable(),
  total_amount: z.number().positive('Valor deve ser maior que zero').max(999999999, 'Valor muito alto'),
  paid_by: z.number().min(1).max(2),
  split_type: z.enum(['equal', 'percentage', 'fixed', 'full']),
  split_value: z.object({
    person1: z.number().min(0).max(100),
    person2: z.number().min(0).max(100),
  }),
  tag_id: z.string().uuid().nullable(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  payment_type: z.enum(['debit', 'credit']),
  card_id: z.string().uuid().nullable(),
  billing_month: z.string().nullable(),
  installments: z.number().min(1).max(48),
  installment_number: z.number().min(1).max(48),
});

// Profile validation schema
export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(50, 'Nome muito longo'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  avatar_index: z.number().min(1).max(8),
});

// Tag validation schema
export const tagSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(30, 'Nome muito longo'),
  icon: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
});

// Card validation schema
export const cardSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(50, 'Nome muito longo'),
  type: z.enum(['credit', 'debit']),
  closing_day: z.number().min(1).max(31).nullable(),
  due_day: z.number().min(1).max(31).nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  profile_id: z.string().uuid(),
  couple_id: z.string().uuid(),
});

// Agreement validation schema
export const agreementSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  amount: z.number().positive('Valor deve ser maior que zero').max(999999999, 'Valor muito alto'),
  split_type: z.string(),
  split_value: z.object({
    person1: z.number().min(0).max(100),
    person2: z.number().min(0).max(100),
  }),
  paid_by: z.number().min(1).max(2),
  tag_id: z.string().uuid().nullable(),
  day_of_month: z.number().min(1).max(31),
  is_active: z.boolean(),
  couple_id: z.string().uuid(),
});

// Settlement validation schema
export const settlementSchema = z.object({
  amount: z.number().positive('Valor deve ser maior que zero').max(999999999, 'Valor muito alto'),
  paid_by: z.number().min(1).max(2),
  note: z.string().max(200, 'Nota muito longa').nullable(),
  couple_id: z.string().uuid(),
});

// Helper function for dev-only logging
export const devLog = (message: string, error?: unknown) => {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
};

// Validate and return error message or null
export const validateExpense = (data: unknown): string | null => {
  const result = expenseSchema.safeParse(data);
  if (result.success) return null;
  return result.error.errors[0]?.message || 'Dados inválidos';
};

export const validateProfile = (data: unknown): string | null => {
  const result = profileSchema.safeParse(data);
  if (result.success) return null;
  return result.error.errors[0]?.message || 'Dados inválidos';
};

export const validateTag = (data: unknown): string | null => {
  const result = tagSchema.safeParse(data);
  if (result.success) return null;
  return result.error.errors[0]?.message || 'Dados inválidos';
};

export const validateCard = (data: unknown): string | null => {
  const result = cardSchema.safeParse(data);
  if (result.success) return null;
  return result.error.errors[0]?.message || 'Dados inválidos';
};

export const validateAgreement = (data: unknown): string | null => {
  const result = agreementSchema.safeParse(data);
  if (result.success) return null;
  return result.error.errors[0]?.message || 'Dados inválidos';
};

export const validateSettlement = (data: unknown): string | null => {
  const result = settlementSchema.safeParse(data);
  if (result.success) return null;
  return result.error.errors[0]?.message || 'Dados inválidos';
};
