import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../pages/Home'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

describe('Home page', () => {
  it('renders the hero section with brand name', () => {
    renderHome()
    expect(screen.getByText('KuisKita!')).toBeInTheDocument()
  })

  it('renders the quiz join form', () => {
    renderHome()
    expect(screen.getByPlaceholderText('Contoh: Petualang Hebat')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('000 - 000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gabung Kuis!' })).toBeInTheDocument()
  })

  it('renders the steps section', () => {
    renderHome()
    expect(screen.getByText('Masukkan Kode')).toBeInTheDocument()
    expect(screen.getByText('Kerjakan Kuis')).toBeInTheDocument()
    expect(screen.getByText('Lihat Hasil')).toBeInTheDocument()
  })

  it('renders step numbers 1, 2, 3', () => {
    renderHome()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders the category cards', () => {
    renderHome()
    expect(screen.getByText('Sains')).toBeInTheDocument()
    expect(screen.getByText('Matematika')).toBeInTheDocument()
    expect(screen.getByText('Bahasa')).toBeInTheDocument()
  })

  it('renders the FAQ section', () => {
    renderHome()
    expect(screen.getByText('Pertanyaan Umum (FAQ)')).toBeInTheDocument()
    expect(screen.getByText('Bagaimana cara bergabung kuis?')).toBeInTheDocument()
    expect(screen.getByText('Apakah kuis ini berbayar?')).toBeInTheDocument()
    expect(screen.getByText('Bagaimana cara melihat skor?')).toBeInTheDocument()
  })

  it('renders "Jelajahi Kuis Umum" button', () => {
    renderHome()
    expect(screen.getByRole('button', { name: 'Jelajahi Kuis Umum' })).toBeInTheDocument()
  })

  it('renders the kicker text', () => {
    renderHome()
    expect(screen.getByText('UJI KEMAMPUANMU SEKARANG!')).toBeInTheDocument()
    expect(screen.getByText('PANDUAN CEPAT')).toBeInTheDocument()
  })
})
