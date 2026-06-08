import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to mock import.meta.env before importing the module
vi.stubGlobal('fetch', vi.fn())

let api

describe('utils/api', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn())
    localStorage.clear()

    // Re-import to get fresh module state
    api = await import('../utils/api.js')
    api.setApiBase('http://test.local')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setApiBase', () => {
    it('strips trailing slashes', () => {
      api.setApiBase('http://example.com/')
      // Verify by calling login and checking fetch URL
      fetch.mockResolvedValueOnce(new Response('{}', { status: 200 }))
      api.login({ email: 'a', password: 'b' })
      expect(fetch).toHaveBeenCalledWith(
        'http://example.com/api/login',
        expect.any(Object)
      )
    })

    it('handles empty/null input', () => {
      api.setApiBase(null)
      fetch.mockResolvedValueOnce(new Response('{}', { status: 200 }))
      api.login({ email: 'a', password: 'b' })
      expect(fetch).toHaveBeenCalledWith('/api/login', expect.any(Object))
    })

    it('handles undefined input', () => {
      api.setApiBase(undefined)
      fetch.mockResolvedValueOnce(new Response('{}', { status: 200 }))
      api.login({ email: 'a', password: 'b' })
      expect(fetch).toHaveBeenCalledWith('/api/login', expect.any(Object))
    })
  })

  describe('login', () => {
    it('sends POST with email and password as JSON', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const result = await api.login({ email: 'user@test.com', password: 'pass123' })

      expect(fetch).toHaveBeenCalledWith('http://test.local/api/login', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@test.com', password: 'pass123' }),
      })
      expect(result.ok).toBe(true)
      expect(result.data).toEqual({ success: true })
    })

    it('returns ok:false with status on server error', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const result = await api.login({ email: 'bad@test.com', password: 'wrong' })
      expect(result.ok).toBe(false)
      expect(result.status).toBe(401)
      expect(result.data.message).toBe('Invalid credentials')
    })

    it('handles network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await api.login({ email: 'a@b.com', password: 'x' })
      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
      expect(result.data.message).toBe('Network error')
    })

    it('handles non-JSON response body', async () => {
      fetch.mockResolvedValueOnce(
        new Response('plain text response', {
          status: 200,
        })
      )

      const result = await api.login({ email: 'a@b.com', password: 'x' })
      expect(result.ok).toBe(true)
      expect(result.data).toBe('plain text response')
    })

    it('handles empty response body', async () => {
      fetch.mockResolvedValueOnce(
        new Response('', { status: 200 })
      )

      const result = await api.login({ email: 'a@b.com', password: 'x' })
      expect(result.ok).toBe(true)
      expect(result.data).toBeNull()
    })
  })

  describe('register', () => {
    it('sends POST with registration payload', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Registered' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const payload = { name: 'Test', email: 'test@x.com', password: 'pass', password_confirmation: 'pass' }
      const result = await api.register(payload)

      expect(fetch).toHaveBeenCalledWith('http://test.local/api/register', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      expect(result.ok).toBe(true)
    })

    it('returns validation errors on 422', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ errors: { email: ['taken'] } }), {
          status: 422,
        })
      )

      const result = await api.register({ name: 'x', email: 'x', password: 'y', password_confirmation: 'y' })
      expect(result.ok).toBe(false)
      expect(result.status).toBe(422)
      expect(result.data.errors.email).toContain('taken')
    })
  })

  describe('me', () => {
    it('sends GET with auth token from localStorage', async () => {
      localStorage.setItem('token', 'test-jwt-token')
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, name: 'Test' }), { status: 200 })
      )

      const result = await api.me()
      expect(fetch).toHaveBeenCalledWith('http://test.local/api/me', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer test-jwt-token',
        },
      })
      expect(result.ok).toBe(true)
      expect(result.data.id).toBe(1)
    })

    it('omits Authorization header when no token', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Unauthenticated' }), { status: 401 })
      )

      await api.me()
      const headers = fetch.mock.calls[0][1].headers
      expect(headers.Authorization).toBeUndefined()
    })
  })

  describe('logout', () => {
    it('sends POST with auth headers', async () => {
      localStorage.setItem('token', 'my-token')
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Logged out' }), { status: 200 })
      )

      const result = await api.logout()
      expect(fetch).toHaveBeenCalledWith('http://test.local/api/logout', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer my-token',
        },
      })
      expect(result.ok).toBe(true)
    })
  })

  describe('detectAndSetBase', () => {
    it('returns current baseUrl if already set', async () => {
      api.setApiBase('http://already-set.local')
      const result = await api.detectAndSetBase()
      expect(result).toBe('http://already-set.local')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('probes candidates and returns the first reachable one', async () => {
      api.setApiBase('')
      const candidates = ['http://host1:8000', 'http://host2:8000']

      // First candidate fails, second succeeds
      fetch
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(new Response('', { status: 200 }))

      const result = await api.detectAndSetBase(candidates)
      expect(result).toBe('http://host2:8000')
    })

    it('returns empty string when no candidate is reachable', async () => {
      api.setApiBase('')
      const candidates = ['http://fail1:8000', 'http://fail2:8000']

      fetch
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))

      const result = await api.detectAndSetBase(candidates)
      expect(result).toBe('')
    })

    it('uses default candidates when none provided', async () => {
      api.setApiBase('')
      // All fail
      fetch.mockRejectedValue(new Error('fail'))

      await api.detectAndSetBase([])
      // Should have called fetch for each default candidate
      expect(fetch.mock.calls.length).toBe(3)
      expect(fetch.mock.calls[0][0]).toBe('http://192.168.1.20:8000/api')
      expect(fetch.mock.calls[1][0]).toBe('http://192.168.1.20:8080/api')
      expect(fetch.mock.calls[2][0]).toBe('http://192.168.1.20/api')
    })

    it('strips trailing slash from detected base', async () => {
      api.setApiBase('')
      const candidates = ['http://host.local:8000/']

      fetch.mockResolvedValueOnce(new Response('', { status: 200 }))

      const result = await api.detectAndSetBase(candidates)
      expect(result).toBe('http://host.local:8000')
    })
  })
})
