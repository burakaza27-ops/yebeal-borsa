import { useState, useEffect, useCallback, Component } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUser } from './api';
import {
  Home, ShoppingBag, Calendar, Wallet, Bell, Settings as SettingsIcon, LogOut,
  Shield, Users, BarChart3, Package, X, User, Menu, Sun, Moon,
  CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import {
  initDB, readDB, isLoggedIn, setLoggedIn,
  getUser, getUnreadCount, getNotifications, markNotificationsRead,
  formatDateTime, TRANSLATIONS
} from './db';
import AuthPortal from './components/AuthPortal';
import CustomerDashboard from './components/CustomerDashboard';
import HolidayPlanner from './components/HolidayPlanner';
import WalletHub from './components/WalletHub';
import Marketplace from './components/Marketplace';
import AdminDashboard from './components/AdminDashboard';
import SellerDashboard from './components/SellerDashboard';
import Settings from './components/Settings';

// ============================================
// PRODUCTION POLISH: REACT ERROR BOUNDARY
// ============================================
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', padding: 24, textAlign: 'center', background: 'var(--bg-deep)', color: 'var(--text-primary)',
          fontFamily: 'Outfit, sans-serif'
        }}>
          <span style={{ fontSize: '4rem', marginBottom: 16 }}>⚠️</span>
          <h2 style={{ marginBottom: 8, fontWeight: 700 }}>የበዓል ቦርሳ | Yebeal Borsa</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 480, fontSize: '0.9rem', lineHeight: 1.6 }}>
            Oops! An unexpected rendering error occurred. Rest assured, your savings and listings are completely safe.
          </p>
          <button className="btn btn-gold" onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const queryClient = useQueryClient();
  const [dbReady, setDbReady] = useState(false);
  const [loggedIn, setLoggedInState] = useState(isLoggedIn());

  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    enabled: loggedIn,
    retry: false,
  });

  const user = userData?.user;

  const [role, setRole] = useState('customer');
  const [page, setPage] = useState('dashboard');
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState(localStorage.getItem('yebeal_borsa_theme') || 'dark');
  
  // Production dynamic Toast state
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // auto dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Offline detection state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast(lang === 'am' ? 'የበይነመረብ ግንኙነት ተመልሷል ✓' : 'Internet connection restored ✓', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(lang === 'am' ? 'ከመስመር ውጭ ነው - የበይነመረብ ግንኙነት የለም' : 'Offline - No Internet Connection', 'warning');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lang, showToast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('yebeal_borsa_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };


  useEffect(() => {
    initDB();
    setDbReady(true);
  }, []);

  useEffect(() => {
    if (userError) {
      console.warn("Auth error, logging out...", userError);
      handleLogout();
    }
  }, [userError]);

  useEffect(() => {
    if (user) {
      if (user.language) setLang(user.language);
      if (user.role) {
        const lowerRole = user.role.toLowerCase();
        setRole(lowerRole);
        if (lowerRole === 'admin') setPage('admin');
        else if (lowerRole === 'seller') setPage('seller');
        else setPage('dashboard');
      }
    }
  }, [user]);

  const refreshNotifs = useCallback(() => {
    setUnreadCount(getUnreadCount());
    setNotifications(getNotifications());
    if (user?.language) setLang(user.language);
  }, [user]);

  useEffect(() => {
    if (loggedIn) refreshNotifs();
  }, [loggedIn, refreshNotifs, refreshKey]);

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    setRefreshKey(k => k + 1);
    refreshNotifs();
  };

  const handleLogin = async () => {
    setLoggedInState(true);
    await queryClient.invalidateQueries();
    refreshNotifs();
  };

  const handleLogout = async () => {
    await setLoggedIn(false);
    setLoggedInState(false);
    setPage('dashboard');
    setRole('customer');
    queryClient.clear();
  };

  const openNotifs = () => {
    setShowNotifs(true);
    markNotificationsRead();
    setTimeout(refreshNotifs, 100);
  };

  if (!dbReady) return null;
  if (!loggedIn) {
    return (
      <ErrorBoundary>
        <AuthPortal onLogin={handleLogin} lang={lang} showToast={showToast} />
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>
              <span className="toast-icon">
                {toast.type === 'success' && <CheckCircle size={18} />}
                {toast.type === 'error' && <XCircle size={18} />}
                {toast.type === 'warning' && <AlertTriangle size={18} />}
              </span>
              <span className="toast-message">{toast.message}</span>
            </div>
          </div>
        )}
      </ErrorBoundary>
    );
  }

  if (loggedIn && userLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-deep)' }}>
        <div className="spinner" />
      </div>
    );
  }
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const translateNotificationTitle = (title) => {
    if (lang !== 'am') return title;
    if (title.startsWith('Deposit Confirmed')) return 'ተቀማጭ ተረጋግጧል ✓';
    if (title.includes('Eid al-Adha Reminder')) return 'የዒድ አል-አድሃ ማስታወሻ';
    if (title.includes('New Animals Listed')) return 'አዲስ እንስሳት ተመዝግበዋል';
    if (title.includes('Silver Tier Achieved')) return 'የብር ደረጃ ደርሰዋል! 🎉';
    if (title.includes('Gold Tier Achieved')) return 'የወርቅ ደረጃ ደርሰዋል! 🎉';
    if (title.includes('Holiday Season Discount')) return 'የበዓል ሰሞን ቅናሽ!';
    if (title.includes('Delivery Complete')) return 'ማድረስ ተጠናቋል';
    if (title.includes('Withdrawal Requested')) return 'ገንዘብ ማውጣት ተጠይቋል';
    if (title.includes('Withdrawal Approved')) return 'ገንዘብ ማውጣት ጽድቋል ✓';
    if (title.includes('Withdrawal Rejected')) return 'ገንዘብ ማውጣት ውድቅ ተደርጓል ✗';
    if (title.includes('Holiday Deposit')) return 'የበዓል ተቀማጭ ✓';
    if (title.includes('Order Placed')) return 'ትዕዛዝ ተቀምጧል! 🎉';
    return title;
  };

  const translateNotificationMessage = (msg) => {
    if (lang !== 'am') return msg;
    if (msg.includes('Your deposit of') && msg.includes('has been confirmed')) {
      const match = msg.match(/Your deposit of ([\d,]+) ETB via (\w+) has been confirmed/);
      if (match) {
        const methodMap = {
          'Telebirr': 'ቴሌቢር',
          'CBE Birr': 'ሲቢኢ ብር',
          'Bank Transfer': 'ባንክ ማስተላለፍ'
        };
        const method = methodMap[match[2]] || match[2];
        return `የእርስዎ ተቀማጭ ${match[1]} ብር በ${method} በኩል ተረጋግጧል።`;
      }
      return 'የተቀማጭ ገንዘብዎ በተሳካ ሁኔታ ተረጋግጧል።';
    }
    if (msg.includes('Only') && msg.includes('days left until Eid')) {
      const match = msg.match(/Only (\d+) days left until Eid! You need ([\d,]+) ETB more/);
      if (match) {
        return `ለዒድ የቀረው ${match[1]} ቀናት ብቻ ነው! ግብዎ ላይ ለመድረስ ${match[2]} ብር ተጨማሪ ያስፈልግዎታል።`;
      }
      return 'ለዒድ ቀሪ ቀናትን እና ተጨማሪ ቁጠባዎችን ያረጋግጡ።';
    }
    if (msg.includes('new sheep have been listed in your area')) {
      const match = msg.match(/(\d+) new sheep/);
      return `${match ? match[1] : 'አዳዲስ'} በጎች በአቅራቢያዎ ገበያ ላይ ቀርበዋል። ገበያውን ይመልከቱ!`;
    }
    if (msg.includes('total deposits have crossed')) {
      return 'እንኳን ደስ አሎት! ጠቅላላ ተቀማጭዎ 10,000 ብር አልፏል። አሁን የብር ደረጃ አባል ነዎት።';
    }
    if (msg.includes('10% off delivery fees')) {
      return 'ከዒድ በፊት ለሚደረጉ ትዕዛዞች በሙሉ የማድረሻ ክፍያ ላይ የ 10% ቅናሽ ያግኙ። የማስተዋወቂያ ኮድ: EID2026';
    }
    if (msg.includes('Menz sheep has been delivered successfully')) {
      return 'የመንዝ በግዎ በተሳካ ሁኔታ ደርሷል። ይበዓል ቦርሳን ስለተጠቀሙ እናመሰግናለን!';
    }
    if (msg.includes('Your withdrawal request for') && msg.includes('is pending admin approval')) {
      const match = msg.match(/Your withdrawal request for ([\d,]+) ETB is pending/);
      return `የእርስዎ የ${match ? match[1] : ''} ብር የገንዘብ ማውጣት ጥያቄ የአስተዳዳሪ ማጽደቅን በመጠባበቅ ላይ ነው።`;
    }
    if (msg.includes('Your withdrawal of') && msg.includes('has been approved and processed')) {
      const match = msg.match(/Your withdrawal of ([\d,]+) ETB/);
      return `የእርስዎ የ${match ? match[1] : ''} ብር የገንዘብ ማውጣት ተፈቅዶ ተከናውኗል።`;
    }
    if (msg.includes('Your withdrawal request was rejected')) {
      return `የገንዘብ ማውጣት ጥያቄዎ ውድቅ ተደርጓል።`;
    }
    if (msg.includes('deposited towards')) {
      const match = msg.match(/([\d,]+) ETB deposited towards (.*)\./);
      if (match) {
        return `${match[1]} ብር ለ${match[2] === 'Eid' ? 'ዒድ' : match[2]} ቁጠባ ገቢ ተደርጓል።`;
      }
    }
    if (msg.includes('Your order for a') && msg.includes('has been placed')) {
      return msg.replace('Your order for a', 'ትዕዛዝዎ ለ')
                .replace('has been placed.', 'ተቀምጧል።')
                .replace('Delivery to', 'ማድረሻ ወደ')
                .replace('Ready for pickup.', 'ለመውሰድ ዝግጁ ነው።');
    }
    return msg;
  };

  const customerNav = [
    { key: 'dashboard', label: t.dashboard, icon: <Home size={18} /> },
    { key: 'holidays', label: t.holidayPlanner, icon: <Calendar size={18} /> },
    { key: 'wallet', label: t.walletHub, icon: <Wallet size={18} /> },
    { key: 'marketplace', label: t.marketplace, icon: <ShoppingBag size={18} /> },
    { key: 'settings', label: t.settings, icon: <SettingsIcon size={18} /> },
  ];

  const sellerNav = [
    { key: 'seller', label: lang === 'am' ? 'የሻጭ ዳሽቦርድ' : 'Seller Dashboard', icon: <BarChart3 size={18} /> },
    { key: 'settings', label: t.settings, icon: <SettingsIcon size={18} /> },
  ];

  const adminNav = [
    { key: 'admin', label: t.admin + (lang === 'am' ? ' ዳሽቦርድ' : ' Dashboard'), icon: <BarChart3 size={18} /> },
  ];

  const nav = role === 'admin' ? adminNav : (role === 'seller' ? sellerNav : customerNav);

  const getNotifIcon = (type) => {
    const map = {
      deposit: { bg: 'var(--green-soft)', color: 'var(--green)', icon: <Wallet size={16} /> },
      holiday: { bg: 'var(--gold-soft)', color: 'var(--gold)', icon: <Calendar size={16} /> },
      marketplace: { bg: 'var(--blue-soft)', color: 'var(--blue)', icon: <ShoppingBag size={16} /> },
      order: { bg: 'var(--purple-glow)', color: 'var(--purple)', icon: <Package size={16} /> },
      delivery: { bg: 'var(--green-soft)', color: 'var(--green)', icon: <Package size={16} /> },
      system: { bg: 'var(--blue-soft)', color: 'var(--blue)', icon: <Bell size={16} /> },
      promotion: { bg: 'var(--gold-soft)', color: 'var(--gold)', icon: <Bell size={16} /> },
    };
    return map[type] || map.system;
  };

  return (
    <ErrorBoundary>
      <div className="app-shell">
        {!isOnline && (
          <div className="offline-banner">
            <span className="offline-dot" />
            {lang === 'am' ? 'ከመስመር ውጭ ሞድ (ያልተመሳሰሉ ለውጦች)' : 'Offline Mode (Unsynced Changes)'}
          </div>
        )}
        <div className="app-body">
        {/* Sidebar Overlay for Mobile */}
        {showMobileSidebar && (
          <div className="sidebar-overlay" onClick={() => setShowMobileSidebar(false)} />
        )}
        {/* Sidebar */}
        <aside className={`sidebar ${showMobileSidebar ? 'sidebar-mobile-open' : ''}`}>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <img src="/logo.svg" alt="Yebeal Borsa" style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
            </div>
            <h1>
              የበዓል ቦርሳ
              <small>Yebeal Borsa</small>
            </h1>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-section-label">
              {role === 'admin' ? (lang === 'am' ? 'አስተዳደር' : 'Administration') : t.mainMenu}
            </div>
            {nav.map(item => (
              <button
                key={item.key}
                className={`nav-item ${page === item.key ? 'active' : ''}`}
                onClick={() => { setPage(item.key); setShowMobileSidebar(false); }}
                id={`nav-${item.key}`}
                aria-label={item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}

            {role === 'customer' && (
              <>
                <div className="sidebar-section-label" style={{ marginTop: 8 }}>
                  {t.quickActions}
                </div>
                <button
                  className="nav-item"
                  onClick={openNotifs}
                  id="nav-notifications"
                  aria-label="Notifications"
                >
                  <span className="nav-icon"><Bell size={18} /></span>
                  {t.notifications}
                  {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
                </button>
              </>
            )}
          </nav>

          {/* User section */}
          <div style={{ padding: '16px 16px', borderTop: '1px solid var(--border-light)', marginTop: 'auto' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--green), var(--gold))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-inverse)', flexShrink: 0
              }}>
                {user.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.fullName}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {role === 'admin' ? t.admin : role === 'seller' ? (lang === 'am' ? 'ሻጭ' : 'Seller') : (lang === 'am' ? 'ደንበኛ' : 'Customer')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                className="btn btn-ghost btn-sm flex-1"
                onClick={toggleTheme}
                style={{ justifyContent: 'center' }}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={14} style={{ marginRight: 6 }} /> : <Moon size={14} style={{ marginRight: 6 }} />}
                {theme === 'dark' ? (lang === 'am' ? 'ብርሃን ሞድ' : 'Light Mode') : (lang === 'am' ? 'ጨለማ ሞድ' : 'Dark Mode')}
              </button>
            </div>
            <button
              className="btn btn-ghost btn-sm w-full"
              onClick={handleLogout}
              style={{ justifyContent: 'center', color: 'var(--red)' }}
              aria-label="Sign out"
            >
              <LogOut size={14} /> {t.signOut}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {/* Mobile top bar */}
          <div className="mobile-topbar" style={{ marginBottom: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowMobileSidebar(!showMobileSidebar)} aria-label="Menu">
              <Menu size={22} />
            </button>
            <h1 style={{ fontSize: '1rem', fontWeight: 700 }}>{lang === 'am' ? 'የበዓል ቦርሳ' : 'Yebeal Borsa'}</h1>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button className="btn btn-ghost btn-icon" onClick={openNotifs} style={{ position: 'relative' }} aria-label="Notifications">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
                )}
              </button>
            </div>
          </div>

          {/* Page Content */}
          {role === 'customer' && page === 'dashboard' && <CustomerDashboard onRefresh={handleRefresh} lang={lang} onNavigate={setPage} showToast={showToast} user={user} />}
          {role === 'customer' && page === 'holidays' && <HolidayPlanner onRefresh={handleRefresh} lang={lang} showToast={showToast} user={user} />}
          {role === 'customer' && page === 'wallet' && <WalletHub onRefresh={handleRefresh} lang={lang} showToast={showToast} user={user} />}
          {role === 'customer' && page === 'marketplace' && <Marketplace onRefresh={handleRefresh} lang={lang} showToast={showToast} user={user} />}
          {role === 'customer' && page === 'settings' && <Settings onRefresh={handleRefresh} lang={lang} showToast={showToast} user={user} />}
          
          {role === 'seller' && (user?.role === 'seller' || user?.role === 'admin') && page === 'seller' && <SellerDashboard onRefresh={handleRefresh} lang={lang} showToast={showToast} user={user} />}
          {role === 'seller' && (user?.role === 'seller' || user?.role === 'admin') && page === 'settings' && <Settings onRefresh={handleRefresh} lang={lang} showToast={showToast} user={user} />}
          
          {role === 'admin' && user?.role === 'admin' && <AdminDashboard onRefresh={handleRefresh} lang={lang} showToast={showToast} user={user} />}
        </main>
      </div>

      {/* Role Switcher — Restricted to permitted roles */}
      {user && user.role && user.role !== 'customer' && (
        <div className="role-switcher" role="tablist" aria-label="Switch role">
          <button
            className={`role-btn ${role === 'customer' ? 'active' : ''}`}
            onClick={() => { setRole('customer'); setPage('dashboard'); }}
            id="role-customer"
            role="tab"
            aria-selected={role === 'customer'}
          >
            <User size={14} /> {lang === 'am' ? 'ደንበኛ' : 'Customer'}
          </button>
          
          {(user.role === 'seller' || user.role === 'admin') && (
            <button
              className={`role-btn ${role === 'seller' ? 'active' : ''}`}
              onClick={() => { setRole('seller'); setPage('seller'); }}
              id="role-seller"
              role="tab"
              aria-selected={role === 'seller'}
            >
              <ShoppingBag size={14} /> {lang === 'am' ? 'ሻጭ' : 'Seller'}
            </button>
          )}

          {user.role === 'admin' && (
            <button
              className={`role-btn ${role === 'admin' ? 'active' : ''}`}
              onClick={() => { setRole('admin'); setPage('admin'); }}
              id="role-admin"
              role="tab"
              aria-selected={role === 'admin'}
            >
              <Shield size={14} /> {t.admin}
            </button>
          )}
        </div>
      )}

      {/* Notification Drawer */}
      {showNotifs && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'hsla(0,0%,0%,0.3)', zIndex: 199 }}
            onClick={() => setShowNotifs(false)}
            aria-hidden="true"
          />
          <div className="notif-drawer" role="dialog" aria-label="Notifications">
            <div className="notif-drawer-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>🔔 {t.notifications}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNotifs(false)} aria-label="Close notifications">
                <X size={18} />
              </button>
            </div>
            <div className="notif-drawer-body">
              {notifications.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">🔕</div>
                  <h3>{t.noNotifications}</h3>
                  <p>{t.allCaughtUp}</p>
                </div>
              ) : (
                notifications.map(n => {
                  const ni = getNotifIcon(n.type);
                  return (
                    <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                      <div className="notif-icon" style={{ background: ni.bg, color: ni.color }}>
                        {ni.icon}
                      </div>
                      <div className="notif-content">
                        <h4>{translateNotificationTitle(n.title)}</h4>
                        <p>{translateNotificationMessage(n.message)}</p>
                        <div className="notif-time">{formatDateTime(n.createdAt)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && <CheckCircle size={18} />}
              {toast.type === 'error' && <XCircle size={18} />}
              {toast.type === 'warning' && <AlertTriangle size={18} />}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}

export default App;
