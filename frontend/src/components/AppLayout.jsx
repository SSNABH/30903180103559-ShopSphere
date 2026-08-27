import { Languages, LayoutDashboard, LogIn, LogOut, Menu, Moon, PackageSearch, ShoppingCart, Sun, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { authContent } from '../content/auth.js';
import { commerceContent } from '../content/commerce.js';
import { useAuth } from '../contexts/auth.js';
import { useCart } from '../contexts/cart.js';
import { usePreferences } from '../contexts/preferences.js';

export function AppLayout() {
  const { language, theme, toggleLanguage, toggleTheme } = usePreferences();
  const { user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const copy = authContent[language];
  const commerce = commerceContent[language];

  function closeMenu() { setMenuOpen(false); }

  return (
    <div className="site-shell">
      <header className="topbar">
        <NavLink className="brand" to="/" aria-label="ShopSphere home" onClick={closeMenu}>
          <span className="brand-mark">S</span><span>ShopSphere</span>
        </NavLink>
        <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={menuOpen ? commerce.closeMenu : commerce.openMenu}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <div className={`navigation-drawer ${menuOpen ? 'open' : ''}`}>
          <nav className="nav-links" aria-label={commerce.navigation}>
            <NavLink to="/" end onClick={closeMenu}>{copy.home}</NavLink>
            <NavLink to="/products" onClick={closeMenu}>{commerce.products}</NavLink>
            {user ? (
              <>
                <NavLink to="/cart" onClick={closeMenu}><ShoppingCart size={16} />{commerce.cart}{itemCount > 0 && <span className="cart-badge">{itemCount}</span>}</NavLink>
                <NavLink to="/orders" onClick={closeMenu}>{commerce.orders}</NavLink>
                <NavLink to="/profile" onClick={closeMenu}><UserRound size={16} />{copy.profile}</NavLink>
                {isAdmin && <NavLink to="/admin" end onClick={closeMenu}><LayoutDashboard size={16} />{commerce.dashboard}</NavLink>}
                {isAdmin && <NavLink to="/admin/catalog" onClick={closeMenu}><PackageSearch size={16} />{commerce.adminCatalog}</NavLink>}
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={closeMenu}><LogIn size={16} />{copy.signIn}</NavLink>
                <NavLink to="/register" onClick={closeMenu}>{copy.register}</NavLink>
              </>
            )}
          </nav>
          <div className="preferences">
            <button className="icon-button compact" type="button" onClick={toggleLanguage}><Languages size={18} aria-hidden="true" /><span>{language === 'en' ? 'العربية' : 'English'}</span></button>
            <button className="icon-button compact theme-button" type="button" onClick={toggleTheme} aria-label="Toggle color theme">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            {user && <button className="icon-button compact" type="button" onClick={() => { closeMenu(); logout(); }}><LogOut size={18} aria-hidden="true" /><span>{copy.signOut}</span></button>}
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer"><div><span className="brand-mark">S</span><strong>ShopSphere</strong></div><p>Full-stack electronics commerce · React · Express · PostgreSQL · MongoDB</p><small>© 2026 ShopSphere</small></footer>
    </div>
  );
}
