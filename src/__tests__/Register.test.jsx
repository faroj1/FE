import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Register from '../pages/Register'

vi.mock('../utils/api', () => ({
  register: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { register } from '../utils/api'

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  )
}

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the registration form', () => {
    renderRegister()
    expect(screen.getByText('Daftar Akun Guru')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('nama@gmail.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Minimal 8 karakter')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ulangi kata sandi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Daftar' })).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByPlaceholderText('nama@gmail.com'), 'a@b.com')
    await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), 'password1')
    await user.type(screen.getByPlaceholderText('Ulangi kata sandi'), 'password2')
    await user.click(screen.getByRole('button', { name: 'Daftar' }))

    expect(screen.getByText('Password tidak cocok')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('calls register API and navigates to login on success', async () => {
    const user = userEvent.setup()
    register.mockResolvedValueOnce({
      ok: true,
      data: { message: 'Registrasi berhasil' },
    })

    renderRegister()
    await user.type(screen.getByPlaceholderText('nama@gmail.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), 'password123')
    await user.type(screen.getByPlaceholderText('Ulangi kata sandi'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Daftar' }))

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        name: 'test',
        email: 'test@example.com',
        password: 'password123',
        password_confirmation: 'password123',
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('shows validation errors from 422 response', async () => {
    const user = userEvent.setup()
    register.mockResolvedValueOnce({
      ok: false,
      status: 422,
      data: { errors: { email: ['Email already taken'] } },
    })

    renderRegister()
    await user.type(screen.getByPlaceholderText('nama@gmail.com'), 'dup@x.com')
    await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), 'pass1234')
    await user.type(screen.getByPlaceholderText('Ulangi kata sandi'), 'pass1234')
    await user.click(screen.getByRole('button', { name: 'Daftar' }))

    await waitFor(() => {
      expect(screen.getByText('Email already taken')).toBeInTheDocument()
    })
  })

  it('shows generic error on non-422 failure', async () => {
    const user = userEvent.setup()
    register.mockResolvedValueOnce({
      ok: false,
      status: 500,
      data: { message: 'Server error' },
    })

    renderRegister()
    await user.type(screen.getByPlaceholderText('nama@gmail.com'), 'x@x.com')
    await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), 'pass1234')
    await user.type(screen.getByPlaceholderText('Ulangi kata sandi'), 'pass1234')
    await user.click(screen.getByRole('button', { name: 'Daftar' }))

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    let resolve
    register.mockReturnValueOnce(new Promise((r) => { resolve = r }))

    renderRegister()
    await user.type(screen.getByPlaceholderText('nama@gmail.com'), 'a@b.com')
    await user.type(screen.getByPlaceholderText('Minimal 8 karakter'), 'pw123456')
    await user.type(screen.getByPlaceholderText('Ulangi kata sandi'), 'pw123456')
    await user.click(screen.getByRole('button', { name: 'Daftar' }))

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled()

    resolve({ ok: true, data: { message: 'ok' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Daftar' })).not.toBeDisabled()
    })
  })

  it('toggles password visibility for both password fields', async () => {
    const user = userEvent.setup()
    renderRegister()

    const pwInput = screen.getByPlaceholderText('Minimal 8 karakter')
    const confirmInput = screen.getByPlaceholderText('Ulangi kata sandi')
    const toggleButtons = screen.getAllByRole('button', { name: 'toggle' })

    expect(pwInput).toHaveAttribute('type', 'password')
    expect(confirmInput).toHaveAttribute('type', 'password')

    await user.click(toggleButtons[0])
    expect(pwInput).toHaveAttribute('type', 'text')
    expect(confirmInput).toHaveAttribute('type', 'text')
  })

  it('shows link to login page', () => {
    renderRegister()
    const loginLink = screen.getByText('Masuk di sini')
    expect(loginLink).toHaveAttribute('href', '/login')
  })
})
