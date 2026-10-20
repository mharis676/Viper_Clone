import React, { useEffect } from 'react';
import {
  Search,
  Plus,
  Moon,
  Sun,
  CreditCard,
  Building2,
  Sparkles,
} from 'lucide-react';
import { BusinessProfile } from '../types.js';

interface TopHeaderProps {
  profile: BusinessProfile | null;
  onOpenSaleModal: () => void;
  onOpenPurchaseModal: () => void;
  onOpenPOS: () => void;
  onOpenSearch: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  profile,
  onOpenSaleModal,
  onOpenPurchaseModal,
  onOpenPOS,
  onOpenSearch,
  theme,
  setTheme,
}) => {
  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K -> Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
      // Alt+S -> New Sale
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onOpenSaleModal();
      }
      // Alt+P -> New Purchase
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        onOpenPurchaseModal();
      }
      // F2 -> POS Counter
      if (e.key === 'F2') {
        e.preventDefault();
        onOpenPOS();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch, onOpenSaleModal, onOpenPurchaseModal, onOpenPOS]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <div className="company-pill">
          <Building2 size={16} color="var(--primary)" />
          <span>{profile?.tradeName || profile?.name || 'My Business'}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {profile?.gstin ? `Tax ID: ${profile.gstin}` : 'Currency: PKR'}
          </span>
        </div>

        <button aria-label="Search parties, items and invoices" className="quick-search-btn" onClick={onOpenSearch}>
          <Search size={16} />
          <span>Search parties, items, invoices...</span>
          <span className="search-shortcut-badge">Ctrl + K</span>
        </button>
      </div>

      <div className="header-right">
        <button className="btn btn-pos" onClick={onOpenPOS} title="Open Point of Sale Counter (F2)">
          <CreditCard size={16} />
          <span>POS Counter</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.8, marginLeft: 2 }}>(F2)</span>
        </button>

        <button className="btn btn-primary" onClick={onOpenSaleModal} title="Add Sale Invoice (Alt+S)">
          <Plus size={16} />
          <span>+ Sale</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.8, marginLeft: 2 }}>(Alt+S)</span>
        </button>

        <button className="btn btn-secondary" onClick={onOpenPurchaseModal} title="Add Purchase Bill (Alt+P)">
          <Plus size={16} />
          <span>+ Purchase</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.8, marginLeft: 2 }}>(Alt+P)</span>
        </button>

        <button className="btn-icon" onClick={toggleTheme} title="Toggle Dark/Light Mode">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  );
};
