import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar (Persistent) */}
      <div className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        <AdminSidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={closeMobileMenu}
        />

        {/* Sidebar Drawer container */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-64 max-w-xs bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AdminSidebar onClose={closeMobileMenu} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader onMenuToggle={toggleMobileMenu} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
