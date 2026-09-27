const root = document.querySelector('#app')
let currentUser = null

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
  } catch {
    throw new Error('Tidak terhubung. Pekerjaan fisik tetap dapat berjalan; perubahan belum tersimpan.')
  }
  const body = await response.json()
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
  form('Siapkan akun pemilik', '<p>Hanya sekali. Siapkan BOOTSTRAP_TOKEN di secret Cloudflare atau .dev.vars lokal sebelum melanjutkan.</p><label>Token inisialisasi<input name="token" type="password" required autocomplete="off"></label><label>Nama<input name="name" required minlength="2" maxlength="80"></label><label>Username<input name="username" required minlength="3" maxlength="40" autocomplete="username"></label><label>Sandi (minimal 12 karakter)<input name="password" type="password" required minlength="12" autocomplete="new-password"></label>', async data => {
    const body = Object.fromEntries(data)
    const token = body.token
    delete body.token
    await request('/api/bootstrap', { method: 'POST', headers: { 'X-Bootstrap-Token': token }, body: JSON.stringify(body) })
    await start()
  }, 'Buat pemilik')
}

function showLogin() {
  form('Masuk ke Bosku', '<p>Gunakan akun yang dibuat pemilik. Data transaksi tetap dikelola di Kasir Pro.</p><label>Username<input name="username" required autocomplete="username"></label><label>Sandi<input name="password" type="password" required autocomplete="current-password"></label>', async data => {
    await request('/api/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(data)) })
    await start()
  }, 'Masuk')
}

function card(title, description, enabled = false) {
  const article = document.createElement('article')
  article.className = enabled ? 'module available' : 'module'
  const heading = document.createElement('h3')
  heading.textContent = title
  const p = document.createElement('p')
  p.textContent = description
  article.append(heading, p)
  return article
}

async function showHome() {
  root.replaceChildren()
  const head = document.createElement('section')
  head.className = 'welcome'
  const title = document.createElement('h1')
  title.textContent = `Halo, ${currentUser.display_name}`
  const sub = document.createElement('p')
  sub.textContent = currentUser.role === 'owner' ? 'Area pemilik · Fondasi sistem sudah aktif' : 'Area operasional · Modul layanan segera hadir'
  const logout = document.createElement('button')
  logout.className = 'secondary'
  logout.textContent = 'Keluar'
  logout.onclick = async () => { try { await request('/api/logout', { method: 'POST', body: '{}' }); currentUser = null; showLogin() } catch (e) { message(e.message) } }
  head.append(title, sub, logout)
  const section = document.createElement('section')
  section.className = 'modules'
  const label = document.createElement('h2')
  label.textContent = 'Ruang kerja'
  const grid = document.createElement('div')
  grid.className = 'module-grid'
  grid.append(card('Hari ini', 'Walk-in, kunjungan, dan status layanan — sprint berikutnya.'), card('Pelanggan', 'Profil dan riwayat kunjungan — sprint berikutnya.'), card('Booking', 'Opsional, bukan syarat melayani pelanggan.'), card('Retensi', 'Berdasarkan kunjungan teramati, bukan ramalan.'), card('Transaksi & Sinkronisasi', 'Impor aman; Kasir Pro tetap sumber transaksi.'))
  if (currentUser.role === 'owner') grid.append(card('Pengaturan & Audit', 'Kelola akun operator dan jejak perubahan.', true))
  section.append(label, grid)
  root.append(head, section)
  const feedback = document.createElement('p')
  feedback.id = 'feedback'
  feedback.setAttribute('role', 'status')
  root.append(feedback)
  if (currentUser.role === 'owner') await showOwner()
}

async function showOwner() {
  const panel = document.createElement('section')
  panel.className = 'panel owner-panel'
  const heading = document.createElement('h2')
  heading.textContent = 'Akses tim'
  const description = document.createElement('p')
  description.textContent = 'Buat akun terpisah; jangan berbagi sandi. Setiap pembuatan akun tercatat di audit.'
  const formNode = document.createElement('form')
  formNode.innerHTML = '<label>Nama<input name="name" required minlength="2" maxlength="80"></label><label>Username<input name="username" required minlength="3" maxlength="40"></label><label>Peran<select name="role"><option value="capster">Capster</option><option value="operator">Operator</option></select></label><label>Sandi awal (minimal 12 karakter)<input name="password" type="password" required minlength="12"></label><button type="submit">Tambah akun</button>'
  formNode.addEventListener('submit', async event => {
    event.preventDefault()
    try {
      await request('/api/owner/users', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(formNode))) })
      formNode.reset()
      message('Akun dibuat dan dicatat dalam audit.', 'success')
      await loadAudit()
    } catch (e) { message(e.message) }
  })
  const auditTitle = document.createElement('h3')
  auditTitle.textContent = 'Aktivitas penting terakhir'
  const list = document.createElement('ul')
  list.id = 'audit-list'
  panel.append(heading, description, formNode, auditTitle, list)
  root.append(panel)
  await loadAudit()
}

async function loadAudit() {
  try {
    const { events } = await request('/api/owner/audit')
    const list = document.querySelector('#audit-list')
    if (!list) return
    list.replaceChildren(...events.map(event => {
      const item = document.createElement('li')
      item.textContent = `${event.occurred_at} · ${event.action} · ${event.entity_type} · ${event.entity_id}`
      return item
    }))
  } catch (e) { message(e.message) }
}

start()
