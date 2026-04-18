 'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function goToApp(event?: FormEvent) {
    event?.preventDefault()
    router.push('/app')
  }

  return (
    <main id="screen-signin" className="signin-screen">
      <div className="signin-wrap">
        <div className="signin-box">
          <div className="signin-logo">
            <div className="signin-brand">CLOUD SOURCE</div>
            <div className="signin-tag">Navigate Your World</div>
          </div>

          <form className="signin-card" onSubmit={goToApp}>
            <div className="fg" style={{ marginBottom: 14 }}>
              <label>Email</label>
              <input
                className="inp"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="traveler@cloudsource.app"
                autoComplete="email"
              />
            </div>

            <div className="fg" style={{ marginBottom: 8 }}>
              <label>Password</label>
              <input
                className="inp"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <button type="button" className="signin-link-btn" onClick={() => router.push('/app')}>
                Forgot password?
              </button>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', fontSize: 15, padding: 13 }} type="submit">
              SIGN IN
            </button>

            <div className="or-row">
              <div className="line" />
              <span>or</span>
              <div className="line" />
            </div>

            <button
              className="btn btn-ghost"
              type="button"
              style={{ width: '100%', padding: 12 }}
              onClick={() => router.push('/app')}
            >
              🌐 Continue with Google
            </button>
          </form>

          <div className="signin-footer">
            No account?{' '}
            <button type="button" className="signin-link-btn" onClick={() => router.push('/app')}>
              Create one free →
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
