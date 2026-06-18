import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getIamRuntime } from './bootstrap/iamRuntime';

export function LoginPage() {
  const navigate = useNavigate();
  const [authToken, setAuthToken] = useState('');
  const [accessToken, setAccessToken] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedAuthToken = authToken.trim();
    const normalizedAccessToken = accessToken.trim();
    if (!normalizedAuthToken || !normalizedAccessToken) {
      return;
    }

    getIamRuntime().tokenManager.setTokens({
      authToken: normalizedAuthToken,
      accessToken: normalizedAccessToken,
    });
    navigate('/', { replace: true });
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: 'min(100%, 420px)', display: 'grid', gap: 12 }}
      >
        <h1 style={{ margin: 0 }}>Sign in</h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Provide appbase IAM tokens to open the mobile shell.
        </p>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Auth token</span>
          <input
            value={authToken}
            onChange={(event) => setAuthToken(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Access token</span>
          <input
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}
