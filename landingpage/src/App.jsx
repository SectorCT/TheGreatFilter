import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import LandingPage from './LandingPage'
import DownloadPage from './pages/DownloadPage'
import AboutPage from './pages/AboutPage'

const PAGE_TITLES = {
  '/': 'Qlean - Home',
  '/download': 'Qlean - Download',
  '/about': 'Qlean - About',
}

function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = PAGE_TITLES[pathname] ?? 'Qlean'
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <DocumentTitle />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

