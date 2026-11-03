import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Mail, UserRound, X } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Services', href: '/services' },
  { name: 'Explore Universities', href: '/explore-universities' },
  { name: 'Contact', href: '/contact' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 shadow-[0_8px_24px_rgba(13,42,84,0.08)]">
      <div className="bg-primary-900 text-white">
        <div className="mx-auto flex max-w-7xl justify-end px-4 py-2.5 text-xs sm:px-6 sm:text-sm lg:px-10">
          <a
            href="mailto:support@universeconsultsedu.com"
            className="flex min-w-0 items-center gap-2 transition-colors hover:text-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
          >
            <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-300" />
            <span className="truncate">support@universeconsultsedu.com</span>
          </a>
        </div>
      </div>

      <nav aria-label="Main navigation" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex h-20 items-center justify-between gap-3 sm:h-24 sm:gap-4">
            <Link
              to="/"
              onClick={closeMenu}
              aria-label="Universe Consults home"
              className="flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              <img
                src="/logo.png"
                alt="Universe Consult Logo"
                className="h-14 w-auto object-contain"
              />
            </Link>

            <div className="hidden flex-1 items-center justify-center md:flex">
              <div className="flex items-center justify-center gap-1 lg:gap-4 xl:gap-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`rounded-sm border-b-2 px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 lg:px-3 lg:text-base ${
                      isActive(item.href)
                        ? 'border-accent-400 text-accent-600'
                        : 'border-transparent text-gray-700 hover:border-accent-300 hover:text-primary-900'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                to="/portal/setup"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-900 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 sm:px-4 sm:text-base"
              >
                <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span>Student Portal</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                aria-controls="mobile-main-navigation"
                aria-label={isOpen ? 'Close main menu' : 'Open main menu'}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-primary-900 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 md:hidden"
              >
                {isOpen
                  ? <X aria-hidden="true" className="h-6 w-6" />
                  : <Menu aria-hidden="true" className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        <div
          id="mobile-main-navigation"
          className={`${isOpen ? 'block' : 'hidden'} border-t border-gray-100 bg-white md:hidden`}
        >
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeMenu}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-inset ${
                  isActive(item.href)
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-900'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
