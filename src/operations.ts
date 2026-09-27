export class InputError extends Error {}

export type VisitStatus = 'arrived' | 'in_service' | 'completed' | 'cancelled'
export type BookingStatus = 'confirmed' | 'arrived' | 'in_service' | 'completed' | 'cancelled' | 'no_show'

const visitMoves: Record<string, string[]> = {
  arrived: ['in_service', 'cancelled'],
  in_service: ['completed'],
  completed: [], cancelled: [], no_show: [], expected: ['arrived', 'cancelled', 'no_show']
}
const bookingMoves: Record<string, string[]> = {
  confirmed: ['arrived', 'cancelled', 'no_show'],
  arrived: ['in_service', 'cancelled'],
  in_service: ['completed'],
  completed: [], cancelled: [], no_show: []
}
export function canTransition(type: 'visit' | 'booking', from: string, to: string): boolean {
  return (type === 'visit' ? visitMoves : bookingMoves)[from]?.includes(to) ?? false
}

export function normalizeWhatsapp(input: unknown): string | null {
  if (input == null || input === '') return null
  if (typeof input !== 'string' || !/^\+?[\d ()-]+$/.test(input.trim())) throw new InputError('Nomor WhatsApp tidak valid.')
  const digits = input.replace(/\D/g, '')
  const normalized = digits.startsWith('0') ? '62' + digits.slice(1) : digits
  if (!/^62[1-9]\d{7,12}$/.test(normalized)) throw new InputError('Gunakan nomor WhatsApp Indonesia yang valid.')
  return '+' + normalized
}

export function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function text(value: unknown, max = 80): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new InputError('Teks tidak valid.')
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max) throw new InputError(`Teks harus 1–${max} karakter.`)
  return trimmed
}

export function money(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 100000000) throw new InputError('Harga harus bilangan rupiah yang valid.')
  return value
}

// Input is local wall time at the business, not a UTC instant. YYYY-MM-DD HH:mm sorts lexically.
export function localTime(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new InputError('Tanggal/jam tidak valid.')
  const [date] = value.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const test = new Date(Date.UTC(year, month - 1, day))
  if (test.getUTCFullYear() !== year || test.getUTCMonth() + 1 !== month || test.getUTCDate() !== day) throw new InputError('Tanggal tidak valid.')
  return value
}

export function localDate(value: unknown): string {
  localTime(`${value}T00:00`)
  return value as string
}

export function projectedTotal(values: (number | null)[]): number | null {
  return values.every(value => value !== null) ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null
}
