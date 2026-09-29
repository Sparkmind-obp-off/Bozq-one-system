const root = document.querySelector('#app')
let currentUser = null
let screen = 'today'
let bookingDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const labels = { confirmed: 'Terkonfirmasi', arrived: 'Tiba', in_service: 'Dilayani', completed: 'Selesai', cancelled: 'Batal', no_show: 'Tidak hadir' }
const rupiah = amount => amount == null ? 'Belum tersedia' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text != null) element.textContent = text; return element }
const button = (title, action, secondary = false) => { const element = node('button', secondary ? 'secondary' : '', title); element.type = 'button'; element.onclick = action; return element }
const id = () => crypto.randomUUID()

async function request(path, options = {}) {
  const { headers = {}, ...rest } = options
  let response
  try { response = await fetch(path, { credentials: 'same-origin', ...rest, headers: { 'Content-Type': 'application/json', ...headers } }) }
  catch { throw new Error('Tidak terhubung. Pekerjaan fisik tetap berjalan; perubahan BELUM tersimpan. Coba kembali saat tersambung.') }
  let data
  try { data = await response.json() }
  catch { throw new Error(`Respons layanan tidak valid (HTTP ${response.status}). Perubahan belum dapat dipastikan tersimpan; periksa data sebelum mencoba lagi.`) }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`Respons layanan tidak valid (HTTP ${response.status}). Periksa data sebelum mencoba lagi.`)
  if (!response.ok) {
    if (response.status === 401 && currentUser) { currentUser = null; showLogin(); throw new Error('Sesi berakhir. Silakan masuk kembali; perubahan belum tersimpan.') }
    throw new Error(typeof data.error === 'string' ? data.error : `Permintaan gagal (HTTP ${response.status}). Perubahan belum tersimpan.`)
  }
  return data
}
const write = (path, method, data) => request(path, { method, body: JSON.stringify(data) })
const clear = () => { root.replaceChildren(); const feedback = node('p', 'feedback'); feedback.id = 'feedback'; feedback.setAttribute('role', 'status'); root.append(feedback) }
const message = (text, state = 'error') => { const element = document.querySelector('#feedback'); if (element) { element.textContent = text; element.className = `feedback ${state}` } }
const heading = (title, subtitle) => { const section = node('section', 'welcome'); section.append(node('h1', '', title), node('p', '', subtitle)); root.append(section); return section }
const panel = title => { const section = node('section', 'panel'); section.append(node('h2', '', title)); root.append(section); return section }
const form = (html, onSubmit, label = 'Simpan') => {
  const element = document.createElement('form'); element.innerHTML = html
  const submit = node('button', '', label); submit.type = 'submit'; element.append(submit)
  element.onsubmit = async event => {
    event.preventDefault(); submit.disabled = true; message('Menyimpan...', 'pending')
    try { await onSubmit(new FormData(element)) }
    catch (error) { message(error.message) }
    finally { submit.disabled = false }
  }
  return element
}
const statusTag = status => node('span', `status status-${status}`, labels[status] || status)
const select = (name, entries, empty = 'Tidak ditentukan') => {
  const element = document.createElement('select'); element.name = name
  element.append(new Option(empty, ''))
  entries.forEach(entry => element.append(new Option(entry.name || entry.display_name || entry.id, entry.id)))
  return element
}
const field = (title, control) => { const label = node('label', '', title); label.append(control); return label }
const addSelect = (formNode, title, name, entries, empty) => { const element = select(name, entries, empty); formNode.insertBefore(field(title, element), formNode.lastElementChild); return element }
const navButton = (text, key) => button(text, () => show(key), screen !== key)

async function start() {
  try {
    const state = await request('/api/status')
    if (!state.ready) return showSetup()
    if (!state.authenticated) return showLogin()
    const result = await request('/api/me'); currentUser = result.user; show('today')
  } catch (error) { clear(); heading('Belum tersambung', error.message); root.append(button('Coba lagi', start)) }
}
function showSetup() {
  clear(); heading('Siapkan Bosku', 'Pembuatan pemilik pertama. Di produksi gunakan kode setup dari operator deployment; lokal tidak memerlukan kode.')
  const local = ['localhost', '127.0.0.1'].includes(location.hostname)
  panel('Akun pemilik').append(form(`${local ? '' : '<label>Kode setup produksi<input name="setup_code" type="password" required autocomplete="off"></label>'}<label>Nama<input name="name" required minlength="2"></label><label>Username<input name="username" required minlength="3"></label><label>Sandi pribadi (minimal 12 karakter)<input name="password" type="password" required minlength="12" autocomplete="new-password"></label>`, async fields => {
    const data = Object.fromEntries(fields); const code = data.setup_code; delete data.setup_code
    await request('/api/bootstrap', { method: 'POST', headers: code ? { 'X-Bootstrap-Token': code } : {}, body: JSON.stringify(data) }); await start()
  }, 'Buat akun pemilik'))
}
function showLogin() {
  clear(); heading('Masuk ke Bosku', 'Layanan operasional · Kasir Pro tetap sumber transaksi.')
  panel('Akun tim').append(form('<label>Username<input name="username" required autocomplete="username"></label><label>Sandi<input name="password" type="password" required autocomplete="current-password"></label>', async data => { await write('/api/login', 'POST', Object.fromEntries(data)); await start() }, 'Masuk'))
}
function show(key) {
  screen = key; clear()
  const nav = node('nav', 'app-nav'); nav.setAttribute('aria-label', 'Menu utama')
  nav.append(navButton('Hari ini', 'today'), navButton('Pelanggan', 'customers'), navButton('Booking', 'bookings'), navButton('Peluang kembali', 'returns'), navButton('Growth', 'growth'))
  if (currentUser.role === 'owner') nav.append(navButton('Impor Kasir Pro', 'import'), navButton('Pengaturan', 'settings'))
  nav.append(button('Keluar', async () => { try { await write('/api/logout', 'POST', {}); currentUser = null; showLogin() } catch (e) { message(e.message) } }, true))
  root.append(nav)
  const views = { today: showToday, customers: showCustomers, bookings: showBookings, returns: showReturns, growth: showGrowth, import: showImport, settings: showSettings }
  return Promise.resolve(views[key]?.()).catch(error => message(error.message))
}

