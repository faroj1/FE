// Simple test script to hit the backend API.
// Requires Node 18+ (global fetch).
// Usage: API_BASE=http://localhost:8000 TEST_EMAIL=user@example.com TEST_PASSWORD=secret node scripts/test-api.js

const BASE = process.env.API_BASE || 'http://localhost:8000'

async function login() {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD
  if (!email || !password) {
    console.error('Set TEST_EMAIL and TEST_PASSWORD environment variables')
    process.exit(1)
  }
  const url = `${BASE}/api/login`
  const body = { email, password }
  console.log('POST', url, body)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  console.log('Status:', res.status)
  console.log('Response:', JSON.stringify(data, null, 2))
  return { ok: res.ok, status: res.status, data }
}

async function me(token) {
  const url = `${BASE}/api/me`
  console.log('GET', url)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
  const data = await res.json().catch(() => null)
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
