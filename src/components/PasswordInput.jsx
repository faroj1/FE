import { useState } from 'react'

const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5c5 0 9 4 9 7s-4 7-9 7-9-4-9-7 4-7 9-7z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3l18 18" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function PasswordInput({ value, onChange, placeholder = 'Minimal 8 karakter', autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false)

  return (
    <div className="input-wrap">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete}
      />
      <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label="toggle">
        {show ? <EyeClosed /> : <EyeOpen />}
      </button>
    </div>
  )
}
