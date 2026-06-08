import '../styles/auth.css'

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="auth-card-wrapper">
      <div className="auth-blob auth-blob-left" aria-hidden></div>
      <div className="auth-blob auth-blob-right" aria-hidden></div>

      <div className="auth-card">
        <h3 className="auth-title">{title}</h3>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        <div className="auth-body">{children}</div>
      </div>
    </div>
  )
}