async function pickers() {
  const [capsters, services, customers] = await Promise.all([request('/api/capsters'), request('/api/services'), request('/api/customers')])
  return { capsters: capsters.capsters, services: services.services, customers: customers.customers }
}
function customerPicker(formNode, customers) {
  const wrapper = node('section', 'customer-picker')
  const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Cari nama / WhatsApp'; search.setAttribute('aria-label', 'Cari pelanggan')
  const choice = select('customer_id', customers, 'Anonim / tanpa pelanggan')
  let timer
  search.oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
    try { const result = await request('/api/customers?q=' + encodeURIComponent(search.value)); choice.replaceChildren(new Option('Anonim / tanpa pelanggan', '')); result.customers.forEach(entry => choice.append(new Option(`${entry.name || 'Tanpa nama'} ${entry.whatsapp || ''}`, entry.id))) }
    catch (e) { message(e.message) }
  }, 250) }
  wrapper.append(field('Temukan pelanggan (opsional)', search), field('Pilih pelanggan', choice))
  formNode.insertBefore(wrapper, formNode.lastElementChild)
  return choice
}
function walkInForm(catalog, selectedCustomer = '') {
  const section = panel('Walk-in cepat')
  section.append(node('p', '', 'Tanpa booking dan tanpa data pelanggan pun bisa. Catat tiba dulu, transaksi tetap di Kasir Pro.'))
  const formNode = form('<label>Catatan layanan (opsional)<input name="service_summary" maxlength="120" placeholder="Jika belum ada di katalog"></label>', async data => {
    const payload = Object.fromEntries(data)
    payload.id = formNode.dataset.requestId || (formNode.dataset.requestId = id())
    try { await write('/api/visits', 'POST', payload); formNode.dataset.requestId = ''; message('Walk-in tercatat di server.', 'success'); await renderTodayList() }
    catch (e) { throw e }
  }, 'Catat walk-in tiba')
  const customer = customerPicker(formNode, catalog.customers); customer.value = selectedCustomer
  addSelect(formNode, 'Layanan', 'service_id', catalog.services)
  addSelect(formNode, 'Capster', 'capster_id', catalog.capsters)
  section.append(formNode)
}
async function showToday() {
  heading('Hari ini', 'Walk-in lebih dulu. Status layanan bukan bukti pembayaran.')
  const metrics = panel('Kondisi hari ini'); metrics.id = 'today-metrics'
  const catalog = await pickers(); walkInForm(catalog)
  const list = panel('Aktivitas'); list.id = 'today-list'
  await renderTodayList()
}
async function renderTodayList() {
  const [summary, visits, bookings] = await Promise.all([request('/api/today'), request('/api/visits'), request('/api/bookings')])
  const metrics = document.querySelector('#today-metrics'); const list = document.querySelector('#today-list'); if (!metrics || !list) return
  metrics.replaceChildren(node('h2', '', 'Kondisi hari ini'))
  const pills = node('div', 'metrics')
  for (const [key, title] of Object.entries({ confirmed: 'Terkonfirmasi', walk_in: 'Walk-in', arrived: 'Tiba', in_service: 'Dilayani', completed: 'Selesai', cancelled: 'Batal', no_show: 'Tidak hadir' })) {
    const metric = node('article', 'metric'); metric.append(node('strong', '', summary.counts[key]), node('small', '', title)); pills.append(metric)
  }
  metrics.append(pills)
  const moneyPanel = node('div', 'money-grid')
  const projection = node('article', 'money-card'); projection.append(node('small', '', 'PROYEKSI BOOKING AKTIF'), node('strong', '', rupiah(summary.projected_value)), node('small', '', summary.projection_incomplete ? 'Sebagian harga belum diatur; jumlah tidak lengkap.' : 'Berdasarkan harga layanan yang dikonfigurasi.'))
  const actual = node('article', 'money-card'); actual.append(node('small', '', 'AKTUAL KASIR PRO'), node('strong', '', summary.actual_value == null ? 'Actual transaction data belum tersedia' : rupiah(summary.actual_value)), node('small', '', 'Hanya dari transaksi Kasir Pro yang diimpor. Selesai layanan ≠ dibayar.'))
  moneyPanel.append(projection, actual); metrics.append(moneyPanel)
  try { const growth = await request('/api/growth/report'); const quick = node('p', 'growth-summary', `Pelanggan baru ${growth.today.new_customers} · Kunjungan selesai ${growth.today.visits} · Hadiah tersedia ${growth.today.rewards_available} · Aksi terbuka ${growth.today.open_actions}`); metrics.append(quick) } catch { /* Existing D1 rollback remains usable without Growth. */ }
  list.replaceChildren(node('h2', '', 'Aktivitas'))
  if (!visits.visits.length && !bookings.bookings.length) list.append(node('p', '', 'Belum ada aktivitas tercatat.'))
  bookings.bookings.forEach(entry => list.append(bookingCard(entry, true)))
  visits.visits.filter(entry => entry.source === 'walk_in').forEach(entry => list.append(visitCard(entry)))
}
function visitCard(visit) {
  const card = node('article', 'activity-card')
  const top = node('div', 'activity-top'); top.append(node('strong', '', visit.customer_name || 'Walk-in anonim'), statusTag(visit.status))
  card.append(top, node('p', '', `${visit.service_name || visit.service_summary || 'Layanan belum dipilih'} · ${visit.capster_name || 'Capster belum dipilih'} · ${visit.occurred_at.slice(11, 16)}`))
  const actions = node('div', 'actions')
  const next = { arrived: 'in_service', in_service: 'completed' }[visit.status]
  if (next) actions.append(button(next === 'completed' ? 'Selesaikan layanan' : 'Mulai layanan', async () => {
    try { await write(`/api/visits/${visit.id}/status`, 'PATCH', { status: next }); message('Status kunjungan tersimpan.', 'success'); await renderTodayList() } catch (e) { message(e.message) }
  }))
  if (visit.status === 'arrived') actions.append(button('Batalkan', async () => { try { await write(`/api/visits/${visit.id}/status`, 'PATCH', { status: 'cancelled' }); message('Kunjungan dibatalkan.', 'success'); await renderTodayList() } catch (e) { message(e.message) } }, true))
  card.append(actions); return card
}

