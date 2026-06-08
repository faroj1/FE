import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AuthCard from '../components/AuthCard'

describe('AuthCard', () => {
  it('renders the title', () => {
    render(<AuthCard title="Test Title">content</AuthCard>)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders the subtitle when provided', () => {
    render(<AuthCard title="T" subtitle="My Subtitle">content</AuthCard>)
    expect(screen.getByText('My Subtitle')).toBeInTheDocument()
  })

  it('does not render subtitle when not provided', () => {
    const { container } = render(<AuthCard title="T">content</AuthCard>)
    expect(container.querySelector('.auth-subtitle')).toBeNull()
  })

  it('renders children inside auth-body', () => {
    render(
      <AuthCard title="T">
        <button>Click me</button>
      </AuthCard>
    )
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('renders decorative blobs', () => {
    const { container } = render(<AuthCard title="T">c</AuthCard>)
    expect(container.querySelector('.auth-blob-left')).toBeInTheDocument()
    expect(container.querySelector('.auth-blob-right')).toBeInTheDocument()
  })

  it('has the correct structure classes', () => {
    const { container } = render(<AuthCard title="T">c</AuthCard>)
    expect(container.querySelector('.auth-card-wrapper')).toBeInTheDocument()
    expect(container.querySelector('.auth-card')).toBeInTheDocument()
    expect(container.querySelector('.auth-title')).toBeInTheDocument()
    expect(container.querySelector('.auth-body')).toBeInTheDocument()
  })
})
