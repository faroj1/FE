// Quick register test against backend API
// Usage: node scripts/test-register.js

const BASE = process.env.API_BASE || 'http://192.168.1.20'

async function register() {
  const url = `${BASE}/api/register`
  const body = {
    name: 'Guru Baru',
    email: 'guru@example.com',
    password: 'password123',
    password_confirmation: 'password123'
  }
  console.log('POST', url)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  let data = null
  try { data = await res.json() } catch (e) { console.warn('Failed to parse register response:', e.message) }
  console.log('Status:', res.status)
  console.log('Response:', JSON.stringify(data, null, 2))
}

register().catch(err => { console.error(err); process.exit(1) })
