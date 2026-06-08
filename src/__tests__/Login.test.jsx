import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from '../pages/Login'

// Mock the api module
vi.mock('../utils/api', () => ({
  login: vi.fn(),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { login } from '../utils/api'

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the login form with email and password fields', () => {
    renderLogin()
    expect(screen.getByText('Masuk ke Akun')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('nama@gmail.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Minimal 8 karakter')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderLogin()
    const passwordInput = screen.getByPlaceholderText('Minimal 8 karakter')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'toggle' }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'toggle' }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('calls login API and navigates on success', async () => {
    const user = userEvent.setup()
    login.mockResolvedValueOnce({
      ok: true,
      data: {
        message: 'Login berhasil',
        data: { token: 'jwt-123', user: { id: 1, name: 'Test' } },
      },
    })

    renderLogin()

    await user.type(screen.getByPlaceholderText('nama@gmail.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' })
    })

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt-123')
      expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 1, name: 'Test' })
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows error on failed login', async () => {
    const user = userEvent.setup()
    login.mockResolvedValueOnce({
      ok: false,
      status: 401,
      data: { message: 'Invalid credentials' },
    })

    renderLogin()
    await user.type(screen.getByPlaceholderText('nama@gmail.com'), 'bad@test.com')
    await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('shows validation errors from 422 response', async () => {
    const user = userEvent.setup()
    login.mockResolvedValueOnce({
      ok: false,
      status: 422,
      data: { errors: { email: ['Email is required'], password: ['Password too short'] } },
    })

    renderLogin()
    await user.type(screen.getByPlaceholderText('nama@gmail.com'), 'x@x.com')
    await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), 'x')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    await waitFor(() => {
      expect(screen.getByText('Email is required Password too short')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    let resolve
    login.mockReturnValueOnce(new Promise((r) => { resolve = r }))

    renderLogin()
    await user.type(screen.getByPlaceholderText('nama@gmail.com'), 'a@b.com')
    await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), 'pw')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled()

    resolve({ ok: true, data: { message: 'ok', data: {} } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Masuk' })).not.toBeDisabled()
    })
  })

  it('shows link to register page', () => {
    renderLogin()
    const registerLink = screen.getByText('Daftar')
    expect(registerLink).toHaveAttribute('href', '/register')
  })
})
