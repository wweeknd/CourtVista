import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1f1f1f',
          color: '#fff',
          border: '1px solid #c9a84c',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          padding: '14px 20px',
          fontSize: '0.95rem',
        },
        success: {
          iconTheme: {
            primary: '#c9a84c',
            secondary: '#1f1f1f',
          },
        },
      }}
    />
  </StrictMode>,
)
