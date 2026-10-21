import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  DollarSign,
  Landmark,
  FileBarChart,
  Settings,
  Store,
  Layers,
  Download,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'parties'
  | 'items'
  | 'sales'
  | 'purchases'
  | 'pos'
  | 'expenses'
  | 'cash-bank'
  | 'reports'
  | 'settings'
  | 'backup';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Store size={22} />
        </div>
        <div>
          <span className="sidebar-title">Viper</span>
          <span className="sidebar-badge" style={{ marginLeft: 6 }}>BUSINESS</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'parties' ? 'active' : ''}`}
          onClick={() => setActiveTab('parties')}
        >
          <Users size={18} />
          <span>Parties</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <Package size={18} />
          <span>Items / Stock</span>
        </button>

        <div className="nav-section-label">Sales & Billing</div>

        <button
          className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <ShoppingCart size={18} />
          <span>Sales & Invoices</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
        >
          <CreditCard size={18} />
          <span>Point of Sale (POS)</span>
        </button>

        <div className="nav-section-label">Purchases & Expenses</div>

        <button
          className={`nav-item ${activeTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setActiveTab('purchases')}
        >
          <ShoppingBag size={18} />
          <span>Purchases</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <DollarSign size={18} />
          <span>Expenses</span>
        </button>

        <div className="nav-section-label">Finance & Growth</div>

        <button
          className={`nav-item ${activeTab === 'cash-bank' ? 'active' : ''}`}
          onClick={() => setActiveTab('cash-bank')}
        >
          <Landmark size={18} />
          <span>Cash & Bank</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileBarChart size={18} />
          <span>Reports & GST</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          <Download size={18} />
          <span>Backup & Restore</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </nav>
    </aside>
  );
};
