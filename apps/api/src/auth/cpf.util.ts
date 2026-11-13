import { createHmac } from 'node:crypto';

const LOCAL_CPF_HASH_SECRET = 'local-only-change-before-production';

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (!/^\d{11}$/.test(cpf) || /^([0-9])\1{10}$/.test(cpf)) return false;

  const digit = (base: string, factor: number) => {
    const sum = [...base].reduce((total, value, index) => total + Number(value) * (factor - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return digit(cpf.slice(0, 9), 10) === Number(cpf[9])
    && digit(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export function hashCpf(cpf: string): string {
  const secret = process.env.CPF_HASH_SECRET
    ?? (process.env.NODE_ENV === 'production' ? undefined : LOCAL_CPF_HASH_SECRET);
  if (!secret) throw new Error('CPF_HASH_SECRET precisa estar configurado em produção.');
  return createHmac('sha256', secret).update(normalizeCpf(cpf)).digest('hex');
}
