import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import AdminLogin from './admin/pages/AdminLogin'
import AdminDashboard from './admin/pages/AdminDashboard'
import AdminStudents from './admin/pages/AdminStudents'
import AdminEnquiries from './admin/pages/AdminEnquiries'
import AdminServices from './admin/pages/AdminServices'
import AdminTestimonials from './admin/pages/AdminTestimonials'
import AdminBlog from './admin/pages/AdminBlog'
import AdminSettings from './admin/pages/AdminSettings'
import AdminManagement from './admin/pages/AdminManagement'
import AdminActivityLogs from './admin/pages/AdminActivityLogs'
import AdminRouteGuard from './admin/components/AdminRouteGuard'
import AdminLayout from './admin/components/AdminLayout'
import { ADMIN_ROLE } from './admin/permissions'
import { PortalProvider } from './context/PortalContext'
import Seo from './components/Seo'

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
    <>
      <Seo
        title="Admin Portal | Universe Consult"
        description="Private Universe Consult administration portal."
        pathname="/admin"
        noIndex
      />
      <Routes>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={(
            <AdminRouteGuard>
              {(admin) => <AdminLayout admin={admin}>
                <AdminDashboard />
              </AdminLayout>}
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/students"
          element={(
            <AdminRouteGuard>
              {(admin) => <AdminLayout admin={admin}>
                <AdminStudents />
              </AdminLayout>}
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/enquiries"
          element={(
            <AdminRouteGuard roles={[ADMIN_ROLE.SUPER_ADMIN]}>
              {(admin) => <AdminLayout admin={admin}>
                <AdminEnquiries />
              </AdminLayout>}
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/services"
          element={(
            <AdminRouteGuard roles={[ADMIN_ROLE.SUPER_ADMIN]}>
              {(admin) => <AdminLayout admin={admin}>
                <AdminServices />
              </AdminLayout>}
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/testimonials"
          element={(
            <AdminRouteGuard>
              {(admin) => <AdminLayout admin={admin}>
                <AdminTestimonials />
              </AdminLayout>}
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/blog"
          element={(
            <AdminRouteGuard>
              {(admin) => <AdminLayout admin={admin}>
                <AdminBlog />
              </AdminLayout>}
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/admins"
          element={(
            <AdminRouteGuard roles={[ADMIN_ROLE.SUPER_ADMIN]}>
              {(admin) => <AdminLayout admin={admin}>
                <AdminManagement />
              </AdminLayout>}
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/activity-logs"
          element={(
            <AdminRouteGuard roles={[ADMIN_ROLE.SUPER_ADMIN]}>
              {(admin) => <AdminLayout admin={admin}>
                <AdminActivityLogs />
              </AdminLayout>}
            </AdminRouteGuard>
          )}
        />
        <Route
          path="/admin/settings"
          element={(
            <AdminRouteGuard>
              {(admin) => <AdminLayout admin={admin}>
                <AdminSettings />
              </AdminLayout>}
            </AdminRouteGuard>
          )}
        />
      </Routes>
    </>
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
