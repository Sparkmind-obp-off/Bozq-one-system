import { InputError, localTime, normalizeWhatsapp } from './operations'

export type ImportRow = { external_transaction_id: string | null; transaction_time: string; gross_amount: number; customer_name: string | null; customer_whatsapp: string | null; service_text: string | null; payment_method: string | null; reference_text: string | null; fingerprint: string; row_number: number }
const aliases: Record<string, string[]> = {
  external_transaction_id: ['id transaksi', 'transaction id', 'no transaksi', 'nomor transaksi', 'invoice', 'no invoice'],
  transaction_time: ['tanggal', 'tanggal transaksi', 'transaction date', 'datetime', 'waktu transaksi'],
  gross_amount: ['total', 'total transaksi', 'jumlah', 'amount', 'gross amount', 'nominal'],
  customer_name: ['nama pelanggan', 'pelanggan', 'customer', 'customer name'],
  customer_whatsapp: ['whatsapp', 'no hp', 'nomor hp', 'telepon pelanggan', 'customer phone'],
  service_text: ['layanan', 'produk', 'service', 'product', 'item'],
  payment_method: ['metode pembayaran', 'payment method', 'pembayaran'],
  reference_text: ['referensi', 'payment reference', 'no referensi']
}
const required = ['transaction_time', 'gross_amount']
const canonical = (s: string) => s.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
export function parseCsv(input: string): string[][] {
  if (typeof input !== 'string' || !input.trim() || new TextEncoder().encode(input).length > 256000) throw new InputError('CSV kosong atau melebihi 256 KB.')
  const data = input.replace(/^\uFEFF/, '')
  const first = data.split(/\r?\n/, 1)[0]
  const delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ','
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < data.length; i++) {
    const ch = data[i]
    if (quoted) {
      if (ch === '"' && data[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') { if (cell) throw new InputError('Format kutip CSV tidak valid.'); quoted = true }
    else if (ch === delimiter) { row.push(cell.trim()); cell = '' }
    else if (ch === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = '' }
    else if (ch !== '\r') cell += ch
  }
  if (quoted) throw new InputError('Kutip CSV belum ditutup.')
  if (cell || row.length) { row.push(cell.trim()); rows.push(row) }
  if (rows.length < 2 || rows.length > 301) throw new InputError('CSV harus memuat header dan 1–300 baris data.')
  const width = rows[0].length
  if (rows.some(r => r.length !== width)) throw new InputError('Jumlah kolom CSV tidak konsisten.')
  return rows
}
export function detectColumns(headers: string[], mapping?: Record<string, string>): Record<string, number> {
  if (new Set(headers.map(canonical)).size !== headers.length) throw new InputError('Nama kolom CSV tidak boleh berulang.')
  const output: Record<string, number> = {}
  for (const [field, names] of Object.entries(aliases)) {
    const chosen = mapping?.[field]
    if (chosen != null && typeof chosen !== 'string') throw new InputError('Mapping kolom tidak valid.')
    const index = chosen != null ? headers.indexOf(chosen) : headers.findIndex(h => names.includes(canonical(h)))
    if (chosen != null && index < 0) throw new InputError(`Kolom ${field} tidak ditemukan.`)
    if (index >= 0) output[field] = index
  }
  if (mapping && Object.keys(mapping).some(k => !(k in aliases))) throw new InputError('Mapping tidak dikenal.')
  if (required.some(k => output[k] == null) || new Set(Object.values(output)).size !== Object.values(output).length) throw new InputError('Kolom tanggal dan total wajib ada; satu kolom tidak boleh dipakai dua kali.')
  return output
}
function time(value: string): string {
  const normalized = value.trim().replace(' ', 'T')
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return localTime(normalized + 'T00:00')
  return localTime(normalized)
}
function amount(value: string): number {
  const clean = value.trim().replace(/^Rp\s*/i, '').replace(/\s/g, '')
  // Integer rupiah; dots may be thousands separators; cents are not silently rounded.
  const integer = /^\d+$/.test(clean) ? clean : /^\d{1,3}(\.\d{3})+$/.test(clean) ? clean.replace(/\./g, '') : null
  if (!integer || !Number.isSafeInteger(Number(integer)) || Number(integer) > 1000000000) throw new InputError('Total harus rupiah bulat 0–1 miliar.')
  return Number(integer)
}
export function normalizeRow(row: string[], columns: Record<string, number>, rowNumber: number): Omit<ImportRow, 'fingerprint'> {
  const get = (key: string, max = 160) => { const value = columns[key] == null ? '' : row[columns[key]].trim(); if (value.length > max) throw new InputError(`${key} terlalu panjang.`); return value || null }
  const whatsapp = get('customer_whatsapp')
  return {
    external_transaction_id: get('external_transaction_id', 120), transaction_time: time(get('transaction_time') || ''), gross_amount: amount(get('gross_amount') || ''),
    customer_name: get('customer_name'), customer_whatsapp: whatsapp ? normalizeWhatsapp(whatsapp) : null,
    service_text: get('service_text', 300), payment_method: get('payment_method'), reference_text: get('reference_text'), row_number: rowNumber
  }
}
