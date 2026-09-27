const root = document.querySelector('#app')
let currentUser = null
let state = { customers: [], capsters: [], services: [], visits: [] }

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
  } catch {
    throw new Error('Tidak terhubung. Pekerjaan fisik tetap dapat berjalan; perubahan belum tersimpan.')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Permintaan gagal.')
  return body
}

function message(text, type = 'error') {
  const node = document.querySelector('#feedback')
  if (node) { node.textContent = text; node.className = `feedback ${type}` }
}

function form(title, fields, action, button) {
  root.replaceChildren()
  const section = document.createElement('section')
  section.className = 'panel auth-panel'
  const heading = document.createElement('h1')
  heading.textContent = title
  const formNode = document.createElement('form')
  formNode.innerHTML = fields
  const submit = document.createElement('button')
  submit.type = 'submit'
  submit.textContent = button
  formNode.append(submit)
  const feedback = document.createElement('p')
  feedback.id = 'feedback'
  feedback.setAttribute('role', 'status')
  formNode.addEventListener('submit', async event => {
    event.preventDefault()
    submit.disabled = true
    message('Menyimpan...', 'pending')
    try { await action(new FormData(formNode)) } catch (error) { message(error.message) } finally { submit.disabled = false }
  })
  section.append(heading, formNode, feedback)
  root.append(section)
}

async function start() {
  try {
    const status = await request('/api/status')
    if (!status.ready) return showSetup()
    if (status.authenticated) {
      const { user } = await request('/api/me')
      currentUser = user
      return showHome()
    }
    showLogin()
  } catch (error) {
    root.textContent = error.message
  }
}

function showSetup() {
  form('Siapkan akun pemilik', '<p>Mode development: tidak ada token bootstrap. Buat akun pemilik sekali, lalu masuk seperti biasa.</p><label>Nama<input name="name" required minlength="2" maxlength="80"></label><label>Username<input name="username" required minlength="3" maxlength="40" autocomplete="username"></label><label>Sandi (minimal 12 karakter)<input name="password" type="password" required minlength="12" autocomplete="new-password"></label>', async data => {
    await request('/api/bootstrap', { method: 'POST', body: JSON.stringify(Object.fromEntries(data)) })
    await start()
  }, 'Buat pemilik')
}

