import { neon } from '@neondatabase/serverless'

// D1-compatible, single-backend adapter for pre-cutover verification only.
// NEVER enable alongside writes to D1: a request must select exactly one database.
// Bind NEON_DATABASE_URL as a Cloudflare secret only after approved cutover.
function placeholders(query: string): string {
  let count = 0, quoted = false
  const statement = query.replace(/\browid\b/g, 'consent_seq')
  let output = ''
  for (let i = 0; i < statement.length; i++) {
    const ch = statement[i]
    if (ch === "'") {
      output += ch
      if (quoted && statement[i + 1] === "'") output += statement[++i]
      else quoted = !quoted
    } else if (ch === '?' && !quoted) output += `$${++count}`
    else output += ch
  }
  return output
}

type Statement = { query: string; params: unknown[] }
function rowsWithD1Numbers(result: { rows: Record<string, unknown>[]; fields: { name: string; dataTypeID: number }[] }) {
  return result.rows.map(row => {
    const converted = { ...row }
    for (const field of result.fields) {
      const value = converted[field.name]
      if ((field.dataTypeID === 20 || field.dataTypeID === 1700) && typeof value === 'string' && /^-?\d+$/.test(value)) {
        const number = Number(value)
        if (!Number.isSafeInteger(number)) throw new Error('Numeric result exceeds safe integer range')
        converted[field.name] = number
      }
    }
    return converted
  })
}
export function neonD1Adapter(url: string): D1Database {
  if (!url) throw new Error('Missing Neon secret')
  const sql = neon(url)
  const prepare = (query: string) => {
    let statement: Statement = { query: placeholders(query), params: [] }
    const bound = {
      bind(...params: unknown[]) { statement = { ...statement, params }; return bound },
      async first<T>() {
        const result = await sql.query(statement.query, statement.params as any[], { fullResults: true })
        return (rowsWithD1Numbers(result)[0] ?? null) as T | null
      },
      async all<T>() {
        const result = await sql.query(statement.query, statement.params as any[], { fullResults: true })
        return { results: rowsWithD1Numbers(result) as T[] }
      },
      async run() {
        const result = await sql.query(statement.query, statement.params as any[], { fullResults: true })
        return { meta: { changes: result.rowCount ?? 0 } }
      },
      getStatement: () => statement
    }
    return bound
  }
  return {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      const results = await sql.transaction(tx => statements.map(item => {
        const statement = item.getStatement()
        return tx.query(statement.query, statement.params as any[])
      }), { fullResults: true })
      return results.map(result => ({ meta: { changes: result.rowCount ?? 0 } }))
    }
  } as unknown as D1Database
}
