import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

// Mock child pages to isolate App routing logic
vi.mock('../pages/Home', () => ({ default: () => <div data-testid="home-page">Home</div> }))
vi.mock('../pages/Login', () => ({ default: () => <div data-testid="login-page">Login</div> }))
vi.mock('../pages/Register', () => ({ default: () => <div data-testid="register-page">Register</div> }))

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  )
}

describe('App', () => {
  it('renders the header with brand name', () => {
    renderApp()
    expect(screen.getByText('KuisKita')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    renderApp()
    expect(screen.getByText('Beranda')).toBeInTheDocument()
    expect(screen.getByText('Daftar Kuis')).toBeInTheDocument()
    expect(screen.getByText('Login Guru')).toBeInTheDocument()
  })

  it('renders Home page on / route', () => {
    renderApp('/')
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  it('renders Login page on /login route', () => {
    renderApp('/login')
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('renders Register page on /register route', () => {
    renderApp('/register')
    expect(screen.getByTestId('register-page')).toBeInTheDocument()
  })

  it('Login Guru link points to /login', () => {
    renderApp()
    const loginLink = screen.getByText('Login Guru')
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })
})