function bookingCard(booking, fromToday = false) {
  const card = node('article', 'activity-card')
  const top = node('div', 'activity-top'); top.append(node('strong', '', booking.customer_name || 'Booking tanpa identitas'), statusTag(booking.status))
  card.append(top, node('p', '', `${booking.scheduled_start.replace('T', ' ')} · ${booking.party_size} orang · ${booking.capster_name || 'Capster bebas'}`))
  card.append(node('p', 'projection-note', `Proyeksi: ${rupiah(booking.projected_value)} · Aktual: belum tersedia`))
  const actions = node('div', 'actions')
  const next = { confirmed: 'arrived', arrived: 'in_service', in_service: 'completed' }[booking.status]
  if (next) actions.append(button({ arrived: 'Tandai tiba', in_service: 'Mulai layanan', completed: 'Selesaikan layanan' }[next], async () => {
    try { await write(`/api/bookings/${booking.id}/status`, 'PATCH', { status: next }); message('Status booking tersimpan.', 'success'); if (fromToday) await renderTodayList(); else await showBookingList() }
    catch (e) { message(e.message) }
  }))
  if (booking.status === 'confirmed') actions.append(button('Tidak hadir', async () => { try { await write(`/api/bookings/${booking.id}/status`, 'PATCH', { status: 'no_show' }); message('Dicatat tidak hadir.', 'success'); if (fromToday) await renderTodayList(); else await showBookingList() } catch (e) { message(e.message) } }, true))
  if (['confirmed', 'arrived'].includes(booking.status)) actions.append(button('Batalkan', async () => { try { await write(`/api/bookings/${booking.id}/status`, 'PATCH', { status: 'cancelled' }); message('Booking dibatalkan.', 'success'); if (fromToday) await renderTodayList(); else await showBookingList() } catch (e) { message(e.message) } }, true))
  actions.append(button('Detail orang', async () => { try {
    const data = await request(`/api/bookings/${booking.id}`)
    const details = node('ul', 'people-list')
    data.people.forEach((p, index) => details.append(node('li', '', `${index + 1}. ${p.customer_name || 'Anonim'} · ${p.service_name || 'Layanan belum dipilih'} · ${p.capster_name || 'Capster belum dipilih'} · ${p.visit_status ? (labels[p.visit_status] || p.visit_status) : 'Belum tiba'}`)))
    card.querySelector('.people-list')?.remove(); card.append(details)
  } catch (e) { message(e.message) } }, true))
  card.append(actions); return card
}

async function showBookings() {
  heading('Booking', 'Opsional. Satu booking dapat berisi beberapa orang, masing-masing dapat ditelusuri.')
  const catalog = await pickers()
  const section = panel('Booking baru')
  const bookingForm = form('<label>Jadwal<input name="scheduled_start" type="datetime-local" required></label><label>Catatan (opsional)<input name="notes" maxlength="300"></label>', async data => {
    const payload = Object.fromEntries(data)
    payload.id = bookingForm.dataset.requestId || (bookingForm.dataset.requestId = id())
    payload.people = [...peopleList.querySelectorAll('.person-entry')].map((entry, index) => ({
      customer_id: index === 0 ? payload.customer_id || null : entry.querySelector('[name="person_customer_id"]').value || null,
      service_id: entry.querySelector('[name="person_service_id"]').value || null,
      capster_id: entry.querySelector('[name="person_capster_id"]').value || null
    }))
    try { await write('/api/bookings', 'POST', payload); bookingForm.dataset.requestId = ''; bookingDate = payload.scheduled_start.slice(0, 10); await show('bookings'); message('Booking tersimpan di server.', 'success') }
    catch (e) { throw e }
  }, 'Konfirmasi booking')
  customerPicker(bookingForm, catalog.customers)
  addSelect(bookingForm, 'Capster preferensi', 'capster_id', catalog.capsters)
  const peopleList = node('section', 'people-inputs')
  peopleList.append(node('h3', '', 'Orang & layanan'))
  function addPerson() {
    if (peopleList.querySelectorAll('.person-entry').length >= 8) return
    const entry = node('article', 'person-entry'); entry.append(node('strong', '', `Orang ${peopleList.querySelectorAll('.person-entry').length + 1}`))
    entry.append(field('Layanan', select('person_service_id', catalog.services, 'Belum dipilih')))
    entry.append(field('Capster (opsional)', select('person_capster_id', catalog.capsters, 'Mengikuti preferensi')))
    if (peopleList.querySelectorAll('.person-entry').length) entry.append(field('Pelanggan orang ini (opsional)', select('person_customer_id', catalog.customers, 'Anonim')))
    entry.append(button('Hapus orang', () => { if (peopleList.querySelectorAll('.person-entry').length > 1) entry.remove() }, true))
    peopleList.append(entry)
  }
  addPerson()
  bookingForm.insertBefore(peopleList, bookingForm.lastElementChild)
  bookingForm.insertBefore(button('+ Tambah orang', addPerson, true), bookingForm.lastElementChild)
  section.append(bookingForm)
  const list = panel('Daftar booking'); list.id = 'booking-list'
  const dateInput = document.createElement('input'); dateInput.id = 'booking-date'; dateInput.type = 'date'; dateInput.value = bookingDate; dateInput.setAttribute('aria-label', 'Tanggal booking'); dateInput.onchange = () => { bookingDate = dateInput.value; showBookingList().catch(e => message(e.message)) }
  const filter = field('Tanggal booking', dateInput); list.append(filter)
  await showBookingList()
}
async function showBookingList() {
  const list = document.querySelector('#booking-list'); if (!list) return
  const data = await request('/api/bookings?date=' + encodeURIComponent(bookingDate));
  [...list.querySelectorAll('.activity-card')].forEach(card => card.remove())
  list.querySelector('.empty-bookings')?.remove()
  if (!data.bookings.length) list.append(node('p', 'empty-bookings', 'Belum ada booking pada tanggal ini. Walk-in tetap dapat dicatat di Hari ini.'))
  data.bookings.forEach(entry => list.append(bookingCard(entry)))
}

