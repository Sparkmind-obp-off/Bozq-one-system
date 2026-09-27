export type Role = 'owner' | 'operator' | 'capster'
export const can = (role: Role, action: 'operations' | 'administration'): boolean =>
  action === 'operations' || role === 'owner'

const encoder = new TextEncoder()
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
const fromHex = (value: string) => new Uint8Array(value.match(/.{2}/g)?.map(pair => parseInt(pair, 16)) ?? [])

export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))): Promise<string> {
  const base = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, base, 256)
  return `pbkdf2-sha256:100000:${hex(salt)}:${hex(new Uint8Array(bits))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, rounds, salt, hash] = stored.split(':')
  if (algorithm !== 'pbkdf2-sha256' || rounds !== '100000' || !/^[0-9a-f]{32}$/.test(salt || '') || !/^[0-9a-f]{64}$/.test(hash || '')) return false
  const candidate = await hashPassword(password, fromHex(salt))
  const expectedBytes = fromHex(hash)
  const candidateBytes = fromHex(candidate.split(':')[3])
  let difference = 0
  for (let i = 0; i < expectedBytes.length; i++) difference |= expectedBytes[i] ^ candidateBytes[i]
  return difference === 0
}

export function newSessionToken(): string {
  return hex(crypto.getRandomValues(new Uint8Array(32)))
}

export async function digest(value: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))))
}

export function safeText(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}
