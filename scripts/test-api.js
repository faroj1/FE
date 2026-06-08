// Simple test script to hit the backend API at 192.168.1.20
// Requires Node 18+ (global fetch). Run: `node scripts/test-api.js`

const BASE = process.env.API_BASE || 'http://192.168.1.20'

async function login() {
  const url = `${BASE}/api/login`
  const body = { email: 'guru@kuiskita.com', password: 'guru123' }
  console.log('POST', url, body)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  let data = null
  try {
    data = await res.json()
  } catch (err) {
    console.warn('Failed to parse login response as JSON:', err.message)
  }
  console.log('Status:', res.status)
  console.log('Response:', JSON.stringify(data, null, 2))
  return { ok: res.ok, status: res.status, data }
}

async function me(token) {
  const url = `${BASE}/api/me`
  console.log('GET', url)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
  let data = null
  try {
    data = await res.json()
  } catch (err) {
    console.warn('Failed to parse /api/me response as JSON:', err.message)
  }
  console.log('Status:', res.status)
  console.log('Response:', JSON.stringify(data, null, 2))
}

async function run() {
  console.log('Using API_BASE =', BASE)
  const r = await login()
  if (r.ok && r.data && r.data.data && r.data.data.token) {
    const token = r.data.data.token
    console.log('\nCalling /api/me with token...')
    await me(token)
  } else {
    console.log('\nLogin failed, not calling /api/me')
  }
}

run().catch((err) => { console.error(err); process.exit(1) })