async function showCustomers() {
  heading('Pelanggan', 'Pilih secara eksplisit. Nama sama tidak pernah digabung otomatis.')
  const create = panel('Tambah pelanggan')
  create.append(form('<label>Nama (opsional bila ada WhatsApp)<input name="name" maxlength="80"></label><label>WhatsApp (opsional)<input name="whatsapp" inputmode="tel" placeholder="08..." maxlength="22"></label>', async data => {
    const payload = Object.fromEntries(data)
    const current = create.querySelector('form')
    payload.id = current.dataset.requestId || (current.dataset.requestId = id())
    try { await write('/api/customers', 'POST', payload); current.dataset.requestId = ''; message('Pelanggan tersimpan di server.', 'success'); await loadCustomers() }
    catch (e) { throw e }
  }, 'Simpan pelanggan'))
  const section = panel('Cari pelanggan')
  const search = document.createElement('input'); search.id = 'customer-search'; search.type = 'search'; search.placeholder = 'Nama atau WhatsApp'; search.setAttribute('aria-label', 'Cari pelanggan')
  let timer; search.oninput = () => { clearTimeout(timer); timer = setTimeout(loadCustomers, 260) }
  section.append(search)
  const list = node('section', 'customer-list'); list.id = 'customer-list'; section.append(list)
  await loadCustomers()
}
async function loadCustomers() {
  const search = document.querySelector('#customer-search'); const list = document.querySelector('#customer-list'); if (!list) return
  const data = await request('/api/customers?q=' + encodeURIComponent(search?.value || ''))
  list.replaceChildren()
  if (!data.customers.length) list.append(node('p', '', 'Tidak ada pelanggan ditemukan.'))
  data.customers.forEach(customer => {
    const row = node('article', 'activity-card'); row.append(node('strong', '', customer.name || customer.whatsapp || 'Tanpa nama'), node('p', '', `${customer.completed_visits} kunjungan selesai · ${customer.whatsapp || 'Tanpa WhatsApp'}`))
    row.append(button('Lihat riwayat', () => showCustomerDetail(customer.id).catch(error => message(error.message)), true)); list.append(row)
  })
}
async function showCustomerDetail(customerId) {
  clear(); const [{ customer, visits, completed_visits }, opportunity] = await Promise.all([request(`/api/customers/${customerId}`), request(`/api/returns/${customerId}`)])
  const nav = button('← Kembali ke pelanggan', () => show('customers'), true); root.append(nav)
  heading(customer.name || customer.whatsapp || 'Pelanggan', `${completed_visits} layanan selesai · ${customer.whatsapp || 'Tanpa WhatsApp'}`)
  const insight = panel('Pola kembali (estimasi)'); insight.append(returnDescription(opportunity.return_opportunity), node('p', '', `Persetujuan pengingat WhatsApp: ${opportunity.consent_status === 'yes' ? 'Ya' : opportunity.consent_status === 'no' ? 'Tidak' : 'Belum diketahui — perlu tinjauan'}`))
  try { await showGrowthProfile(customerId, visits) } catch (error) { message(error.message) }
  const consentPanel = panel('Catat persetujuan pelanggan'); consentPanel.append(node('p', '', 'Hanya catat jawaban pelanggan secara langsung. Adanya nomor WhatsApp bukan persetujuan.'))
  const consentForm = form('<label>Jawaban pelanggan<select name="status"><option value="unknown">Belum diketahui</option><option value="yes">Setuju pengingat</option><option value="no">Tidak setuju</option></select></label><label>Catatan bukti percakapan<input name="notes" required minlength="3" maxlength="300" placeholder="Contoh: menyetujui saat kunjungan"></label>', async data => { await write(`/api/customers/${customerId}/consent`, 'POST', { ...Object.fromEntries(data), source: 'customer_explicit' }); await showCustomerDetail(customerId); message('Persetujuan dicatat.', 'success') }, 'Simpan jawaban'); consentPanel.append(consentForm)
  const panelNode = panel('Riwayat kunjungan'); panelNode.append(button('Catat walk-in untuk pelanggan ini', async () => { await show('today'); document.querySelector('.customer-picker select[name="customer_id"]').value = customerId }, false))
  const editPanel = panel('Perbarui profil')
  const editForm = form('<label>Nama<input name="name" maxlength="80"></label><label>WhatsApp<input name="whatsapp" inputmode="tel" maxlength="22"></label>', async data => {
    await write(`/api/customers/${customerId}`, 'PATCH', Object.fromEntries(data)); message('Profil diperbarui di server.', 'success'); await showCustomerDetail(customerId)
  }, 'Perbarui pelanggan')
  editForm.elements.name.value = customer.name || ''; editForm.elements.whatsapp.value = customer.whatsapp || ''
  editPanel.append(editForm)
  if (!visits.length) panelNode.append(node('p', '', 'Belum ada riwayat kunjungan.'))
  visits.forEach(visit => { const card = node('article', 'activity-card'); card.append(node('strong', '', visit.service || 'Layanan belum dipilih'), statusTag(visit.status), node('p', '', `${visit.occurred_at.replace('T', ' ')} · ${visit.capster || 'Capster belum dipilih'} · ${visit.source === 'walk_in' ? 'Walk-in' : 'Booking'}`)); panelNode.append(card) })
}

