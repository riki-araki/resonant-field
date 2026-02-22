import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

// CSSリセット: マージン除去 + overflow hidden でフルスクリーン化
document.body.style.margin = '0'
document.body.style.overflow = 'hidden'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
