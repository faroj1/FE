#!/usr/bin/env node
const { URL } = require('url')
const http = require('http')
const https = require('https')

const target = process.argv[2] || process.env.CHECK_URL || 'http://192.168.1.8:8000/api'
const url = new URL(target)

const lib = url.protocol === 'https:' ? https : http
const options = { method: 'GET', timeout: 5000, headers: { Accept: 'application/json' } }

console.log('Checking backend URL:', target)

const req = lib.request(url, options, (res) => {
  console.log('Status:', res.statusCode)
  console.log('Headers:', res.headers)
  let body = ''
  res.setEncoding('utf8')
  res.on('data', (chunk) => {
    body += chunk
    if (body.length > 20000) {
      body = body.slice(0, 20000) + '...[truncated]'
      // do not force-close; let it finish streaming
    }
  })
  res.on('end', () => {
    console.log('Body:', body || '<empty>')
  })
})

req.on('timeout', () => {
  console.error('Request timed out')
  req.destroy()
})

req.on('error', (err) => {
  console.error('Request error:', err.message)
  if (err.code) console.error('Error code:', err.code)
})

req.end()

// Usage:
// node scripts/check-backend.js http://192.168.1.8:8000/api
// or set CHECK_URL env var