const dueLabel = { unknown: 'Belum ada pola kunjungan', insufficient_history: 'Belum cukup riwayat', active_pattern: 'Pola aktif', due_soon: 'Mendekati rentang', due: 'Memasuki rentang', overdue: 'Melewati rentang' }
function returnDescription(entry) {
  const group = node('div', 'return-evidence')
  group.append(node('strong', '', dueLabel[entry.state] || 'Belum ada pola kunjungan'))
  group.append(node('p', '', `${entry.visit_count} hari kunjungan selesai · Terakhir: ${entry.last_visit || 'belum ada'} · ${entry.days_since_last_visit == null ? 'belum ada jeda' : entry.days_since_last_visit + ' hari sejak terakhir'}`))
  if (entry.observed_interval_days != null) group.append(node('p', '', `Median interval teramati: ${entry.observed_interval_days} hari · Perkiraan rentang: ${entry.window_start} s.d. ${entry.window_end}. Bukan kepastian.`))
  return group
}
async function showReturns() {
  heading('Peluang kembali', 'Berdasarkan hari kunjungan selesai yang tercatat, bukan target retensi buatan. Hanya pengguna yang menekan Kirim di WhatsApp.')
  const list = panel('Pelanggan & kandidat'); const result = await request('/api/returns')
  if (!result.customers.length) list.append(node('p', '', 'Belum ada pelanggan.'))
  result.customers.forEach(entry => {
    const card = node('article', 'activity-card'); card.append(node('h3', '', entry.name || entry.whatsapp || 'Pelanggan'), returnDescription(entry))
    card.append(node('p', '', `Consent: ${entry.consent_status === 'yes' ? 'Setuju' : entry.consent_status === 'no' ? 'Tidak setuju' : 'Perlu tinjauan'} · ${entry.whatsapp || 'Tanpa nomor'}`))
    card.append(button('Tinjau pelanggan', () => showCustomerDetail(entry.id), true))
    if (['due', 'overdue'].includes(entry.state) && entry.consent_status === 'yes' && entry.whatsapp) card.append(button('Tinjau & siapkan pesan', async () => {
      if (!confirm(`Siapkan pengingat untuk ${entry.name || 'pelanggan ini'}? Tidak akan dikirim otomatis.`)) return
      try {
        const prepared = await write('/api/reminders/prepare', 'POST', { customer_id: entry.id })
        const preview = node('article', 'message-preview'); preview.append(node('p', '', prepared.message), node('p', '', 'Pesan belum dikirim. Periksa isi dan penerima sebelum membuka WhatsApp.'))
        preview.append(button('Buka WhatsApp (kirim manual)', async () => {
          try { const result = await write(`/api/reminders/${prepared.id}/handoff`, 'POST', {}); window.open(result.url, '_blank', 'noopener,noreferrer'); message('WhatsApp dibuka. Tekan Kirim sendiri setelah memeriksa pesan.', 'pending') }
          catch (error) { message(error.message) }
        }))
        card.querySelector('.message-preview')?.remove(); card.append(preview); message('Pesan disiapkan, belum dikirim.', 'success')
      } catch (error) { message(error.message) }
    }))
    list.append(card)
  })
}
async function showImport() {
  if (currentUser.role !== 'owner') return show('today')
  heading('Impor Kasir Pro', 'CSV ekspor resmi yang Anda miliki. Tidak mengakses API Kasir Pro. Lakukan pratinjau sebelum menyimpan; transaksi tanpa nomor identitas tetap tidak tertaut.')
  const section = panel('Berkas CSV (maks. 256 KB / 300 baris)')
  const upload = document.createElement('input'); upload.type = 'file'; upload.accept = '.csv,text/csv'; upload.setAttribute('aria-label', 'Pilih CSV Kasir Pro'); section.append(field('Pilih berkas', upload))
  const map = form('<label>Kolom tanggal (jika tidak terdeteksi)<input name="transaction_time" placeholder="Nama kolom tepat di CSV"></label><label>Kolom total (jika tidak terdeteksi)<input name="gross_amount" placeholder="Nama kolom tepat di CSV"></label><label>Kolom ID transaksi (opsional)<input name="external_transaction_id"></label><label>Kolom nomor pelanggan (opsional)<input name="customer_whatsapp"></label>', async fields => {
    if (!upload.files?.[0]) throw new Error('Pilih berkas CSV dahulu.')
    const csv = await upload.files[0].text(); const mapping = Object.fromEntries([...fields].filter(([, val]) => val).map(([key, val]) => [key, val]))
    const result = await write('/api/owner/import/preview', 'POST', { csv, mapping })
    const review = panel('Tinjau impor'); review.id = 'import-review'
    review.append(node('p', '', `Kolom: ${result.headers.join(' · ')}. Tidak terpetakan: ${result.unmapped.join(' · ') || 'tidak ada'}.`))
    review.append(node('p', '', `${result.rows_seen} baris · ${result.rows_valid_new} baru · ${result.rows_duplicate} duplikat · ${result.conflicts.length} konflik · ${result.errors.length} salah · ${result.unlinked} tidak tertaut · Total baris baru: ${rupiah(result.observed_total)}`))
    result.preview_rows.forEach(item => review.append(node('p', 'import-row', `Baris ${item.row} · ${item.transaction_id || 'tanpa ID'} · ${item.date} · ${rupiah(item.amount)} · ${item.customer || 'tanpa nama'} · ${item.linked ? 'pelanggan tertaut via nomor' : 'tidak tertaut'}`)))
    if (result.rows_valid_new > 30) review.append(node('p', '', 'Menampilkan 30 baris baru pertama. Semua baris tetap dihitung saat commit.'))
    result.errors.forEach(item => review.append(node('p', 'error', `Baris ${item.row}: ${item.error}`)))
    if (result.conflicts.length) review.append(node('p', 'error', `ID transaksi berbenturan: baris ${result.conflicts.join(', ')}.`))
    if (!result.errors.length && !result.conflicts.length) review.append(button('Konfirmasi & simpan transaksi', async () => {
      if (!confirm('Simpan hasil impor ini? Periksa lagi nilai dan sumber berkas.')) return
      try { const done = await write('/api/owner/import/commit', 'POST', { csv, mapping, confirm_file_id: result.file_id }); message(`Impor selesai: ${done.imported} baru, ${done.skipped} dilewati.`, 'success'); review.querySelector('button')?.remove(); await loadImportRuns() }
      catch (error) { message(error.message) }
    }))
    document.querySelector('#import-review')?.remove(); section.after(review); message('Pratinjau berhasil. Tidak ada perubahan data.', 'pending')
  }, 'Validasi tanpa menyimpan'); section.append(map)
  const runs = panel('Riwayat impor'); runs.id = 'import-runs'; await loadImportRuns()
}
async function loadImportRuns() {
  const target = document.querySelector('#import-runs'); if (!target) return
  const data = await request('/api/owner/import/runs'); target.replaceChildren(node('h2', '', 'Riwayat impor'))
  if (!data.runs.length) target.append(node('p', '', 'Actual transaction data belum tersedia.'))
  data.runs.forEach(run => target.append(node('p', '', `${run.started_at} · ${run.status} · ${run.rows_imported} baru / ${run.rows_skipped} duplikat`)))
}
async function showSettings() {
  if (currentUser.role !== 'owner') return show('today')
  heading('Pengaturan', 'Hanya pemilik dapat mengubah capster, layanan, dan harga proyeksi. Kasir Pro tidak terpengaruh.')
  const capsterSection = panel('Capster')
  capsterSection.append(form('<label>Nama capster<input name="name" required maxlength="80"></label>', async data => {
    const payload = Object.fromEntries(data); const current = capsterSection.querySelector('form')
    payload.id = current.dataset.requestId || (current.dataset.requestId = id())
    await write('/api/owner/capsters', 'POST', payload); current.dataset.requestId = ''; current.reset(); message('Capster dibuat.', 'success'); await loadCatalog()
  }, 'Tambah capster'))
  const capsterList = node('section', 'catalog-list'); capsterList.id = 'capster-list'; capsterSection.append(capsterList)
  const serviceSection = panel('Layanan dan harga referensi')
  serviceSection.append(node('p', '', 'Harga hanya untuk proyeksi booking. Perubahan harga tidak mengubah transaksi Kasir Pro atau nilai booking lama.'))
  serviceSection.append(form('<label>Nama layanan<input name="name" required maxlength="80"></label><label>Harga referensi (opsional, rupiah)<input name="price" type="number" inputmode="numeric" min="0" max="100000000"></label>', async data => {
    const payload = Object.fromEntries(data); const current = serviceSection.querySelector('form')
    payload.price = payload.price === '' ? null : Number(payload.price)
    payload.id = current.dataset.requestId || (current.dataset.requestId = id())
    await write('/api/owner/services', 'POST', payload); current.dataset.requestId = ''; current.reset(); message('Layanan dibuat.', 'success'); await loadCatalog()
  }, 'Tambah layanan'))
  const serviceList = node('section', 'catalog-list'); serviceList.id = 'service-list'; serviceSection.append(serviceList)
  const password = panel('Keamanan akun'); password.append(form('<label>Sandi sekarang<input name="current_password" type="password" required autocomplete="current-password"></label><label>Sandi baru (minimal 12 karakter)<input name="new_password" type="password" required minlength="12" autocomplete="new-password"></label>', async data => { await write('/api/me/password', 'POST', Object.fromEntries(data)); currentUser = null; showLogin(); message('Sandi diganti. Silakan masuk kembali.', 'success') }, 'Ganti sandi'))
  const users = panel('Akses tim')
  users.append(node('p', '', 'Setiap pengguna memiliki akun terpisah. Pembuatan akun tercatat dalam audit.'))
  users.append(form('<label>Nama<input name="name" required minlength="2" maxlength="80"></label><label>Username<input name="username" required minlength="3" maxlength="40"></label><label>Peran<select name="role"><option value="capster">Capster</option><option value="operator">Operator</option></select></label><label>Sandi awal (minimal 12 karakter)<input name="password" type="password" required minlength="12"></label>', async data => {
    await write('/api/owner/users', 'POST', Object.fromEntries(data)); message('Akun tim dibuat.', 'success'); await loadAudit()
  }, 'Tambah akun tim'))
  const auditSection = panel('Audit terbaru'); const auditList = node('ul', 'audit-list'); auditList.id = 'audit-list'; auditSection.append(auditList)
  await Promise.all([loadCatalog(), loadAudit()])
}
async function loadCatalog() {
  const [capsters, services] = await Promise.all([request('/api/capsters?all=1'), request('/api/services?all=1')])
  const capsterList = document.querySelector('#capster-list'); const serviceList = document.querySelector('#service-list')
  if (!capsterList || !serviceList) return
  capsterList.replaceChildren(); serviceList.replaceChildren()
  capsters.capsters.forEach(item => {
    const row = node('article', 'catalog-row'); row.append(node('strong', '', `${item.display_name} · ${item.status === 'active' ? 'Aktif' : 'Nonaktif'}`))
    row.append(button('Ubah nama', async () => { const name = prompt('Nama capster', item.display_name); if (!name || name === item.display_name) return; try { await write(`/api/owner/capsters/${item.id}`, 'PATCH', { name }); message('Capster diperbarui.', 'success'); await loadCatalog() } catch (e) { message(e.message) } }, true))
    row.append(button(item.status === 'active' ? 'Nonaktifkan' : 'Aktifkan', async () => { try { await write(`/api/owner/capsters/${item.id}`, 'PATCH', { status: item.status === 'active' ? 'inactive' : 'active' }); message('Status capster diperbarui.', 'success'); await loadCatalog() } catch (e) { message(e.message) } }, true))
    capsterList.append(row)
  })
  services.services.forEach(item => {
    const row = node('article', 'catalog-row'); row.append(node('strong', '', `${item.name} · ${item.active ? 'Aktif' : 'Nonaktif'} · ${rupiah(item.price)}`))
    row.append(button('Ubah', async () => {
      const name = prompt('Nama layanan', item.name); if (name === null) return
      const priceInput = prompt('Harga proyeksi (kosong = belum tersedia)', item.price == null ? '' : String(item.price)); if (priceInput === null) return
      try { await write(`/api/owner/services/${item.id}`, 'PATCH', { name, price: priceInput.trim() === '' ? null : Number(priceInput) }); message('Layanan dan harga diperbarui.', 'success'); await loadCatalog() } catch (e) { message(e.message) }
    }, true))
    row.append(button(item.active ? 'Nonaktifkan' : 'Aktifkan', async () => { try { await write(`/api/owner/services/${item.id}`, 'PATCH', { active: item.active ? 0 : 1 }); message('Status layanan diperbarui.', 'success'); await loadCatalog() } catch (e) { message(e.message) } }, true))
    serviceList.append(row)
  })
}
async function loadAudit() {
  const target = document.querySelector('#audit-list'); if (!target) return
  const data = await request('/api/owner/audit')
  target.replaceChildren(...data.events.map(event => node('li', '', `${event.occurred_at} · ${event.action} · ${event.entity_type} · ${event.entity_id}`)))
}

