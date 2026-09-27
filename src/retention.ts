import { localDate } from './operations'

export type ReturnState = 'unknown' | 'insufficient_history' | 'active_pattern' | 'due_soon' | 'due' | 'overdue'
const epochDay = (date: string) => Date.parse(date + 'T00:00:00Z') / 86400000
const dateAt = (day: number) => new Date(day * 86400000).toISOString().slice(0, 10)
export function returnPattern(dates: string[], today: string) {
  localDate(today)
  // One completed visit per calendar day; repeated services on a day are not return visits.
  const evidence = [...new Set(dates.map(d => d.slice(0, 10)))].filter(d => { try { localDate(d); return d <= today } catch { return false } }).sort()
  const last_visit = evidence.at(-1) || null
  const days_since_last_visit = last_visit ? epochDay(today) - epochDay(last_visit) : null
  const intervals = evidence.slice(1).map((d, i) => epochDay(d) - epochDay(evidence[i])).filter(n => n > 0)
  const recent = intervals.slice(-5).sort((a, b) => a - b)
  const median = recent.length ? (recent.length % 2 ? recent[Math.floor(recent.length / 2)] : (recent[recent.length / 2 - 1] + recent[recent.length / 2]) / 2) : null
  // At least two intervals from three distinct completed days; no universal cadence.
  if (!last_visit || median === null || intervals.length < 2) return { state: (last_visit ? 'insufficient_history' : 'unknown') as ReturnState, visit_count: evidence.length, last_visit, days_since_last_visit, observed_intervals_days: intervals, observed_interval_days: null, window_start: null, window_end: null, evidence_dates: evidence }
  // +/- 20% of the observed median, minimum 2 days; estimates are deliberately a window.
  const half = Math.max(2, Math.ceil(median * 0.2))
  const start = epochDay(last_visit) + Math.max(1, Math.floor(median - half))
  const end = epochDay(last_visit) + Math.ceil(median + half)
  const day = epochDay(today)
  const state: ReturnState = day < start - half ? 'active_pattern' : day < start ? 'due_soon' : day <= end ? 'due' : 'overdue'
  return { state, visit_count: evidence.length, last_visit, days_since_last_visit, observed_intervals_days: intervals, observed_interval_days: median, window_start: dateAt(start), window_end: dateAt(end), evidence_dates: evidence }
}
