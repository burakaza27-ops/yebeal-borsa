import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Plus, ArrowRightLeft, Users, Download, Trash2,
  ArrowDownRight, ArrowUpRight, Edit3, AlertCircle, Clock, Check, X,
  FileText, Settings
} from 'lucide-react';
import {
  addFamilyWallet, removeFamilyWallet,
  transferBetweenWallets, updateSpendingLimit, requestWithdrawal,
  formatETB, formatDateTime, formatDate, getTierInfo,
  getAnalytics, TRANSLATIONS, makeDeposit
} from '../db';
import { fetchWallets, fetchTransactions, fetchWithdrawals, fetchHolidays, fetchOrders } from '../api';

export default function WalletHub({ onRefresh, lang, showToast, user }) {
  const queryClient = useQueryClient();
  const { data: wallets = [] } = useQuery({ queryKey: ['wallets'], queryFn: fetchWallets });
  const { data: transactionsRaw = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const transactions = transactionsRaw.transactions || transactionsRaw || [];
  const { data: withdrawals = [] } = useQuery({ queryKey: ['withdrawals'], queryFn: fetchWithdrawals });
  const { data: holidays = [] } = useQuery({ queryKey: ['holidays'], queryFn: fetchHolidays });
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showLimitEdit, setShowLimitEdit] = useState(null);
  const [familyName, setFamilyName] = useState('');
  const [familyLimit, setFamilyLimit] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [limitValue, setLimitValue] = useState('');
  const [activeTab, setActiveTab] = useState('wallets');
  const [filterWallet, setFilterWallet] = useState('all');
  const [withdrawalMethod, setWithdrawalMethod] = useState('TELEBIRR');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Deposit states
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('Telebirr');
  const [depositNote, setDepositNote] = useState('');
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositHolidayId, setDepositHolidayId] = useState('');
  const [lockAcknowledged, setLockAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const analytics = getAnalytics(transactions);
  const activeHolidays = holidays || [];
  const hasPendingOrders = orders.some(o => o.deliveryStatus !== 'delivered' && o.deliveryStatus !== 'cancelled');

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    setLoading(true);
    try {
      await makeDeposit(primary.id, amount, depositNote || (depositHolidayId ? 'Locked Holiday Savings' : 'Deposit'), depositMethod, depositHolidayId || null);
      setDepositSuccess(true);
      if (showToast) {
        showToast(lang === 'am' ? 'ገንዘብ በተሳካ ሁኔታ ተቀምጧል!' : 'Deposit successful!', 'success');
      }
      setTimeout(() => {
        setShowDeposit(false);
        setDepositAmount('');
        setDepositNote('');
        setDepositHolidayId('');
        setDepositSuccess(false);
        setLockAcknowledged(false);
        refresh();
      }, 1500);
    } catch (err) {
      if (showToast) {
        showToast(err.message || 'Deposit failed', 'error');
      } else {
        alert(err.message || 'Deposit failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const translateMethod = (m) => {
    const map = {
      'Telebirr': lang === 'am' ? 'ቴሌቢር' : 'Telebirr',
      'CBE Birr': lang === 'am' ? 'ሲቢኢ ብር' : 'CBE Birr',
      'Bank Transfer': lang === 'am' ? 'ባንክ ማስተላለፍ' : 'Bank Transfer',
      'Bank': lang === 'am' ? 'ባንክ' : 'Bank',
      'Wallet': lang === 'am' ? 'የኪስ ቦርሳ' : 'Wallet',
      'Transfer': lang === 'am' ? 'ማስተላለፍ' : 'Transfer',
      'Cash (Agent)': lang === 'am' ? 'ጥሬ ገንዘብ (ወኪል)' : 'Cash (Agent)',
      'Cash on Delivery': lang === 'am' ? 'ሲረከቡ በጥሬ ገንዘብ' : 'Cash on Delivery',
    };
    return map[m] || m;
  };
  const translateType = (type) => {
    const map = {
      'deposit': lang === 'am' ? 'ተቀማጭ' : 'Deposit',
      'purchase': lang === 'am' ? 'ግዢ' : 'Purchase',
      'withdrawal': lang === 'am' ? 'ማውጣት' : 'Withdrawal',
    };
    return map[type] || type;
  };

  const getMethodBadge = (method) => {
    switch (method) {
      case 'TELEBIRR':
        return { label: 'Telebirr', icon: '📱', color: 'hsla(210,100%,50%,0.1)', textColor: '#0066cc' };
      case 'CBE_BIRR':
        return { label: 'CBE Birr', icon: '🏦', color: 'hsla(120,100%,25%,0.1)', textColor: '#008000' };
      case 'BANK_TRANSFER':
        return { label: 'Bank Transfer', icon: '🏧', color: 'hsla(30,100%,40%,0.1)', textColor: '#cc6600' };
      default:
        return { label: method || '', icon: '💰', color: 'var(--bg-secondary)', textColor: 'var(--text-secondary)' };
    }
  };

  const refresh = async () => {
    await queryClient.invalidateQueries();
    if (onRefresh) onRefresh();
  };

  const primary = wallets.find(w => !w.isFamily);
  const familyWallets = wallets.filter(w => w.isFamily);
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const tierInfo = getTierInfo(user.tier);

  const filteredTxns = filterWallet === 'all' ? transactions : transactions.filter(t => t.walletId === filterWallet);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredTxns.length / itemsPerPage);
  const paginatedTxns = filteredTxns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddFamily = async () => {
    if (!familyName.trim()) return;
    setLoading(true);
    try {
      await addFamilyWallet(familyName.trim(), familyLimit || null);
      setFamilyName(''); setFamilyLimit('');
      setShowAddFamily(false);
      if (showToast) {
        showToast(lang === 'am' ? 'የቤተሰብ የኪስ ቦርሳ በስኬት ተፈጥሯል!' : 'Family wallet created successfully!', 'success');
      }
      refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to create family wallet', 'error');
      else alert(err.message || 'Failed to create family wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0 || !transferFrom || !transferTo || transferFrom === transferTo) {
      if (showToast && amount <= 0) {
        showToast(
          lang === 'am' ? 'እባክዎ ትክክለኛ የገንዘብ መጠን ያስገቡ።' : 'Please enter a valid amount.',
          'warning'
        );
      }
      return;
    }
    const fromWallet = wallets.find(w => w.id === transferFrom);
    if (!fromWallet || fromWallet.balance < amount) {
      if (showToast) {
        showToast(
          lang === 'am' ? 'በመነሻ የኪስ ቦርሳ ውስጥ በቂ ገንዘብ የለም።' : 'Insufficient balance in source wallet.',
          'warning'
        );
      } else {
        alert(lang === 'am' ? 'በመነሻ የኪስ ቦርሳ ውስጥ በቂ ገንዘብ የለም።' : 'Insufficient balance in source wallet.');
      }
      return;
    }
    setLoading(true);
    try {
      await transferBetweenWallets(transferFrom, transferTo, amount);
      setShowTransfer(false); setTransferAmount('');
      if (showToast) {
        showToast(lang === 'am' ? 'የገንዘብ ማስተላለፍ በስኬት ተጠናቋል! ✓' : 'Fund transfer completed successfully! ✓', 'success');
      }
      refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Transfer failed', 'error');
      else alert(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;

    if (hasPendingOrders) {
      const msg = lang === 'am' 
        ? 'ትዕዛዞች በመጠባበቅ ላይ ሲሆኑ ገንዘብ ማውጣት አይቻልም።'
        : 'Cannot withdraw while you have active pending orders.';
      if (showToast) showToast(msg, 'warning');
      else alert(msg);
      return;
    }

    if (!primary) return;

    const maxAllowed = (primary.balance + (primary.lockedBalance || 0)) - 100;
    if (amount > maxAllowed) {
      const msg = lang === 'am' 
        ? `ከፍተኛው ማውጣት የሚችሉት ${Math.max(0, maxAllowed).toLocaleString()} ብር ነው። ቢያንስ 100 ብር መያዣ በኪስ ቦርሳዎ ውስጥ መቅረት አለበት።`
        : `Maximum withdrawal is ${Math.max(0, maxAllowed).toLocaleString()} ETB. A minimum reserve of 100 ETB must remain in your wallet.`;
      if (showToast) showToast(msg, 'warning');
      else alert(msg);
      return;
    }

    if (!accountNumber.trim()) {
      if (showToast) {
        showToast(
          lang === 'am' ? 'የአካውንት ወይም ስልክ ቁጥር ያስፈልጋል' : 'Account or phone number is required.',
          'warning'
        );
      } else {
        alert(lang === 'am' ? 'የአካውንት ወይም ስልክ ቁጥር ያስፈልጋል' : 'Account or phone number is required.');
      }
      return;
    }

    if (withdrawalMethod === 'TELEBIRR' || withdrawalMethod === 'CBE_BIRR') {
      const phoneRegex = /^(\+251|0)(9|7)\d{8}$/;
      if (!phoneRegex.test(accountNumber.trim().replace(/\s/g, ''))) {
        if (showToast) {
          showToast(
            lang === 'am' ? 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ' : 'Invalid phone number format. Use 09xxxxxxxx.',
            'warning'
          );
        } else {
          alert(lang === 'am' ? 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ' : 'Invalid phone number format. Use 09xxxxxxxx.');
        }
        return;
      }
    }

    if (withdrawalMethod === 'BANK_TRANSFER') {
      if (accountNumber.trim().length < 6) {
        if (showToast) {
          showToast(
            lang === 'am' ? 'የባንክ አካውንት ቁጥር ቢያንስ 6 አሃዝ መሆን አለበት' : 'Bank account number must be at least 6 characters.',
            'warning'
          );
        } else {
          alert(lang === 'am' ? 'የባንክ አካውንት ቁጥር ቢያንስ 6 አሃዝ መሆን አለበት' : 'Bank account number must be at least 6 characters.');
        }
        return;
      }
      if (!accountName.trim()) {
        if (showToast) {
          showToast(
            lang === 'am' ? 'የአካውንት ባለቤት ስም ያስፈልጋል' : 'Account holder name is required for bank transfers.',
            'warning'
          );
        } else {
          alert(lang === 'am' ? 'የአካውንት ባለቤት ስም ያስፈልጋል' : 'Account holder name is required for bank transfers.');
        }
        return;
      }
    }

    setLoading(true);
    try {
      await requestWithdrawal(
        primary.id,
        amount,
        withdrawReason || (lang === 'am' ? 'የግል ወጪ ማውጫ' : 'Personal withdrawal'),
        withdrawalMethod,
        accountNumber.trim(),
        accountName.trim() || null
      );
      setShowWithdraw(false);
      setWithdrawAmount('');
      setWithdrawReason('');
      setAccountNumber('');
      setAccountName('');
      if (showToast) {
        showToast(lang === 'am' ? 'የመውጣት ጥያቄ ለባለስልጣን ተልኳል' : 'Withdrawal request submitted for approval', 'success');
      }
      refresh();
    } catch (err) {
      if (showToast) {
        showToast(err.message || 'Error requesting withdrawal', 'danger');
      } else {
        alert(err.message || 'Error requesting withdrawal');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLimit = (walletId) => {
    updateSpendingLimit(walletId, limitValue);
    setShowLimitEdit(null); setLimitValue('');
    refresh();
  };

  const handleRemoveFamily = (walletId) => {
    if (confirm(t.removeFamilyConfirm)) {
      removeFamilyWallet(walletId);
      refresh();
    }
  };

  const exportCSV = () => {
    const headers = 'Date,Type,Description,Method,Amount (ETB)\n';
    const rows = filteredTxns.map(t =>
      `"${formatDateTime(t.createdAt)}","${t.type}","${t.description}","${t.method}","${t.amount}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'yebeal_borsa_transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const content = `
YEBEAL BORSA - Transaction Report
Generated: ${new Date().toLocaleString()}
Account: ${user.fullName} (${user.faydaId})
Total Balance: ${formatETB(totalBalance)}
Tier: ${tierInfo.label}

TRANSACTIONS
${'='.repeat(80)}
${filteredTxns.map(t => `${formatDateTime(t.createdAt)}  |  ${t.type.toUpperCase().padEnd(10)}  |  ${t.description.padEnd(40)}  |  ${t.amount > 0 ? '+' : ''}${formatETB(t.amount)}`).join('\n')}
${'='.repeat(80)}
Total Deposits: ${formatETB(analytics.totalDeposited)}
Total Spent: ${formatETB(analytics.totalPurchased)}
Net Saved: ${formatETB(analytics.savedMoney)}
    `.trim();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'yebeal_borsa_report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>{t.walletHub} 💳</h2>
        <p>{t.manageWalletsDesc}</p>
      </div>

      {/* Primary Wallet Visual */}
      <div className="wallet-visual" style={{ marginBottom: 24 }}>
        <div className="wallet-content">
          <div style={{ display: 'flex', justify_content: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="wallet-balance-label">{lang === 'am' ? 'ጠቅላላ የኪስ ቦርሳ ቀሪ ሂሳብ' : 'Total Wallet Balance'}</div>
              <div className="wallet-balance-amount">{formatETB((primary?.balance || 0) + (primary?.lockedBalance || 0) + (primary?.platformCredits || 0))}</div>
            </div>
            <span className={`badge ${tierInfo.className === 'gold-tier' ? 'badge-tier-gold' : tierInfo.className === 'silver' ? 'badge-silver' : 'badge-bronze'}`}>
              {tierInfo.icon} {tierInfo.label}
            </span>
          </div>
          <div className="wallet-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="wallet-meta-label" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'am' ? 'ለመውጣት የሚችል' : 'Available Cash'}</div>
              <div className="wallet-meta-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#4ade80', marginTop: 4 }}>{formatETB(primary?.balance || 0)}</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.15)', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
              <div className="wallet-meta-label" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'am' ? 'የታሰረ ቁጠባ' : 'Locked Savings'}</div>
              <div className="wallet-meta-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#facc15', marginTop: 4 }}>{formatETB(primary?.lockedBalance || 0)}</div>
              {primary?.lockedUntil && (
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  {lang === 'am' ? 'እስከ ' : 'Until '} {formatDate(primary.lockedUntil)}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="wallet-meta-label" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang === 'am' ? 'የቦነስ ክሬዲት' : 'Platform Credits'}</div>
              <div className="wallet-meta-value" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60a5fa', marginTop: 4 }}>{formatETB(primary?.platformCredits || 0)}</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {lang === 'am' ? 'ለግዢ ብቻ' : 'Purchasing only'}
              </div>
            </div>
          </div>
          <div className="wallet-meta" style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <div><strong>{lang === 'am' ? 'ባለቤት: ' : 'Holder: '}</strong> {user.fullName}</div>
            <div><strong>{lang === 'am' ? 'ፋይዳ መታወቂያ: ' : 'Fayda ID: '}</strong> {user.faydaId || (lang === 'am' ? 'ያልተገናኘ' : 'Not Linked')}</div>
          </div>
        </div>
      </div>

      {/* Analytics row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-icon"><ArrowDownRight size={20} /></div>
          <div className="stat-value">{formatETB(analytics.totalDeposited)}</div>
          <div className="stat-label">{t.totalDeposits} ({analytics.depositCount})</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><ArrowUpRight size={20} /></div>
          <div className="stat-value">{formatETB(analytics.totalPurchased)}</div>
          <div className="stat-label">{t.totalSpent} ({analytics.purchaseCount})</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon"><CreditCard size={20} /></div>
          <div className="stat-value">{formatETB(analytics.savedMoney)}</div>
          <div className="stat-label">{t.savedMoney}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'wallets' ? 'active' : ''}`} onClick={() => setActiveTab('wallets')}>
          💳 {t.wallets}
        </button>
        <button className={`tab ${activeTab === 'family' ? 'active' : ''}`} onClick={() => setActiveTab('family')}>
          👨‍👩‍👧 {t.family} ({familyWallets.length})
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📜 {t.fullHistory}
        </button>
        <button className={`tab ${activeTab === 'withdrawals' ? 'active' : ''}`} onClick={() => setActiveTab('withdrawals')}>
          🏦 {t.withdrawalRequest} ({withdrawals.length})
        </button>
      </div>

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left"><CreditCard size={18} color="var(--gold)" /><span style={{ fontWeight: 600 }}>{t.yourWallets}</span></div>
            <div className="action-bar-right">
              <button className="btn btn-success btn-sm" onClick={() => setShowDeposit(true)}>💰 {lang === 'am' ? 'ተቀማጭ' : 'Deposit'}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowWithdraw(true)}>🏦 {t.withdraw}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTransfer(true)}><ArrowRightLeft size={14} /> {t.transfer}</button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddFamily(true)}><Plus size={14} /> {t.addFamily}</button>
            </div>
          </div>
          <div className="grid-2" style={{ gap: 16 }}>
            {primary && (
              <div className="card" style={{ borderLeft: '4px solid var(--gold)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}><CreditCard size={22} /></div>
                    <div><div style={{ fontWeight: 700 }}>{primary.label}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.mainAccount}</div></div>
                  </div>
                  <span className="badge badge-gold">{t.primary}</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold)' }}>{formatETB(primary.balance)}</div>
              </div>
            )}
            {familyWallets.map(w => (
              <div key={w.id} className="card" style={{ borderLeft: '4px solid var(--green)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}><Users size={22} /></div>
                    <div><div style={{ fontWeight: 700 }}>{w.label}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.familyMemberName}</div></div>
                  </div>
                  <span className="badge badge-green">{t.family}</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green-bright)' }}>{formatETB(w.balance)}</div>
                {w.spendingLimit && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    {t.spendingLimit}: <strong>{formatETB(w.spendingLimit)}</strong>
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4, padding: '2px 6px' }} onClick={() => { setShowLimitEdit(w.id); setLimitValue(String(w.spendingLimit)); }}>
                      <Edit3 size={10} />
                    </button>
                  </div>
                )}
                {!w.spendingLimit && (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 4, fontSize: '0.72rem' }} onClick={() => { setShowLimitEdit(w.id); setLimitValue(''); }}>
                    + {lang === 'am' ? 'ገደብ አዘጋጅ' : 'Set'} {t.spendingLimit}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Family Tab */}
      {activeTab === 'family' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left"><Users size={18} color="var(--green)" /><span style={{ fontWeight: 600 }}>{t.family} {lang === 'am' ? 'አባላት' : 'Members'}</span></div>
            <div className="action-bar-right"><button className="btn btn-primary btn-sm" onClick={() => setShowAddFamily(true)}><Plus size={14} /> {t.addMember}</button></div>
          </div>
          {familyWallets.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">👨‍👩‍👧‍👦</div><h3>{t.noFamilyMembersYet}</h3><p>{t.addFamilyDesc}</p><button className="btn btn-primary mt-4" onClick={() => setShowAddFamily(true)}><Plus size={16} /> {t.addFamilyMember}</button></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {familyWallets.map(w => (
                <div key={w.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--green)', fontSize: '1rem' }}>
                      {w.familyMemberName?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{w.familyMemberName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{lang === 'am' ? 'የተጨመረበት ቀን' : 'Added'} {formatDate(w.createdAt)}</div>
                      {w.spendingLimit && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.spendingLimit}: {formatETB(w.spendingLimit)}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--green-bright)', fontSize: '1.1rem' }}>{formatETB(w.balance)}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setTransferFrom(primary?.id || ''); setTransferTo(w.id); setShowTransfer(true); }}><ArrowRightLeft size={12} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleRemoveFamily(w.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left">
              <select className="form-input form-select" value={filterWallet} onChange={e => { setFilterWallet(e.target.value); setCurrentPage(1); }} style={{ width: 200, padding: '6px 10px', fontSize: '0.82rem' }}>
                <option value="all">{t.allWallets}</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.label === 'Primary Wallet' && lang === 'am' ? 'ዋና የኪስ ቦርሳ' : w.label.includes('Family') && lang === 'am' ? 'ቤተሰብ - ' + w.familyMemberName : w.label}</option>)}
              </select>
              <span className="badge badge-muted">{filteredTxns.length} {lang === 'am' ? 'መዝገቦች' : 'records'}</span>
            </div>
            <div className="action-bar-right">
              <button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={14} /> {t.exportCSV}</button>
              <button className="btn btn-secondary btn-sm" onClick={exportPDF}><FileText size={14} /> {t.exportPDF}</button>
            </div>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>{t.transaction}</th><th>{t.type}</th><th>{lang === 'am' ? 'ኪስ ቦርሳ' : 'Wallet'}</th><th>{t.paymentMethod}</th><th>{t.date}</th><th style={{ textAlign: 'right' }}>{t.amount}</th></tr></thead>
              <tbody>
                {paginatedTxns.map(txn => (
                  <tr key={txn.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: txn.amount > 0 ? 'var(--green-soft)' : 'var(--red-soft)', color: txn.amount > 0 ? 'var(--green-bright)' : 'var(--red)' }}>
                           {txn.amount > 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <span style={{ fontWeight: 500, fontSize: '0.82rem' }}>{lang === 'am' && txn.description === 'Monthly savings deposit' ? 'የወር የቁጠባ ተቀማጭ' : lang === 'am' && txn.description === 'Extra deposit for Eid' ? 'ለበዓል ተጨማሪ ተቀማጭ' : lang === 'am' && txn.description.includes('Menz sheep') ? 'የመንዝ በግ ግዢ ከገበያ' : lang === 'am' && txn.description.includes('Family deposit') ? 'የቤተሰብ ተቀማጭ - ሜሮን' : lang === 'am' && txn.description.includes('Savings for Genna') ? 'የገና ቁጠባ' : lang === 'am' && txn.description.includes('hens') ? 'የዶሮዎች ግዢ' : lang === 'am' && txn.description.includes('Bulk deposit') ? 'በትልቅ መጠን የተቀመጠ' : lang === 'am' && txn.description.includes('Holiday savings') ? 'የበዓል ቁጠባ' : lang === 'am' && txn.description.includes('Weekly savings') ? 'የሳምንት ቁጠባ' : txn.description}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${txn.type === 'deposit' ? 'badge-green' : txn.type === 'purchase' ? 'badge-red' : txn.type === 'withdrawal' ? 'badge-gold' : 'badge-blue'}`}>{translateType(txn.type)}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{txn.walletId === 'w1' && lang === 'am' ? 'ዋና የኪስ ቦርሳ' : txn.walletId === 'w2' && lang === 'am' ? 'ቤተሰብ - ሜሮን' : wallets.find(w => w.id === txn.walletId)?.label || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{translateMethod(txn.method)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{formatDateTime(txn.createdAt)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: txn.amount > 0 ? 'var(--green-bright)' : 'var(--red)' }}>
                      {txn.amount > 0 ? '+' : ''}{formatETB(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {lang === 'am'
                  ? `ገጽ ${currentPage} ከ ${totalPages} (ጠቅላላ ${filteredTxns.length} መዝገቦች)`
                  : `Page ${currentPage} of ${totalPages} (total ${filteredTxns.length} records)`}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  ◀ {lang === 'am' ? 'ቀዳሚ' : 'Previous'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  {lang === 'am' ? 'ቀጣይ' : 'Next'} ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdrawals Tab */}
      {activeTab === 'withdrawals' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left"><span style={{ fontWeight: 600 }}>🏦 {t.withdrawalRequest}</span></div>
            <div className="action-bar-right"><button className="btn btn-primary btn-sm" onClick={() => setShowWithdraw(true)}><Plus size={14} /> {t.newRequest}</button></div>
          </div>
          {withdrawals.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🏦</div><h3>{t.noWithdrawalRequests}</h3><p>{t.withdrawRequestDesc}</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {withdrawals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(wr => (
                <div key={wr.id} className="card flex items-center justify-between" style={{ padding: '16px 20px' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: wr.status === 'approved' ? 'var(--green-soft)' : wr.status === 'rejected' ? 'var(--red-soft)' : 'var(--gold-soft)', color: wr.status === 'approved' ? 'var(--green)' : wr.status === 'rejected' ? 'var(--red)' : 'var(--gold)' }}>
                      {wr.status === 'approved' ? <Check size={18} /> : wr.status === 'rejected' ? <X size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontWeight: 700 }}>{formatETB(wr.amount)}</span>
                        {wr.withdrawalMethod && (
                          <span style={{
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: getMethodBadge(wr.withdrawalMethod).color,
                            color: getMethodBadge(wr.withdrawalMethod).textColor,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}>
                            {getMethodBadge(wr.withdrawalMethod).icon} {lang === 'am' ? translateMethod(getMethodBadge(wr.withdrawalMethod).label) : getMethodBadge(wr.withdrawalMethod).label}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{wr.reason}</div>
                      {wr.accountNumber && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {t.accountNumber}: <code style={{ fontSize: '0.7rem', background: 'hsla(0,0%,50%,0.08)', padding: '1px 4px', borderRadius: 3, fontFamily: 'monospace' }}>{wr.accountNumber}</code>
                          {wr.accountName && <span style={{ marginLeft: 6, fontWeight: 500 }}>({wr.accountName})</span>}
                        </div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatDateTime(wr.createdAt)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${wr.status === 'approved' ? 'badge-green' : wr.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                      {wr.status === 'approved' ? (lang === 'am' ? '✓ የጸደቀ' : '✓ Approved') : wr.status === 'rejected' ? (lang === 'am' ? 'ውድቅ የተደረገ' : '✗ Rejected') : (lang === 'am' ? 'በመጠባበቅ ላይ' : '⏳ Pending')}
                    </span>
                    {wr.adminNote && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{t.adminNoteLabel}: {wr.adminNote}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Family Modal */}
      {showAddFamily && (
        <div className="modal-overlay" onClick={() => setShowAddFamily(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>👨‍👩‍👧 {t.addFamilyMember}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowAddFamily(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">{t.memberName}</label><input type="text" className="form-input" placeholder={lang === 'am' ? 'ለምሳሌ፡ ሜሮን ዮሃንስ' : 'e.g., Meron Yohannes'} value={familyName} onChange={e => setFamilyName(e.target.value)} id="family-name" /></div>
              <div className="form-group"><label className="form-label">{t.spendingLimit} (ETB, {lang === 'am' ? 'አማራጭ' : 'optional'})</label><input type="number" className="form-input" placeholder="e.g., 5000" value={familyLimit} onChange={e => setFamilyLimit(e.target.value)} onKeyDown={e => { if (['e', 'E', '-', '+', '.'].includes(e.key)) e.preventDefault(); }} /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.leaveEmptyForNoLimit}</span></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddFamily(false)} disabled={loading}>{t.cancel}</button>
              <button className="btn btn-success" onClick={handleAddFamily} disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn-spinner" /> {lang === 'am' ? 'በመጨመር ላይ...' : 'Adding member...'}
                  </>
                ) : (
                  <>
                    <Plus size={16} /> {t.addMember}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Transfer Modal */}
      {showTransfer && (
        <div className="modal-overlay" onClick={() => setShowTransfer(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>💸 {t.transferFunds}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowTransfer(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">{t.fromWallet}</label><select className="form-input form-select" value={transferFrom} onChange={e => setTransferFrom(e.target.value)}><option value="">{t.selectWallet}</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.label === 'Primary Wallet' && lang === 'am' ? 'ዋና የኪስ ቦርሳ' : w.label.includes('Family') && lang === 'am' ? 'ቤተሰብ - ' + w.familyMemberName : w.label} ({formatETB(w.balance)})</option>)}</select></div>
              <div className="form-group"><label className="form-label">{t.toWallet}</label><select className="form-input form-select" value={transferTo} onChange={e => setTransferTo(e.target.value)}><option value="">{t.selectWallet}</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.label === 'Primary Wallet' && lang === 'am' ? 'ዋና የኪስ ቦርሳ' : w.label.includes('Family') && lang === 'am' ? 'ቤተሰብ - ' + w.familyMemberName : w.label} ({formatETB(w.balance)})</option>)}</select></div>
              <div className="form-group"><label className="form-label">{t.amount} (ETB)</label><input type="number" className="form-input" placeholder={t.enterAmount} value={transferAmount} onChange={e => setTransferAmount(e.target.value)} min="1" id="transfer-amount" onKeyDown={e => { if (['e', 'E', '-', '+', '.'].includes(e.key)) e.preventDefault(); }} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTransfer(false)} disabled={loading}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleTransfer} disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn-spinner" /> {lang === 'am' ? 'በማስተላለፍ ላይ...' : 'Transferring...'}
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={16} /> {t.transfer}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdraw && (
        <div className="modal-overlay" onClick={() => setShowWithdraw(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>🏦 {t.withdrawalRequest}</h3><button className="btn btn-ghost btn-icon" onClick={() => {
              setShowWithdraw(false);
              setAccountNumber('');
              setAccountName('');
            }}>✕</button></div>
            <div className="modal-body">
              <div style={{ background: 'var(--gold-soft)', border: '1px solid hsla(45,100%,51%,0.2)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={18} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t.withdrawRequireApproval}</div>
              </div>

              {/* Payout method cards */}
              <div className="form-group">
                <label className="form-label">{t.selectMethod}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { key: 'TELEBIRR', label: 'Telebirr', icon: '📱', color: '#0066cc', bg: 'hsla(210,100%,50%,0.08)' },
                    { key: 'CBE_BIRR', label: 'CBE Birr', icon: '🏦', color: '#008000', bg: 'hsla(120,100%,25%,0.08)' },
                    { key: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏧', color: '#cc6600', bg: 'hsla(30,100%,40%,0.08)' }
                  ].map(method => {
                    const isSelected = withdrawalMethod === method.key;
                    return (
                      <button
                        key={method.key}
                        type="button"
                        onClick={() => {
                          setWithdrawalMethod(method.key);
                          setAccountNumber('');
                          setAccountName('');
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px 8px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? `2px solid ${method.color}` : '2px solid var(--border-color)',
                          background: isSelected ? method.bg : 'var(--card-bg)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                      >
                        <span style={{ fontSize: '1.4rem', marginBottom: 4 }}>{method.icon}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{lang === 'am' ? translateMethod(method.label) : method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Number or Phone Input */}
              <div className="form-group">
                <label className="form-label">
                  {withdrawalMethod === 'BANK_TRANSFER' ? t.accountNumber : (lang === 'am' ? 'የስልክ ቁጥር' : 'Phone Number')}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    withdrawalMethod === 'BANK_TRANSFER'
                      ? t.enterAccountNumber
                      : t.enterPhoneNumber
                  }
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                />
              </div>

              {/* Account Name (Only for Bank) */}
              {withdrawalMethod === 'BANK_TRANSFER' && (
                <div className="form-group">
                  <label className="form-label">{t.accountHolderName}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t.enterAccountName}
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{t.amount} (ETB)</label>
                <input type="number" className="form-input" placeholder={t.enterAmount} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} min="1" onKeyDown={e => { if (['e', 'E', '-', '+', '.'].includes(e.key)) e.preventDefault(); }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {lang === 'am' ? 'የሚገኝ ለመውጣት:' : 'Available cash:'} {formatETB(primary?.balance || 0)} | {lang === 'am' ? 'የታሰረ ቁጠባ:' : 'Locked savings:'} {formatETB(primary?.lockedBalance || 0)}
                </span>
                
                {/* 100 ETB Reserve Warning */}
                {primary && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {lang === 'am' ? 'ሊወጣ የሚችል ጠቅላላ (ከ100 ብር መያዣ ጋር):' : 'Total withdrawable (with 100 ETB reserve):'}{' '}
                    <strong>{formatETB(Math.max(0, primary.balance + (primary.lockedBalance || 0) - 100))}</strong>
                  </div>
                )}

                {/* Pending orders block message */}
                {hasPendingOrders && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: '#ef4444' }}>{lang === 'am' ? 'ገንዘብ ማውጣት ተከልክሏል' : 'Withdrawal Blocked'}</strong>
                      <p style={{ marginTop: 4 }}>
                        {lang === 'am'
                          ? 'በሂደት ላይ ያሉ ንቁ ትዕዛዞች ስላሉዎት ገንዘብ ማውጣት አይችሉም። እባክዎ ትዕዛዞችዎ እስኪጠናቀቁ ይጠብቁ።'
                          : 'You have active pending orders. Withdrawals are blocked until all orders are delivered or cancelled.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 30% early withdrawal penalty warning */}
                {!hasPendingOrders && withdrawAmount && primary && parseFloat(withdrawAmount) > primary.balance && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertCircle size={16} color="#f97316" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: '#f97316' }}>{lang === 'am' ? 'ቅድመ ማውጫ ቅጣት!' : 'Early Withdrawal Penalty!'}</strong>
                      <p style={{ marginTop: 4 }}>
                        {lang === 'am'
                          ? `ካለዎት ገንዘብ በላይ የመውጣት ጥያቄ አቅርበዋል። ተጨማሪ ${(parseFloat(withdrawAmount) - primary.balance).toLocaleString()} ብር ከታሰረ ቁጠባዎ ላይ ይወሰዳል። ለዚህም የ30% ቅጣት (${((parseFloat(withdrawAmount) - primary.balance) * 0.3).toLocaleString()} ብር) ተቀናሽ ይደረጋል!`
                          : `Requested amount exceeds your available cash. The remaining ${(parseFloat(withdrawAmount) - primary.balance).toLocaleString()} ETB will be pulled from locked savings. A 30% early withdrawal penalty of ${((parseFloat(withdrawAmount) - primary.balance) * 0.3).toLocaleString()} ETB will be deducted from it.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group"><label className="form-label">{t.reason}</label><textarea className="form-input" rows={3} placeholder={t.whyWithdrawing} value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} style={{ resize: 'vertical' }} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setShowWithdraw(false);
                setAccountNumber('');
                setAccountName('');
              }} disabled={loading}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleWithdraw} disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn-spinner" /> {lang === 'am' ? 'በማስገባት ላይ...' : 'Submitting...'}
                  </>
                ) : (
                  <>{t.submitRequest}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="modal-overlay" onClick={() => !depositSuccess && setShowDeposit(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            {depositSuccess ? (
              <div style={{ padding: '50px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{t.depositConfirmed}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {formatETB(parseFloat(depositAmount) || 0)} {t.depositedVia} {translateMethod(depositMethod)}
                </p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h3>💰 {lang === 'am' ? 'ተቀማጭ' : 'Deposit'}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowDeposit(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">{t.amount} (ETB)</label>
                    <input type="number" className="form-input" placeholder={t.enterAmount} value={depositAmount} onChange={e => setDepositAmount(e.target.value)} min="100" onKeyDown={e => { if (['e', 'E', '-', '+', '.'].includes(e.key)) e.preventDefault(); }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t.paymentMethod}</label>
                    <select className="form-input form-select" value={depositMethod} onChange={e => setDepositMethod(e.target.value)}>
                      <option value="Telebirr">{t.telebirr}</option>
                      <option value="CBE Birr">{t.cbeBirr}</option>
                      <option value="Bank Transfer">{t.bankTransfer}</option>
                      <option value="Cash (Agent)">{t.cashAgent}</option>
                    </select>
                  </div>
                  
                  {/* Target Holiday Goal Dropdown for locking savings */}
                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'am' ? 'የበአል የቁጠባ ግብ (ከተፈለገ)' : 'Lock savings for a Holiday Goal (Optional)'}
                    </label>
                    <select className="form-input form-select" value={depositHolidayId} onChange={e => setDepositHolidayId(e.target.value)}>
                      <option value="">{lang === 'am' ? 'አይቆለፍ - የሚገኝ ቀሪ ሂሳብ' : 'Do not lock - Available Cash'}</option>
                      {activeHolidays.map(h => (
                        <option key={h.id} value={h.id}>{lang === 'am' ? h.name : h.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bonus and Lock Preview */}
                  {depositHolidayId && depositAmount && parseFloat(depositAmount) > 0 && (() => {
                    const hol = activeHolidays.find(h => h.id === depositHolidayId);
                    if (!hol) return null;
                    const diff = new Date(hol.deadline) - new Date();
                    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                    let pct = 0;
                    if (days >= 180) pct = 0.05;
                    else if (days >= 90) pct = 0.03;
                    else if (days >= 30) pct = 0.02;
                    const bonus = parseFloat(depositAmount) * pct;
                    return (
                      <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', marginBottom: 12 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ color: '#22c55e', fontWeight: 'bold' }}>🎉 {lang === 'am' ? 'የተቆለፈ የቁጠባ ጉርሻ!' : 'Savings Lock Bonus!'}</span>
                          <p style={{ marginTop: 4 }}>
                            {lang === 'am'
                              ? `ይህንን ተቀማጭ ለ${hol.name} በመቆለፍዎ (${days} ቀናት ይቀራሉ) የ${(pct * 100)}% የጉርሻ ክሬዲት (+${bonus.toLocaleString()} ብር) ያገኛሉ!`
                              : `By locking this deposit for ${hol.nameEn} (${days} days left), you will receive a ${(pct * 100)}% platform credit bonus (+${bonus.toLocaleString()} ETB)!`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Mandatory Lock Acknowledgement Checkbox */}
                  {depositHolidayId && (
                    <div style={{
                      background: 'rgba(249, 115, 22, 0.08)',
                      border: '1px solid rgba(249, 115, 22, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      padding: 14,
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10
                    }}>
                      <input
                        type="checkbox"
                        id="lock-acknowledge-check"
                        checked={lockAcknowledged}
                        onChange={e => setLockAcknowledged(e.target.checked)}
                        style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                      />
                      <label htmlFor="lock-acknowledge-check" style={{ fontSize: '0.78rem', cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <strong style={{ color: '#f97316' }}>
                          {lang === 'am' ? '⚠️ ማስጠንቀቂያ:' : '⚠️ Important:'}
                        </strong>{' '}
                        {lang === 'am'
                          ? 'ይህንን ተቀማጭ መቆለፍ ጉርሻ ያስገኛል ነገር ግን ገንዘቡን ከመክፈቻ ቀኑ በፊት ማውጣት 30% ቅጣት ያስከትላል። ይህንን ተረድቼ እንደተቀበልኩ አረጋግጣለሁ።'
                          : 'I acknowledge that locking this deposit earns a bonus but incurs a 30% penalty for early withdrawal before the holiday date.'}
                      </label>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">{t.noteOptional}</label>
                    <input type="text" className="form-input" placeholder={t.monthlySavings} value={depositNote} onChange={e => setDepositNote(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowDeposit(false)} disabled={loading}>{t.cancel}</button>
                  <button className="btn btn-success" onClick={handleDeposit} disabled={loading || (!!depositHolidayId && !lockAcknowledged)}>
                    {loading ? (
                      <>
                        <span className="btn-spinner" /> {lang === 'am' ? 'በማስቀመጥ ላይ...' : 'Depositing...'}
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> {t.confirmDeposit}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spending Limit Edit Modal */}
      {showLimitEdit && (
        <div className="modal-overlay" onClick={() => setShowLimitEdit(null)}>
          <div className="modal scale-in" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>📊 {t.spendingLimit}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowLimitEdit(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">{t.monthlyLimit}</label><input type="number" className="form-input" placeholder={t.enterLimitOrCreateEmpty} value={limitValue} onChange={e => setLimitValue(e.target.value)} onKeyDown={e => { if (['e', 'E', '-', '+', '.'].includes(e.key)) e.preventDefault(); }} /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.leaveEmptyForNoLimit}</span></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowLimitEdit(null)}>{t.cancel}</button><button className="btn btn-success" onClick={() => handleUpdateLimit(showLimitEdit)}>{t.saveLimit}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