async function showGrowthProfile(customerId, visits) {
  const data = await request(`/api/growth/customers/${customerId}`)
  const section = panel('Layanan & Growth pelanggan')
  section.append(node('p', '', `Lifecycle: ${data.lifecycle} · ${data.visit_count} kunjungan selesai · Pertama: ${data.first_visit || 'belum ada'} · Terakhir: ${data.latest_visit || 'belum ada'}`))
  section.append(node('p', '', `Asal: ${data.source?.source_code || 'unknown'} · Consent: ${data.consent.status === 'yes' ? 'setuju' : data.consent.status === 'no' ? 'menolak' : 'belum diketahui'} (${data.consent.captured_at || 'belum dicatat'})`))
  section.append(node('p', '', data.loyalty.program ? `Potong rambut: ${data.loyalty.progress}/4 · Hadiah tersedia: ${data.loyalty.available}` : 'Loyalty belum diatur oleh pemilik.'))
  section.append(node('p', '', `Catatan: ${data.customer.notes || 'belum ada'}`))
  section.append(form('<label>Catatan layanan (maks. 500 karakter)<textarea name="notes" maxlength="500" rows="3"></textarea></label>', async fields => { await write(`/api/growth/customers/${customerId}/notes`, 'PATCH', Object.fromEntries(fields)); await showCustomerDetail(customerId); message('Catatan tersimpan.', 'success') }, 'Simpan catatan'))
  section.querySelector('textarea').value = data.customer.notes || ''
  const sourceForm = form('<label>Asal pelanggan<select name="source_code"><option value="walk_in">Walk-in</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="google">Google</option><option value="referral">Referensi teman</option><option value="existing">Pelanggan lama</option><option value="other">Lainnya</option><option value="unknown">Belum diketahui</option></select></label>', async fields => { await write(`/api/growth/customers/${customerId}/source`, 'POST', Object.fromEntries(fields)); await showCustomerDetail(customerId); message('Asal dicatat.', 'success') }, 'Catat sumber')
  section.append(sourceForm)
  if (data.loyalty.program) {
    section.append(node('p', '', 'Kredit hanya diberikan setelah layanan potong rambut yang dikonfigurasi benar-benar selesai. Pilih kunjungan selesai di bawah ini.'))
    visits.filter(v => v.status === 'completed' && v.service_id === data.loyalty.program.reward_service_id).forEach(v => {
      const row = node('article', 'activity-card'); row.append(node('p', '', `${v.occurred_at} · ${v.service || 'Tanpa layanan'}`))
      row.append(button('Tinjau & beri kredit', async () => { if (!confirm('Pastikan ini kunjungan potong rambut berbayar yang memenuhi syarat. Tidak mencatat pembayaran.')) return; try { await write('/api/growth/loyalty/award', 'POST', { visit_id:v.id, program_id:data.loyalty.program.id }); await showCustomerDetail(customerId); message('Kredit diperiksa dan dicatat.', 'success') } catch(e) { message(e.message) } }, true)); section.append(row)
    })
    data.loyalty.rewards.filter(r => !r.redeemed_visit_id).forEach(reward => {
      const redeemForm = form('', async fields => { if (!confirm('Konfirmasi layanan gratis benar-benar sudah diberikan? Tidak mencatat pembayaran.')) return; await write('/api/growth/loyalty/redeem', 'POST', { reward_id:reward.id,visit_id:fields.get('visit_id') }); await showCustomerDetail(customerId); message('Hadiah ditukar dan diaudit.', 'success') }, 'Catat penukaran hadiah')
      const choices = visits.filter(v => v.status === 'completed' && v.service_id === data.loyalty.program.reward_service_id).map(v => ({id:v.id,name:`${v.occurred_at} · ${v.service}`}))
      addSelect(redeemForm, 'Kunjungan gratis selesai (bukan yang sudah mendapat kredit)', 'visit_id', choices)
      section.append(node('p', '', `Hadiah tersedia · ${reward.id}`), redeemForm)
    })
  }
  section.append(button('Tambahkan ke antrean aksi', async () => { try { await write('/api/growth/queue', 'POST', { customer_id:customerId,kind:'follow_up',reason:'Tinjau tindak lanjut secara manual' }); message('Aksi dibuat. Belum ada pesan dikirim.', 'success') } catch(e){message(e.message)} }, true))
}

