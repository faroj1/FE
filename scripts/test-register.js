#!/usr/bin/env node
const fs = require('fs')

// read base from env var, CLI arg, or .env
const cli = process.argv[2]
let base = process.env.BASE || cli || ''
if (!base && fs.existsSync('.env')) {
  const env = fs.readFileSync('.env', 'utf8')
  const m = env.match(/VITE_API_BASE_URL\s*=\s*"?([^"\n\r]+)"?/) || env.match(/VITE_API_BASE\s*=\s*"?([^"\n\r]+)"?/)
  if (m) base = m[1]
}
if (!base) base = 'http://192.168.1.8:8000'
base = base.replace(/\/$/, '')

const payload = {
  email: 'guru@kuiskita.com',
  password: 'guru123',
  password_confirmation: 'guru123',
}

async function run() {
  const url = base + '/api/register'
  console.log('POST', url)
  try {
    if (typeof fetch !== 'function') {
      console.error('Node does not have global fetch. Use Node 18+ or run with experimental fetch.')
      process.exit(1)
    }
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
    const text = await res.text()
    console.log('Status:', res.status)
    console.log('Body:', text || '<empty>')
  } catch (err) {
    console.error('Request error:', err.message)
  }
}

run()
