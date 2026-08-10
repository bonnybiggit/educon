import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import Home from './pages/Home'
import About from './pages/About'
import Services from './pages/Services'
import FAQs from './pages/FAQs'
import Contact from './pages/Contact'
import ExploreUniversities from './pages/ExploreUniversities'
import Login from './pages/Login'
import PortalSetup from './pages/PortalSetup'
import Dashboard from './pages/Dashboard'
import Logout from './pages/Logout'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import { PortalProvider } from './context/PortalContext'

const MainSiteContent = () => {
  const location = useLocation()
  const [showLogoSplash, setShowLogoSplash] = useState(true)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setShowLogoSplash(true)
    const timer = window.setTimeout(() => {
      setShowLogoSplash(false)
    }, 600)

    return () => window.clearTimeout(timer)
  }, [location.pathname])

  return (
    <div className="relative flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/explore-universities" element={<ExploreUniversities />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/portal/setup" element={<PortalSetup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/logout" element={<Logout />} />
        </Routes>
      </main>
      <Footer />
      <WhatsAppButton />

      {showLogoSplash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <img
            src="/logo.png"
            alt="Universe Consult Logo"
            className="h-28 md:h-32 w-auto animate-fade-in"
          />
        </div>
      )}
    </div>
  )
}

const AdminContent = () => {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
    </Routes>
  )
}

function App() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <PortalProvider>
      {isAdminRoute ? <AdminContent /> : <MainSiteContent />}
    </PortalProvider>
  )
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  )
}

export default AppWrapper
