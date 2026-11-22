'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Tallo — Application Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          :root {
            --bg: #F8F9F8;
            --surface: #FFFFFF;
            --border: #E3E8E5;
            --text: #1C2420;
            --text-muted: #5A6660;
            --brand: #0E7C57;
            --danger: #D9383A;
            --danger-soft: #FDE8E8;
            --r-lg: 16px;
            --r-md: 10px;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #0F1512;
              --surface: #18211D;
              --border: #24322B;
              --text: #E8ECE9;
              --text-muted: #8A9890;
              --brand: #1FAF7A;
              --danger: #F87171;
              --danger-soft: #381A1A;
            }
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
          .card {
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--r-lg);
            padding: 32px 24px;
            max-width: 440px;
            width: 90%;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }
          .icon {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background-color: var(--danger-soft);
            color: var(--danger);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px auto;
            font-size: 24px;
            font-weight: bold;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 8px 0;
          }
          p {
            font-size: 13px;
            color: var(--text-muted);
            line-height: 1.5;
            margin: 0 0 24px 0;
          }
          .btn {
            background-color: var(--brand);
            color: #ffffff;
            border: none;
            border-radius: var(--r-md);
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          .btn:hover {
            opacity: 0.9;
          }
          .details {
            margin-top: 20px;
            padding: 12px;
            background: rgba(0,0,0,0.03);
            border: 1px solid var(--border);
            border-radius: var(--r-md);
            text-align: left;
            font-family: monospace;
            font-size: 11px;
            word-break: break-all;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="icon">!</div>
          <h1>System Error</h1>
          <p>
            An unexpected error occurred while initializing the application. Your business records remain safely stored.
          </p>
          <button className="btn" onClick={() => reset()}>
            Reload Application
          </button>
          {error?.message && (
            <div className="details">
              <strong>Error:</strong> {error.message}
              {error.digest && <div><strong>Digest:</strong> {error.digest}</div>}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
