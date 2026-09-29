import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Bindings, Variables, Principal } from './index'
import { localDate, validId } from './operations'
import { returnPattern } from './retention'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
const branch = 'utama'
const fail = (text: string, status: 400 | 403 | 404 | 409 = 400): never => { throw new HTTPException(status, { message: text }) }
const actor = (c: any): Principal => c.get('principal')
const day = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const id = (v: unknown) => validId(v) ? v : fail('ID tidak valid.')
const txt = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : fail('Teks wajib diisi dan tidak boleh terlalu panjang.')
async function body(c: any) { const v = await c.req.json().catch(() => null); if (!v || typeof v !== 'object' || Array.isArray(v)) fail('Kirim objek JSON.'); return v }
const audit = (db: D1Database, user: string, action: string, entity: string, key: string, after: unknown) => db.prepare('INSERT INTO audit_event(id,branch_id,actor_user_id,action,entity_type,entity_id,after_snapshot) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), branch, user, action, entity, key, JSON.stringify(after))
async function customer(db: D1Database, key: string) { const row = await db.prepare("SELECT id,name,whatsapp,notes,created_at FROM customer WHERE id=? AND branch_id=? AND status='active'").bind(key, branch).first<any>(); if (!row) fail('Pelanggan tidak ditemukan.', 404); return row }
async function consent(db: D1Database, key: string) { const row = await db.prepare("SELECT status,captured_at,source FROM customer_consent WHERE customer_id=? AND channel='whatsapp' AND purpose='reminder' ORDER BY consent_seq DESC LIMIT 1").bind(key).first<any>(); return row || { status: 'unknown', captured_at: null, source: null } }
export function lifecycle(count: number, days: number | null, atRisk: number, inactive: number) {
  if (!count) return 'NEW'
  if (days !== null && days >= inactive) return 'INACTIVE'
  if (days !== null && days >= atRisk) return 'AT_RISK'
  if (count >= 4) return 'LOYAL'
  if (count > 1) return 'RETURNING'
  return 'ACTIVE'
}
async function settings(db: D1Database) { return (await db.prepare('SELECT at_risk_days,inactive_days FROM growth_setting WHERE branch_id=?').bind(branch).first<{ at_risk_days: number; inactive_days: number }>()) || { at_risk_days: 45, inactive_days: 90 } }
async function profile(db: D1Database, key: string, asOf = day()) {
  const c = await customer(db, key)
  const visits = await db.prepare("SELECT occurred_at FROM visit WHERE customer_id=? AND branch_id=? AND status='completed' AND substr(occurred_at,1,10)<=? ORDER BY occurred_at DESC LIMIT 101").bind(key, branch, asOf).all<{ occurred_at: string }>()
  const dates = [...new Set(visits.results.map(v => v.occurred_at.slice(0, 10)))].sort()
  const pattern = returnPattern(dates, asOf)
  const threshold = await settings(db)
  const source = await db.prepare('SELECT source_code,evidence,recorded_at FROM customer_source WHERE customer_id=? ORDER BY recorded_at DESC,id DESC LIMIT 1').bind(key).first()
  const program = await db.prepare('SELECT id,name,eligible_visits_required,reward_service_id FROM loyalty_program WHERE branch_id=? AND active=true ORDER BY created_at DESC LIMIT 1').bind(branch).first<any>()
  const count = program ? await db.prepare('SELECT count(*) AS total FROM loyalty_credit WHERE customer_id=? AND program_id=?').bind(key,program.id).first<{ total: number }>() : null
  const rewards = program ? await db.prepare('SELECT id,earned_at,redeemed_visit_id FROM loyalty_reward WHERE customer_id=? AND program_id=? ORDER BY earned_at DESC').bind(key,program.id).all() : { results: [] }
  return { customer: c, source, consent: await consent(db,key), first_visit: dates[0] || null, latest_visit: pattern.last_visit, visit_days: dates.length, visit_count: visits.results.length, lifecycle: lifecycle(dates.length, pattern.days_since_last_visit,threshold.at_risk_days,threshold.inactive_days), return_opportunity: pattern, loyalty: { program, credits: count?.total || 0, progress: program ? (count?.total || 0) % program.eligible_visits_required : 0, rewards: rewards.results, available: rewards.results.filter((r: any) => !r.redeemed_visit_id).length } }
}
app.use('*', async (c,next) => {
  if (!actor(c)) return c.json({ error: 'Silakan masuk.' },401)
  if (c.env.DB_PRIMARY !== 'neon') return c.json({ error: 'Growth membutuhkan Neon sebagai database primer.' },503)
  await next()
})
app.use('/owner/*', async (c,next) => { if (actor(c).role !== 'owner') return c.json({ error: 'Hanya pemilik.' },403); await next() })
app.get('/growth/customers/:id', async c => c.json(await profile(c.env.DB,id(c.req.param('id')))))
app.patch('/growth/customers/:id/notes', async c => {
  const key=id(c.req.param('id')), prior=await customer(c.env.DB,key), b=await body(c)
  if (typeof b.notes !== 'string' || b.notes.length>500) fail('Catatan maksimal 500 karakter.')
  await c.env.DB.batch([c.env.DB.prepare('UPDATE customer SET notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND branch_id=?').bind(b.notes.trim() || null,key,branch),audit(c.env.DB,actor(c).id,'growth_notes_updated','customer',key,{ notes: b.notes.trim() || null, prior_present: !!prior.notes })])
  return c.json({ ok: true })
})
app.post('/growth/customers/:id/source', async c => {
  const key=id(c.req.param('id')); await customer(c.env.DB,key); const b=await body(c)
  if (!['walk_in','whatsapp','referral','google','instagram','existing','other','unknown'].includes(b.source_code)) fail('Sumber tidak dikenal.')
  const evidence=b.evidence == null || b.evidence === '' ? null : txt(b.evidence,200)
  const sourceId=crypto.randomUUID()
  await c.env.DB.batch([c.env.DB.prepare('INSERT INTO customer_source(id,customer_id,source_code,evidence,observed_by) VALUES (?,?,?,?,?)').bind(sourceId,key,b.source_code,evidence,actor(c).id),audit(c.env.DB,actor(c).id,'source_recorded','customer_source',sourceId,{ customer_id:key,source_code:b.source_code })])
  return c.json({ id:sourceId },201)
})
app.get('/growth/program', async c => { const row=await c.env.DB.prepare('SELECT id,name,eligible_visits_required,reward_service_id FROM loyalty_program WHERE branch_id=? AND active=true ORDER BY created_at DESC LIMIT 1').bind(branch).first(); return c.json({ program:row }) })
app.post('/owner/growth/program', async c => {
  const b=await body(c), serviceId=id(b.service_id), service=await c.env.DB.prepare('SELECT id,name FROM service WHERE id=? AND branch_id=? AND active=1').bind(serviceId,branch).first()
  if (!service) fail('Pilih layanan potong rambut yang aktif.')
  const existing=await c.env.DB.prepare('SELECT id FROM loyalty_program WHERE branch_id=? AND active=true LIMIT 1').bind(branch).first()
  if (existing) fail('Program aktif sudah ada; tidak mengganti aturan saat kredit berjalan.',409)
  const key=crypto.randomUUID()
  await c.env.DB.batch([c.env.DB.prepare('INSERT INTO loyalty_program(id,branch_id,name,eligible_visits_required,reward_service_id) VALUES (?,?,?,4,?)').bind(key,branch,'4 potong rambut → 1 gratis',serviceId),audit(c.env.DB,actor(c).id,'loyalty_program_created','loyalty_program',key,{ service_id:serviceId,eligible_visits_required:4 })])
  return c.json({ id:key },201)
})
app.post('/growth/loyalty/award', async c => {
  const b=await body(c), visitId=id(b.visit_id), programId=id(b.program_id)
  const row=await c.env.DB.prepare('SELECT p.id FROM loyalty_program p JOIN visit v ON v.branch_id=p.branch_id WHERE p.id=? AND p.branch_id=? AND v.id=? AND v.status=? AND v.customer_id IS NOT NULL AND v.service_id=p.reward_service_id').bind(programId,branch,visitId,'completed').first()
  if (!row) fail('Kunjungan selesai dengan layanan potong rambut terpilih diperlukan.',409)
  const result=await c.env.DB.prepare('SELECT award_haircut(?,?,?) AS reward_id').bind(visitId,programId,actor(c).id).first<{ reward_id: string | null }>()
  if (!result?.reward_id) {
    const awarded=await c.env.DB.prepare('SELECT visit_id FROM loyalty_credit WHERE visit_id=? AND program_id=?').bind(visitId,programId).first()
    if (!awarded) fail('Kunjungan tidak memenuhi syarat atau sudah dipakai untuk penukaran.',409)
  }
  // Audit only newly granted credits (idempotent repeat does not create another audit entry).
  const previous=await c.env.DB.prepare('SELECT id FROM audit_event WHERE action=? AND entity_id=? LIMIT 1').bind('loyalty_credit_awarded',visitId).first()
  if (!previous) await audit(c.env.DB,actor(c).id,'loyalty_credit_awarded','visit',visitId,{ program_id:programId,reward_id:result?.reward_id }).run()
  return c.json({ visit_id:visitId,reward_id:result?.reward_id || null, note:'Kredit hanya untuk layanan selesai; bukan bukti pembayaran.' })
})
app.post('/growth/loyalty/redeem', async c => {
  const b=await body(c), rewardId=id(b.reward_id), visitId=id(b.visit_id)
  const row=await c.env.DB.prepare('SELECT r.id FROM loyalty_reward r JOIN customer cu ON cu.id=r.customer_id JOIN loyalty_program p ON p.id=r.program_id WHERE r.id=? AND cu.branch_id=? AND p.branch_id=? AND r.redeemed_visit_id IS NULL').bind(rewardId,branch,branch).first()
  if (!row) fail('Reward tidak tersedia.',409)
  const result=await c.env.DB.prepare('SELECT redeem_haircut(?,?) AS redeemed').bind(rewardId,visitId).first<{ redeemed:boolean }>()
  if (!result?.redeemed) fail('Reward sudah ditukar.',409)
  await audit(c.env.DB,actor(c).id,'loyalty_reward_redeemed','loyalty_reward',rewardId,{ visit_id:visitId, payment_recorded:false }).run()
  return c.json({ redeemed:true,note:'Catatan hadiah saja; bukan transaksi Kasir Pro.' })
})
app.get('/growth/queue', async c => {
  const rows=await c.env.DB.prepare("SELECT a.id,a.customer_id,c.name,a.kind,a.reason,a.status,a.outcome,a.created_at,a.completed_at FROM growth_action a JOIN customer c ON c.id=a.customer_id WHERE a.branch_id=? AND c.status='active' ORDER BY CASE WHEN a.status IN ('open','prepared','handoff_opened') THEN 0 ELSE 1 END,a.created_at DESC LIMIT 60").bind(branch).all<any>()
  const actions=await Promise.all(rows.results.map(async r => ({ ...r, consent:await consent(c.env.DB,r.customer_id) })))
  return c.json({ actions, note:'Tidak ada pesan otomatis. Periksa consent saat handoff manual.' })
})
app.post('/growth/queue', async c => {
  const b=await body(c), customerId=id(b.customer_id); await customer(c.env.DB,customerId)
  if (!['follow_up','reactivate','loyalty_reward','ask_referral','record_source','update_consent'].includes(b.kind)) fail('Aksi tidak valid.')
  const reason=txt(b.reason,300), key=crypto.randomUUID()
  await c.env.DB.batch([c.env.DB.prepare('INSERT INTO growth_action(id,branch_id,customer_id,kind,reason,created_by) VALUES (?,?,?,?,?,?)').bind(key,branch,customerId,b.kind,reason,actor(c).id),audit(c.env.DB,actor(c).id,'growth_action_created','growth_action',key,{ customer_id:customerId,kind:b.kind })])
  return c.json({ id:key },201)
})
app.patch('/growth/queue/:id', async c => {
  const key=id(c.req.param('id')), b=await body(c)
  if (!['prepared','handoff_opened','done','dismissed'].includes(b.status)) fail('Status aksi tidak valid.')
  const previous=await c.env.DB.prepare('SELECT a.id,a.customer_id,a.kind,a.status FROM growth_action a WHERE a.id=? AND a.branch_id=?').bind(key,branch).first<any>()
  if (!previous) fail('Aksi tidak ditemukan.',404)
  if (['done','dismissed'].includes(previous.status)) fail('Aksi sudah ditutup.',409)
  if (b.status==='handoff_opened' && (await consent(c.env.DB,previous.customer_id)).status!=='yes') fail('Consent WhatsApp saat ini tidak mengizinkan handoff.',403)
  const outcome=b.outcome == null ? null : txt(b.outcome,300)
  if (b.status==='done' && !outcome) fail('Catat hasil nyata sebelum menandai selesai.')
  await c.env.DB.batch([c.env.DB.prepare('UPDATE growth_action SET status=?,outcome=?,completed_at=? WHERE id=? AND branch_id=?').bind(b.status,outcome,['done','dismissed'].includes(b.status)?new Date().toISOString():null,key,branch),audit(c.env.DB,actor(c).id,'growth_action_updated','growth_action',key,{ before:previous.status,status:b.status,outcome })])
  return c.json({ ok:true, note:'Handoff tidak membuktikan pesan terkirim.' })
})
app.get('/growth/referrals', async c => { const rows=await c.env.DB.prepare('SELECT r.id,r.referrer_id,r.referred_id,r.status,r.reward_status,r.recorded_at FROM referral r WHERE r.branch_id=? ORDER BY r.recorded_at DESC LIMIT 60').bind(branch).all(); return c.json({ referrals:rows.results }) })
app.post('/growth/referrals', async c => {
  const b=await body(c), referrer=id(b.referrer_id), referred=id(b.referred_id)
  if (referrer===referred) fail('Perujuk harus berbeda.')
  await customer(c.env.DB,referrer); await customer(c.env.DB,referred)
  if (await c.env.DB.prepare('SELECT id FROM referral WHERE referred_id=?').bind(referred).first()) fail('Pelanggan ini sudah memiliki rujukan.',409)
  const key=crypto.randomUUID()
  await c.env.DB.batch([c.env.DB.prepare('INSERT INTO referral(id,branch_id,referrer_id,referred_id,recorded_by) VALUES (?,?,?,?,?)').bind(key,branch,referrer,referred,actor(c).id),audit(c.env.DB,actor(c).id,'referral_recorded','referral',key,{ referrer,referred })])
  return c.json({ id:key,status:'recorded',reward_status:'none' },201)
})
app.get('/growth/campaigns', async c => { const rows=await c.env.DB.prepare('SELECT id,name,kind,audience,content,consent_required,status,created_at FROM growth_campaign WHERE branch_id=? ORDER BY created_at DESC LIMIT 60').bind(branch).all(); return c.json({ campaigns:rows.results }) })
app.post('/owner/growth/campaigns', async c => {
  const b=await body(c)
  if (!['retention','reactivation','loyalty','referral','new_customer','seasonal'].includes(b.kind)) fail('Jenis kampanye tidak valid.')
  const key=crypto.randomUUID(), name=txt(b.name,80), audience=txt(b.audience,200), content=txt(b.content,500)
  if (name.length<2 || audience.length<2 || content.length<2) fail('Isi detail kampanye.')
  await c.env.DB.batch([c.env.DB.prepare('INSERT INTO growth_campaign(id,branch_id,name,kind,audience,content,consent_required,created_by) VALUES (?,?,?,?,?, ?,true,?)').bind(key,branch,name,b.kind,audience,content,actor(c).id),audit(c.env.DB,actor(c).id,'campaign_drafted','growth_campaign',key,{ name,kind:b.kind })])
  return c.json({ id:key,status:'draft',sent:0 },201)
})
app.get('/growth/report', async c => {
  const asOf=localDate(c.req.query('date') || day())
  const dates=Array.from({length:15},(_,n)=>new Date(Date.parse(asOf+'T00:00:00Z')-n*86400000).toISOString().slice(0,10))
  const start=dates[6], previous=dates[13], yesterday=dates[1], month=asOf.slice(0,7)
  const db=c.env.DB
  const customers=await db.prepare("SELECT id,created_at FROM customer WHERE branch_id=? AND status='active'").bind(branch).all<any>()
  const visits=await db.prepare("SELECT v.customer_id,v.occurred_at,v.service_id,s.name AS service FROM visit v LEFT JOIN service s ON s.id=v.service_id WHERE v.branch_id=? AND v.status='completed' AND substr(v.occurred_at,1,10)<=? ORDER BY v.occurred_at DESC LIMIT 10000").bind(branch,asOf).all<any>()
  const financial=await db.prepare("SELECT business_date,transaction_count,actual_revenue FROM growth_actual_daily WHERE branch_id=? AND business_date<=? AND business_date>=?").bind(branch,asOf,previous < month+'-01' ? previous : month+'-01').all<any>()
  const source=await db.prepare('SELECT c.id,(SELECT source_code FROM customer_source s WHERE s.customer_id=c.id ORDER BY recorded_at DESC,id DESC LIMIT 1) AS source FROM customer c WHERE c.branch_id=? AND c.status=?').bind(branch,'active').all<any>()
  const loyalty=await db.prepare('SELECT (SELECT count(*) FROM loyalty_credit lc JOIN visit v ON v.id=lc.visit_id WHERE v.branch_id=? AND substr(v.occurred_at,1,10)>=? AND substr(v.occurred_at,1,10)<=?) AS credits_week,(SELECT count(*) FROM loyalty_reward lr JOIN customer c ON c.id=lr.customer_id WHERE c.branch_id=? AND lr.redeemed_visit_id IS NULL) AS rewards_available').bind(branch,start,asOf,branch).first<any>()
  const referrals=await db.prepare('SELECT count(*) AS total FROM referral WHERE branch_id=? AND recorded_at::date BETWEEN ?::date AND ?::date').bind(branch,start,asOf).first<{total:number}>()
  const queue=await db.prepare("SELECT count(*) AS total FROM growth_action WHERE branch_id=? AND status IN ('open','prepared','handoff_opened')").bind(branch).first<{total:number}>()
  const threshold=await settings(db)
  const byCustomer=new Map<string,string[]>(); for(const v of visits.results) if(v.customer_id) byCustomer.set(v.customer_id,[...(byCustomer.get(v.customer_id)||[]),v.occurred_at.slice(0,10)])
  const classified=customers.results.map(c=>{ const d=byCustomer.get(c.id)||[]; const days=d.length?Math.floor((Date.parse(asOf+'T00:00:00Z')-Date.parse(d[0]+'T00:00:00Z'))/86400000):null; return { ...c, lifecycle:lifecycle(new Set(d).size,days,threshold.at_risk_days,threshold.inactive_days) } })
  const completed=visits.results
  const between=(s:string,e:string)=>(v:any)=>v.occurred_at.slice(0,10)>=s&&v.occurred_at.slice(0,10)<=e
  const week=completed.filter(between(start,asOf)), prev=completed.filter(between(previous,dates[7])), daily=completed.filter(between(asOf,asOf))
  const repeat=(items:any[])=>{const ids=new Set<string>(items.map(v=>v.customer_id).filter(Boolean));return { count:[...ids].filter(key=>{const first=items.filter(v=>v.customer_id===key).map(v=>v.occurred_at.slice(0,10)).sort()[0];return (byCustomer.get(key)||[]).some(d=>d<first)}).length, denominator:ids.size }}
  const sum=(s:string,e:string)=>{ const found=financial.results.filter(v=>v.business_date>=s&&v.business_date<=e); if (!found.length) return { revenue:null,transactions:0,average_transaction_value:null }; const revenue=found.reduce((a,v)=>a+Number(v.actual_revenue),0), transactions=found.reduce((a,v)=>a+Number(v.transaction_count),0);return { revenue,transactions,average_transaction_value:transactions ? Math.round(revenue/transactions) : null } }
  const serviceCounts=new Map<string,number>(); for(const v of week) serviceCounts.set(v.service||'Belum dipilih',(serviceCounts.get(v.service||'Belum dipilih')||0)+1)
  const sources=Object.fromEntries([...new Set(source.results.map(v=>v.source||'unknown'))].map(k=>[k,source.results.filter(v=>(v.source||'unknown')===k).length]))
  const newCustomers=(s:string,e:string)=>customers.results.filter(v=>v.created_at.slice(0,10)>=s&&v.created_at.slice(0,10)<=e).length
  return c.json({ as_of:asOf, thresholds:threshold, data_scope:{ completed_visits:completed.length, customer_records:customers.results.length, transaction_source:'Kasir Pro CSV only', visit_history_capped:completed.length===10000 }, today:{ visits:daily.length, new_customers:newCustomers(asOf,asOf), returning_customers:new Set(daily.map(v=>v.customer_id).filter(Boolean)).size, revenue:sum(asOf,asOf), rewards_available:loyalty?.rewards_available||0, open_actions:queue?.total||0 }, week:{ start,end:asOf, visits:week.length, new_customers:newCustomers(start,asOf), returning_customers:repeat(week).count, repeat_rate: repeat(week).denominator ? repeat(week).count/repeat(week).denominator : null, revenue:sum(start,asOf), top_services:[...serviceCounts].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count})), credits:loyalty?.credits_week||0, referrals:referrals?.total||0 }, previous_week:{ visits:prev.length,new_customers:newCustomers(previous,dates[7]),revenue:sum(previous,dates[7]) }, month:{ visits:completed.filter(v=>v.occurred_at.slice(0,7)===month).length,revenue:sum(month+'-01',asOf) }, customers:{ total:classified.length,active:classified.filter(v=>!['INACTIVE','AT_RISK'].includes(v.lifecycle)).length,inactive:classified.filter(v=>v.lifecycle==='INACTIVE').length,at_risk:classified.filter(v=>v.lifecycle==='AT_RISK').length,repeat:classified.filter(v=>(byCustomer.get(v.id)||[]).length>=2).length }, sources, note:'Revenue hanya snapshot transaksi CSV; kosong berarti belum ada bukti transaksi, bukan nol. Hitungan kunjungan hanya status selesai. Sampel kecil tidak cukup untuk kesimpulan tren.' })
})
app.put('/owner/growth/settings', async c => {
  const b=await body(c)
  if (!Number.isInteger(b.at_risk_days)||!Number.isInteger(b.inactive_days)||b.at_risk_days<1||b.inactive_days>730||b.inactive_days<=b.at_risk_days) fail('Ambang hari tidak valid.')
  await c.env.DB.batch([c.env.DB.prepare('INSERT INTO growth_setting(branch_id,at_risk_days,inactive_days) VALUES (?,?,?) ON CONFLICT (branch_id) DO UPDATE SET at_risk_days=excluded.at_risk_days,inactive_days=excluded.inactive_days,updated_at=now()').bind(branch,b.at_risk_days,b.inactive_days),audit(c.env.DB,actor(c).id,'growth_thresholds_updated','branch',branch,{ at_risk_days:b.at_risk_days,inactive_days:b.inactive_days })])
  return c.json({ ok:true })
})
export default app
