// Quick register test against backend API
// Usage: API_BASE=http://localhost:8000 TEST_NAME="Test User" TEST_EMAIL=user@example.com TEST_PASSWORD=secret node scripts/test-register.js

const BASE = process.env.API_BASE || 'http://localhost:8000'

async function register() {
  const name = process.env.TEST_NAME || 'Test User'
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD
  if (!email || !password) {
    console.error('Set TEST_EMAIL and TEST_PASSWORD environment variables')
    process.exit(1)
  }
  const url = `${BASE}/api/register`
  const body = {
    name,
    email,
    password,
    password_confirmation: password
  }
  console.log('POST', url)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  let data = null
  try { data = await res.json() } catch { /* ignore */ }
  console.log('Status:', res.status)
  console.log('Response:', JSON.stringify(data, null, 2))
}

register().catch(err => { console.error(err); process.exit(1) })
