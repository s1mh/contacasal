import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isConfiguredProfile, maskCurrencyValue, parseDateOnly } from './utils';
import { AVATAR_COUNT, getAvatarSrc, normalizeAvatarIndex } from './avatar-registry';
import { expenseSchema, profileSchema } from './validation';

const baseExpense = {
  description: 'Mercado',
  total_amount: 120.5,
  paid_by: 1,
  split_type: 'equal' as const,
  split_value: { person1: 50, person2: 50 },
  tag_id: null,
  expense_date: '2020-01-15',
  payment_type: 'debit' as const,
  card_id: null,
  billing_month: null,
  installments: 1,
  installment_number: 1,
};

describe('maskCurrencyValue', () => {
  it('mantém o símbolo da moeda e troca os dígitos por asteriscos', () => {
    expect(maskCurrencyValue('R$ 1.500,00')).toMatch(/^R\$ ?\*+$/);
  });

  it('usa no mínimo 4 asteriscos, para não revelar a ordem de grandeza', () => {
    expect(maskCurrencyValue('R$ 5')).toContain('****');
  });
});

describe('isConfiguredProfile', () => {
  it('trata os nomes padrão como perfil não configurado', () => {
    expect(isConfiguredProfile({ name: 'Pessoa 1' })).toBe(false);
    expect(isConfiguredProfile({ name: 'Pessoa' })).toBe(false);
  });

  it('aceita um nome escolhido pela pessoa', () => {
    expect(isConfiguredProfile({ name: 'Lia' })).toBe(true);
  });
});

describe('avatar-registry', () => {
  it('normaliza índices inválidos para o primeiro avatar', () => {
    expect(normalizeAvatarIndex(0)).toBe(1);
    expect(normalizeAvatarIndex(-3)).toBe(1);
    expect(normalizeAvatarIndex(Number.NaN)).toBe(1);
  });

  it('sempre devolve uma imagem, mesmo com índice fora do intervalo', () => {
    expect(getAvatarSrc(1)).toBeTruthy();
    expect(getAvatarSrc(AVATAR_COUNT + 50)).toBeTruthy();
  });
});

describe('expenseSchema', () => {
  it('aceita um gasto válido', () => {
    expect(expenseSchema.safeParse(baseExpense).success).toBe(true);
  });

  it('rejeita valor zero ou negativo', () => {
    expect(expenseSchema.safeParse({ ...baseExpense, total_amount: 0 }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...baseExpense, total_amount: -10 }).success).toBe(false);
  });

  it('rejeita data no futuro', () => {
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const future = next.toISOString().slice(0, 10);
    expect(expenseSchema.safeParse({ ...baseExpense, expense_date: future }).success).toBe(false);
  });

  it('rejeita data em formato inesperado', () => {
    expect(expenseSchema.safeParse({ ...baseExpense, expense_date: '15/01/2020' }).success).toBe(false);
  });

  it('rejeita divisão de tipo desconhecido', () => {
    expect(expenseSchema.safeParse({ ...baseExpense, split_type: 'aleatorio' }).success).toBe(false);
  });
});

describe('profileSchema', () => {
  it('aceita perfil válido e rejeita cor fora do formato #RRGGBB', () => {
    const ok = { name: 'Lia', color: '#F27F5C', avatar_index: 3 };
    expect(profileSchema.safeParse(ok).success).toBe(true);
    expect(profileSchema.safeParse({ ...ok, color: 'coral' }).success).toBe(false);
  });

  it('rejeita nome vazio ou só com espaços', () => {
    expect(profileSchema.safeParse({ name: '   ', color: '#F27F5C', avatar_index: 1 }).success).toBe(false);
  });
});

describe('parseDateOnly', () => {
  const previousTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'America/Sao_Paulo';
  });
  afterAll(() => {
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  });

  it('mantém o dia exato de uma data sem hora, mesmo em UTC-3', () => {
    const d = parseDateOnly('2026-11-14');
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 11, 14]);
  });

  it('não empurra o dia 1º para o mês anterior', () => {
    const d = parseDateOnly('2026-11-01');
    expect(d.getMonth() + 1).toBe(11);
    expect(d.getDate()).toBe(1);
  });

  it('devolve a mesma data quando já recebe um Date', () => {
    const original = new Date(2026, 0, 5, 10, 30);
    expect(parseDateOnly(original)).toBe(original);
  });
});
