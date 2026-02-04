export const metadata = {
  title: 'Authentication Error - ZakTalks',
}

export default function AuthCodeErrorPage() {
  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)', marginBottom: 'var(--space-md)' }}>Authentication Failed</h2>
        <p style={{ marginBottom: 'var(--space-lg)' }}>
          We couldn't verify your request. The link may have expired or is invalid.
        </p>
        <a href="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
          Back to Login
        </a>
      </div>
    </div>
  )
}