async function showGrowth() {
  heading('Growth operasional', 'Angka berdasarkan data tercatat. Pendapatan hanya transaksi CSV Kasir Pro; tanpa data bukan berarti nol.')
  const [report, queue, referrals, campaigns, program] = await Promise.all([request('/api/growth/report'),request('/api/growth/queue'),request('/api/growth/referrals'),request('/api/growth/campaigns'),request('/api/growth/program')])
  const daily = panel('Hari ini')
  daily.append(node('p', '', `${report.as_of} · Kunjungan selesai ${report.today.visits} · Pelanggan baru ${report.today.new_customers} · Pelanggan terlayani ${report.today.returning_customers} · Pendapatan aktual ${rupiah(report.today.revenue.revenue)} · Reward tersedia ${report.today.rewards_available} · Aksi terbuka ${report.today.open_actions}`))
  const weekly = panel('Laporan 7 hari berjalan')
  weekly.append(node('p', '', `${report.week.start} s.d. ${report.week.end} · Kunjungan ${report.week.visits} (7 hari sebelumnya ${report.previous_week.visits}) · Baru ${report.week.new_customers} · Repeat pelanggan ${report.week.returning_customers} (${report.week.repeat_rate == null ? 'belum ada sampel' : Math.round(report.week.repeat_rate * 100) + '% dari pelanggan terlayani'}) · Pendapatan ${rupiah(report.week.revenue.revenue)} (sebelumnya ${rupiah(report.previous_week.revenue.revenue)}) · Rata-rata transaksi ${rupiah(report.week.revenue.average_transaction_value)}`))
  weekly.append(node('p', '', `Layanan: ${report.week.top_services.map(x => `${x.name} (${x.count})`).join(', ') || 'belum ada'} · Kredit ${report.week.credits} · Referensi ${report.week.referrals} · Peluang tertunda ${report.today.open_actions}`))
  weekly.append(node('p', '', `${report.note} Bandingkan periode hanya bila sampel cukup. Observasi: ${report.week.visits < 5 ? 'sampel kecil; tinjau catatan kunjungan manual.' : 'tinjau perubahan periode dan penyebab di lapangan.'}`))
  const dashboard = panel('Pelanggan & akuisisi')
  dashboard.append(node('p', '', `Total ${report.customers.total} · Aktif ${report.customers.active} · Berisiko ${report.customers.at_risk} · Tidak aktif ${report.customers.inactive} · Berulang ${report.customers.repeat} · Kunjungan bulan ini ${report.month.visits} · Pendapatan bulan ini ${rupiah(report.month.revenue.revenue)}`))
  dashboard.append(node('p', '', `Sumber pelanggan: ${Object.entries(report.sources).map(([k,v])=>`${k}: ${v}`).join(' · ') || 'belum dicatat'}`))
  const actions = panel('Antrean aksi (manual, bukan pemeringkatan)')
  if (!queue.actions.length) actions.append(node('p', '', 'Belum ada aksi tercatat. Mulai dari profil pelanggan.'))
  queue.actions.forEach(a => { const card=node('article','activity-card'); card.append(node('strong','',a.name || 'Tanpa nama'),node('p','',`${a.kind} · ${a.reason} · ${a.status} · WhatsApp: ${a.consent.status}`))
    card.append(button('Buka profil',()=>showCustomerDetail(a.customer_id),true))
    if (!['done','dismissed'].includes(a.status)) card.append(button('Catat hasil',async()=>{ const outcome=prompt('Catat hasil nyata; kosong untuk batal'); if (!outcome) return; try {await write(`/api/growth/queue/${a.id}`,'PATCH',{status:'done',outcome}); show('growth')} catch(e){message(e.message)} },true))
    actions.append(card) })
  const referral = panel('Referensi pelanggan')
  referral.append(node('p','',`${referrals.referrals.length} rujukan tercatat (tidak menyiratkan hadiah atau konversi).`))
  referral.append(form('<label>ID pelanggan perujuk<input name="referrer_id" required></label><label>ID pelanggan baru yang dirujuk<input name="referred_id" required></label>',async fields=>{ await write('/api/growth/referrals','POST',Object.fromEntries(fields)); await show('growth'); message('Rujukan dicatat tanpa hadiah otomatis.','success')},'Catat rujukan'))
  const campaign=panel('Kampanye manual')
  campaign.append(node('p','',`${campaigns.campaigns.length} draft tercatat. Tidak ada pengiriman otomatis. Persetujuan wajib diperiksa lagi sebelum kontak.`))
  campaigns.campaigns.forEach(x=>campaign.append(node('p','',`${x.name} · ${x.kind} · ${x.status} · ${x.audience}`)))
  if(currentUser.role==='owner') {
    const owner=panel('Pengaturan Growth (pemilik)')
    owner.append(node('p','',program.program ? `Program aktif: ${program.program.name}. Tidak mengubah program saat kredit berjalan.` : 'Pilih layanan potong rambut yang memenuhi syarat untuk program 4+1.'))
    if(!program.program) {const services=await request('/api/services'); const f=form('',async fields=>{await write('/api/owner/growth/program','POST',{service_id:fields.get('service_id')});await show('growth');message('Program 4+1 aktif.','success')},'Aktifkan program 4+1');addSelect(f,'Layanan potong rambut','service_id',services.services);owner.append(f)}
    owner.append(form(`<label>Hari berisiko<input name="at_risk_days" type="number" min="1" max="365" value="${report.thresholds.at_risk_days}" required></label><label>Hari tidak aktif<input name="inactive_days" type="number" min="2" max="730" value="${report.thresholds.inactive_days}" required></label>`,async fields=>{await write('/api/owner/growth/settings','PUT',{at_risk_days:Number(fields.get('at_risk_days')),inactive_days:Number(fields.get('inactive_days'))});await show('growth');message('Ambang lifecycle disimpan.','success')},'Simpan ambang'))
    campaign.append(form('<label>Nama kampanye<input name="name" required minlength="2" maxlength="80"></label><label>Jenis<select name="kind"><option value="retention">Retention</option><option value="reactivation">Reactivation</option><option value="loyalty">Loyalty</option><option value="referral">Referral</option><option value="new_customer">New customer</option><option value="seasonal">Seasonal</option></select></label><label>Audiens<input name="audience" required minlength="2" maxlength="200"></label><label>Pesan draft<textarea name="content" required minlength="2" maxlength="500"></textarea></label>',async fields=>{await write('/api/owner/growth/campaigns','POST',Object.fromEntries(fields));await show('growth');message('Draft kampanye tersimpan; tidak dikirim.','success')},'Simpan draft'))
  }
}

window.addEventListener('offline', () => message('Koneksi terputus. Perubahan baru tidak akan dianggap tersimpan; layanan fisik tetap berjalan.'))
window.addEventListener('online', () => message('Koneksi kembali. Muat ulang data sebelum melanjutkan.', 'pending'))
start()
