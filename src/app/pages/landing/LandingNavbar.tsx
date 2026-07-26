import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Menu, X, Package, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/app/components/LanguageSelector';

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: t('landing.features') },
    { href: '#pricing', label: t('landing.pricing') },
    { href: '#contact', label: t('landing.contact') },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{ 
        backgroundColor: isScrolled ? (isDark ? '#1e293b' : '#f2f2f2') : 'transparent',
        boxShadow: isScrolled ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              KUBIKA system
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-colors relative group text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 group-hover:w-full transition-all duration-300" style={{ backgroundColor: '#7c3aed' }} />
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons - Always show login/signup regardless of auth */}
          <div className="hidden md:flex items-center gap-2">
            <LanguageSelector variant="landing" />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 text-slate-800 dark:text-slate-100"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Login Link */}
            <Link to="/login">
              <Button
                variant="ghost"
                className="font-medium text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400"
              >
                {t('landing.login')}
              </Button>
            </Link>

            {/* Register Link */}
            <Link to="/register">
              <Button
                className="font-medium px-5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {t('landing.getStarted')}
              </Button>
            </Link>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSelector variant="landing" className="p-2 rounded-lg text-slate-800 dark:text-slate-100" />

            <button
              className="p-2 rounded-lg text-slate-800 dark:text-slate-100"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              className="p-2 rounded-lg text-slate-800 dark:text-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden border-t"
          style={{ 
            backgroundColor: isDark ? '#1e293b' : '#f2f2f2',
            borderColor: isDark ? '#334155' : '#e2e8f0'
          }}
        >
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block py-2 text-base font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 space-y-3 border-t border-slate-200 dark:border-slate-700">
              {/* Mobile Login/Register Links */}
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full font-medium text-slate-700 dark:text-slate-200">
                  Log In
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full font-medium bg-purple-500 hover:bg-purple-600 text-white">
                  Sign Up
                </Button>
              </Link>
              {/* Navigation Links */}
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full font-medium bg-purple-500 hover:bg-purple-600 text-white">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