function showLogin() {
  form('Masuk ke Bosku', '<p>Gunakan akun yang dibuat pemilik. Data transaksi tetap dikelola di Kasir Pro.</p><label>Username<input name="username" required autocomplete="username"></label><label>Sandi<input name="password" type="password" required autocomplete="current-password"></label>', async data => {
    await request('/api/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(data)) })
    await start()
  }, 'Masuk')
}

function el(tag, text, className) {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  if (className) node.className = className
  return node
}

function navButton(label, action, active = false) {
  const button = el('button', label, active ? 'nav-button active' : 'nav-button')
  button.type = 'button'
  button.onclick = action
  return button
}

async function showHome(view = 'today') {
  root.replaceChildren()
  const head = el('section', undefined, 'welcome')
  const title = el('h1', `Halo, ${currentUser.display_name}`)
  const sub = el('p', currentUser.role === 'owner' ? 'Pemilik · Customer + Visit' : 'Operasional · Customer + Visit')
  const logout = el('button', 'Keluar', 'secondary')
  logout.onclick = async () => { try { await request('/api/logout', { method: 'POST', body: '{}' }); currentUser = null; showLogin() } catch (e) { message(e.message) } }
  head.append(title, sub, logout)

  const nav = el('nav', undefined, 'workspace-nav')
  nav.append(
    navButton('Hari ini', () => showHome('today'), view === 'today'),
    navButton('Pelanggan', () => showHome('customers'), view === 'customers'),
    navButton('Kunjungan baru', () => showHome('new-visit'), view === 'new-visit')
  )
  const main = el('section', undefined, 'workspace')
  const feedback = el('p', '', 'feedback')
  feedback.id = 'feedback'
  root.append(head, nav, main, feedback)

  if (view === 'customers') await renderCustomers(main)
  else if (view === 'new-visit') await renderNewVisit(main)
  else await renderToday(main)
}

async function renderToday(main) {
  main.append(el('h2', 'Hari ini'))
  const intro = el('p', 'Catat walk-in sebagai kunjungan. Status kunjungan tidak sama dengan transaksi.')
  main.append(intro)
  const { visits } = await request('/api/data/visits/today')
  state.visits = visits
  const list = el('div', undefined, 'list')
  if (!visits.length) list.append(el('div', 'Belum ada kunjungan hari ini.', 'empty'))
  for (const visit of visits) list.append(visitCard(visit))
  main.append(list)
}

function visitCard(visit) {
  const card = el('article', undefined, 'data-card')
  const name = visit.customer_name || 'Walk-in tanpa identitas'
  card.append(el('strong', name))
  card.append(el('span', `${new Date(visit.occurred_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · ${visit.capster_name || 'Capster belum dipilih'}`))
  if (visit.service_summary) card.append(el('p', visit.service_summary))
  const row = el('div', undefined, 'card-actions')
  const statuses = ['arrived', 'in_service', 'completed', 'cancelled', 'no_show']
  const next = statuses.find(status => status !== visit.status && (
    (visit.status === 'arrived' && status === 'in_service') ||
    (visit.status === 'in_service' && status === 'completed') ||
    ['expected'].includes(visit.status)
  ))
  if (next) {
    const b = el('button', next === 'completed' ? 'Selesai' : next === 'in_service' ? 'Mulai layanan' : next)
    b.onclick = async () => {
      try { await request(`/api/data/visits/${visit.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) }); await showHome('today') } catch (e) { message(e.message) }
    }
    row.append(b)
  }
  if (visit.customer_id) {
    const b = el('button', 'Lihat pelanggan', 'secondary')
    b.onclick = () => showCustomerDetail(visit.customer_id)
    row.append(b)
  }
  card.append(row)
  return card
}

async function renderCustomers(main) {
  const top = el('div', undefined, 'section-heading')
  top.append(el('h2', 'Pelanggan'), el('button', 'Tambah pelanggan'))
  top.lastChild.onclick = () => showCustomerForm()
  main.append(top)
  const search = document.createElement('input')
  search.placeholder = 'Cari nama atau WhatsApp…'
  search.autocomplete = 'off'
  search.oninput = debounce(async () => {
    try { await loadCustomers(search.value); drawCustomers(list, state.customers) } catch (e) { message(e.message) }
  }, 250)
  main.append(search)
  const list = el('div', undefined, 'list')
  main.append(list)
  await loadCustomers('')
  drawCustomers(list, state.customers)
}

async function loadCustomers(q) {
  const data = await request('/api/data/customers?q=' + encodeURIComponent(q || ''))
  state.customers = data.customers
}

function drawCustomers(list, customers) {
  list.replaceChildren()
  if (!customers.length) return list.append(el('div', 'Belum ada pelanggan yang cocok.', 'empty'))
  for (const customer of customers) {
    const card = el('article', undefined, 'data-card clickable')
    card.onclick = () => showCustomerDetail(customer.id)
    card.append(el('strong', customer.name || 'Tanpa nama'))
    card.append(el('span', customer.whatsapp || 'WhatsApp belum dicatat'))
    card.append(el('small', customer.last_visit_at ? `Kunjungan terakhir: ${formatDate(customer.last_visit_at)}` : 'Belum ada kunjungan'))
    list.append(card)
  }
}

function showCustomerForm(customer = null) {
  const main = el('section', undefined, 'panel')
  main.append(el('h2', customer ? 'Edit pelanggan' : 'Tambah pelanggan'))
  const f = document.createElement('form')
  f.innerHTML = '<label>Nama<input name="name" maxlength="80"></label><label>WhatsApp<input name="whatsapp" inputmode="tel" maxlength="32" placeholder="08…"></label><button type="submit">Simpan pelanggan</button>'
  f.elements.name.value = customer?.name || ''
  f.elements.whatsapp.value = customer?.whatsapp || ''
  const feedback = el('p', '', 'feedback')
  feedback.id = 'feedback'
  f.addEventListener('submit', async event => {
    event.preventDefault()
    try {
      const body = Object.fromEntries(new FormData(f))
      if (customer) {
        await request(`/api/data/customers/${customer.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        message('Pelanggan diperbarui.', 'success')
      } else {
        const created = await request('/api/data/customers', { method: 'POST', body: JSON.stringify(body) })
        message('Pelanggan dibuat.', 'success')
        return showCustomerDetail(created.id)
      }
      await showHome('customers')
    } catch (e) { feedback.textContent = e.message }
  })
  main.append(f, feedback)
  root.querySelector('.workspace')?.replaceChildren(main)
}

async function showCustomerDetail(id) {
  root.replaceChildren()
  const shell = el('section', undefined, 'workspace')
  const back = el('button', '← Pelanggan', 'secondary')
  back.onclick = () => showHome('customers')
  shell.append(back)
  try {
    const data = await request(`/api/data/customers/${id}`)
    const c = data.customer
    const panel = el('section', undefined, 'panel detail-panel')
    const heading = el('div', undefined, 'section-heading')
    heading.append(el('div', undefined))
    heading.firstChild.append(el('h1', c.name || 'Tanpa nama'), el('p', c.whatsapp || 'WhatsApp belum dicatat'))
    const edit = el('button', 'Edit', 'secondary')
    edit.onclick = () => showCustomerForm(c)
    heading.append(edit)
    panel.append(heading)
    panel.append(el('p', c.last_visit_at ? `Kunjungan terakhir: ${formatDate(c.last_visit_at)}` : 'Belum ada kunjungan'))
    panel.append(el('h2', 'Riwayat kunjungan'))
    const list = el('div', '','list')
    if (!data.visits.length) list.append(el('div', 'Belum ada riwayat kunjungan.', 'empty'))
    for (const v of data.visits) {
      const item = el('article', undefined, 'data-card')
      item.append(el('strong', formatDate(v.occurred_at)))
      item.append(el('span', `${v.status} · ${v.capster_name || 'Capster belum dipilih'}`))
      if (v.service_summary) item.append(el('p', v.service_summary))
      list.append(item)
    }
    panel.append(list)
    shell.append(panel)
  } catch (e) { shell.append(el('p', e.message, 'feedback')) }
  root.append(shell)
}

async function renderNewVisit(main) {
  main.append(el('h2', 'Kunjungan baru'))
  main.append(el('p', 'Walk-in boleh tanpa data pelanggan. Jika pelanggan dikenali, pilih profil agar riwayat terbentuk.'))
  await Promise.all([
    request('/api/data/customers?limit=100').then(x => { state.customers = x.customers }),
    request('/api/data/capsters').then(x => { state.capsters = x.capsters })
  ])
  const f = document.createElement('form')
  f.innerHTML = '<label>Pelanggan<select name="customer_id"><option value="">Walk-in tanpa identitas</option></select></label><label>Capster<select name="capster_id"><option value="">Belum dipilih</option></select></label><label>Layanan / catatan singkat<input name="service_summary" maxlength="240" placeholder="Contoh: Potong dewasa"></label><button type="submit">Catat kunjungan</button>'
  const customerSelect = f.elements.customer_id
  for (const c of state.customers) {
    const option = document.createElement('option')
    option.value = c.id
    option.textContent = `${c.name || 'Tanpa nama'}${c.whatsapp ? ' · ' + c.whatsapp : ''}`
    customerSelect.append(option)
  }
  const capsterSelect = f.elements.capster_id
  for (const c of state.capsters) {
    const option = document.createElement('option')
    option.value = c.id
    option.textContent = c.display_name
    capsterSelect.append(option)
  }
  const feedback = el('p', '', 'feedback')
  feedback.id = 'feedback'
  f.addEventListener('submit', async event => {
    event.preventDefault()
    try {
      await request('/api/data/visits', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(f))) })
      message('Kunjungan tercatat.', 'success')
      await showHome('today')
    } catch (e) { feedback.textContent = e.message }
  })
  main.append(f, feedback)
}

function debounce(fn, delay) {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}

function formatDate(value) {
  try { return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return value }
}

start()
