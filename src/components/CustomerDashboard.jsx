import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, TrendingUp, Clock, Gift, ArrowUpRight, ArrowDownRight,
  Plus, CreditCard, Smartphone, Building2, ChevronRight, PiggyBank,
  DollarSign
} from 'lucide-react';
import {
  makeDeposit, formatETB, formatDateTime, formatDate, getTierInfo,
  daysUntil, getAnalytics, ANIMAL_EMOJIS, TRANSLATIONS, requestWithdrawal
} from '../db';
import { fetchWallets, fetchTransactions, fetchHolidays, fetchCustomerHolidays } from '../api';
import { apiFetch } from '../db';

export default function CustomerDashboard({ onRefresh, lang, onNavigate, showToast, user }) {
  const queryClient = useQueryClient();

  const { data: wallets = [] } = useQuery({ queryKey: ['wallets'], queryFn: fetchWallets });
  const { data: transactionsRaw = {} } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: holidays = [] } = useQuery({ queryKey: ['holidays'], queryFn: fetchHolidays });
  const { data: customerHolidays = [] } = useQuery({
    queryKey: ['customer-holidays'],
    queryFn: fetchCustomerHolidays,
  });

  const transactions = Array.isArray(transactionsRaw) ? transactionsRaw : (transactionsRaw?.transactions || []);

  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('Telebirr');
  const [depositNote, setDepositNote] = useState('');
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositHolidayId, setDepositHolidayId] = useState('');
  const [lockAcknowledged, setLockAcknowledged] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Telebirr');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const analytics = getAnalytics(transactions);

  const translateAnimal = (type) => lang === 'am' ? { sheep: 'በግ', goat: 'ፍየል', cattle: 'ከብት', hen: 'ዶሮ', kircha: 'ኪርቻ' }[type] || type : type;
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
  const refresh = async () => {
    await queryClient.invalidateQueries();
  };

  const primaryWallet = wallets.find(w => !w.isFamily);
  const tierInfo = getTierInfo(user.tier);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    setLoading(true);
    try {
      await makeDeposit(primaryWallet.id, amount, depositNote || (depositHolidayId ? 'Locked Holiday Savings' : 'Quick deposit'), depositMethod, depositHolidayId || null);
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

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;
    if (amount > (primaryWallet?.balance || 0)) {
      if (showToast) showToast(lang === 'am' ? 'በቂ ቀሪ ሂሳብ የለም' : 'Insufficient available cash', 'error');
      else alert('Insufficient available cash');
      return;
    }
    setLoading(true);
    try {
      const isBank = withdrawMethod.includes('Bank');
      let backendMethod = 'TELEBIRR';
      if (withdrawMethod === 'CBE Birr') backendMethod = 'CBE_BIRR';
      else if (isBank) backendMethod = 'BANK_TRANSFER';
      
      const reason = isBank ? `Withdrawal to ${withdrawMethod}` : 'User withdrawal request';

      await requestWithdrawal(primaryWallet.id, amount, reason, backendMethod, withdrawAccount, user.fullName);
      setWithdrawSuccess(true);
      if (showToast) showToast(lang === 'am' ? 'የማውጣት ጥያቄ ቀርቧል!' : 'Withdrawal request submitted!', 'success');
      setTimeout(() => {
        setShowWithdraw(false);
        setWithdrawAmount('');
        setWithdrawAccount('');
        setWithdrawSuccess(false);
        refresh();
      }, 1500);
    } catch (err) {
      if (showToast) showToast(err.message || 'Withdrawal failed', 'error');
      else alert(err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const enrichedHolidays = customerHolidays
    .filter(ch => ch.status === 'active')
    .map(ch => {
      const holiday = holidays.find(h => h.id === ch.holidayId);
      if (!holiday) return null;
      const pct = Math.min(100, Math.round((ch.currentAmount / ch.targetAmount) * 100));
      const remaining = Math.max(0, ch.targetAmount - ch.currentAmount);
      const days = daysUntil(holiday.deadline);
      return { ...ch, holiday, pct, remaining, days };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h2>{t.welcomeBack}, {user.fullName.split(' ')[0]} 👋</h2>
        <p>{lang === 'am' ? 'የዛሬው የቁጠባ አጠቃላይ እይታዎ እዚህ አለ' : "Here's your savings overview for today"}</p>
      </div>

      {/* Tier Card */}
      <div className={`tier-card ${tierInfo.className}`} style={{ marginBottom: 24 }}>
        <div className="tier-icon">{tierInfo.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{tierInfo.label} {t.tierMember}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{tierInfo.range}</div>
        </div>
        {tierInfo.next && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.next}: {tierInfo.next}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold)' }}>
              {formatETB(Math.max(0, tierInfo.nextAmount - user.totalDeposits))} {t.away}
            </div>
          </div>
        )}
      </div>

      {/* Unified Wallet Dashboard */}
      <div className="card" style={{ marginBottom: 24, padding: 24, background: 'linear-gradient(135deg, var(--bg-card) 0%, hsla(45,80%,50%,0.05) 100%)', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          {/* Main Balance */}
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 4 }}>{lang === 'am' ? 'ለመውጣት የሚችል ቀሪ ሂሳብ' : 'Available Cash (Spend or Withdraw)'}</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {formatETB(primaryWallet?.balance || 0)}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={() => setShowDeposit(true)} style={{ padding: '10px 24px', fontWeight: 600 }}>
                💰 {t.deposit}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowWithdraw(true)} style={{ padding: '10px 24px', fontWeight: 600 }}>
                💸 {t.withdraw || 'Withdraw'}
              </button>
            </div>
          </div>
          
          {/* Detailed Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 24px', flex: 1, minWidth: 280 }}>
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4 }}>{lang === 'am' ? 'ለበዓል የታሰረ' : 'Locked Holiday Savings'}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)' }}>{formatETB(primaryWallet?.lockedBalance || 0)}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4 }}>{lang === 'am' ? 'የቦነስ ክሬዲት' : 'Platform Credits (Bonus)'}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6' }}>{formatETB(primaryWallet?.platformCredits || 0)}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4 }}>{t.totalDeposits}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatETB(user.totalDeposits)}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4 }}>{t.totalSpent}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatETB(user.totalSpent)}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', gridColumn: '1 / -1' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4 }}>{lang === 'am' ? 'የቁጠባ መጠን' : 'Savings Rate'}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--green-bright)' }}>{formatETB(Math.max(0, user.totalDeposits - user.totalSpent))}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Holiday Countdown Banner */}
      {enrichedHolidays[0] && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--gold)', background: 'linear-gradient(135deg, var(--bg-card) 0%, hsla(45,80%,50%,0.03) 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '2rem' }}>{enrichedHolidays[0].holiday.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{lang === 'am' ? enrichedHolidays[0].holiday.name : enrichedHolidays[0].holiday.nameEn}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {lang === 'am' ? enrichedHolidays[0].holiday.nameEn : enrichedHolidays[0].holiday.name}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>
                {enrichedHolidays[0].days}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.daysLeft}</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Deposit + Holiday Progress */}
      <div className="grid-2" style={{ marginBottom: 24, alignItems: 'start' }}>
        {/* Quick Deposit */}
        <div className="card">
          <div className="card-header">
            <h3>💰 {t.quickDeposit}</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowDeposit(true)}>
              <Plus size={14} /> {t.deposit}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 16 }}>
            {[100, 500, 1000, 5000, 10000].map(amt => (
              <button
                key={amt}
                className="btn btn-secondary btn-sm"
                onClick={() => { setDepositAmount(String(amt)); setShowDeposit(true); }}
                style={{ justifyContent: 'center' }}
              >
                {formatETB(amt)}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.paymentMethod}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {[
              { icon: <Smartphone size={14} />, label: t.telebirr, key: 'Telebirr' },
              { icon: <Building2 size={14} />, label: t.cbeBirr, key: 'CBE Birr' },
              { icon: <Smartphone size={14} />, label: 'M-PESA', key: 'M-PESA' },
              { icon: <CreditCard size={14} />, label: lang === 'am' ? 'ባንክ' : 'Bank Transfer', key: 'Bank' }
            ].map(m => (
              <div
                key={m.key}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '10px 8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'pointer',
                  border: depositMethod === m.key ? '1px solid var(--gold)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)'
                }}
                onClick={() => setDepositMethod(m.key)}
              >
                {m.icon}
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Holiday Progress */}
        <div className="card">
          <div className="card-header">
            <h3>🎯 {t.activeGoals}</h3>
          </div>

          {enrichedHolidays.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 10px' }}>
              <div className="empty-state-icon">🎄</div>
              <h3>{t.noActiveGoals}</h3>
              <p>{t.setUpFirstGoal}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {enrichedHolidays.map(ch => {
                const filledBlocks = Math.round((ch.pct / 100) * 20);
                const emptyBlocks = 20 - filledBlocks;
                const progressBarStr = `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}] ${ch.pct}%`;
                const dailySavingsNeeded = ch.days > 0 ? Math.ceil(ch.remaining / ch.days) : 0;
                
                return (
                  <div key={ch.id} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--gold)' }}>{lang === 'am' ? ch.holiday.name : ch.holiday.nameEn}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formatDate(ch.holiday.deadline)} - {ch.days} {t.daysLeft}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: 8, fontSize: '0.85rem' }}>
                      <div className="flex justify-between" style={{ marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Goal: {formatETB(ch.targetAmount)}</span>
                        <span>Saved: {formatETB(ch.currentAmount)} ({ch.pct}%)</span>
                      </div>
                      <div style={{ fontFamily: 'monospace', letterSpacing: '1px', color: ch.pct >= 100 ? 'var(--green-bright)' : 'var(--gold)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {progressBarStr}
                      </div>
                    </div>

                    {ch.remaining > 0 && ch.days > 0 && (
                      <div style={{ background: 'hsla(45,80%,50%,0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 12 }}>
                        💡 <strong>Tip:</strong> Save {formatETB(dailySavingsNeeded)}/day to reach your goal.
                      </div>
                    )}
                    {ch.remaining === 0 && (
                      <div style={{ background: 'var(--green-soft)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--green-bright)', marginTop: 12 }}>
                        🎉 Goal Reached!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Customer Status */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3>📊 {t.customerStatus}</h3>
        </div>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
          {['bronze', 'silver', 'gold'].map(tier => {
            const info = getTierInfo(tier);
            const isCurrent = user.tier === tier;
            return (
              <div key={tier} style={{
                flex: 1, minWidth: 140, padding: 16, borderRadius: 'var(--radius-md)',
                background: isCurrent ? 'var(--bg-elevated)' : 'transparent',
                border: isCurrent ? '2px solid var(--gold)' : '1px solid var(--border-light)',
                textAlign: 'center', opacity: isCurrent ? 1 : 0.6,
                transition: 'all var(--transition-fast)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>{info.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{info.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{info.range}</div>
                {isCurrent && <span className="badge badge-gold" style={{ marginTop: 8 }}>{lang === 'am' ? 'የአሁኑ' : 'Current'}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Profile Completeness */}
      {(() => {
        const checks = [
          { label: lang === 'am' ? 'ሙሉ ስም' : 'Full Name', done: !!user.fullName },
          { label: lang === 'am' ? 'ስልክ ቁጥር (የተረጋገጠ)' : 'Phone Number (Verified)', done: !!user.phone },
          { label: lang === 'am' ? 'አድራሻ' : 'Address', done: !!user.address },
          { label: lang === 'am' ? 'የመታወቂያ ማረጋገጫ' : 'ID Verification', done: !!user.faydaId },
        ];
        const doneCount = checks.filter(c => c.done).length;
        const pct = Math.round((doneCount / checks.length) * 100);
        const filledBlocks = Math.round((pct / 100) * 20);
        const emptyBlocks = 20 - filledBlocks;
        const progressBarStr = `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}] ${pct}%`;

        return (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h3>👤 {lang === 'am' ? 'የግል ማህደር ሁኔታ' : 'Profile Completeness'}</h3>
            </div>
            <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex justify-between" style={{ marginBottom: 8, fontWeight: 600 }}>
                <span>{lang === 'am' ? 'የተሞላ' : 'Completeness'}</span>
                <span style={{ color: pct === 100 ? 'var(--green-bright)' : 'var(--gold)' }}>{pct}%</span>
              </div>
              <div style={{ fontFamily: 'monospace', letterSpacing: '1px', color: pct === 100 ? 'var(--green-bright)' : 'var(--gold)', fontSize: '0.75rem', marginBottom: 16 }}>
                {progressBarStr}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {checks.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: c.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    <span style={{ color: c.done ? 'var(--green-bright)' : 'var(--red)', fontWeight: 800 }}>{c.done ? '✓' : '✗'}</span>
                    {c.label}
                  </div>
                ))}
              </div>
              {pct < 100 && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => onNavigate && onNavigate('settings')}>
                  {lang === 'am' ? 'ማህደሩን አሟላ' : 'Complete Profile'}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <h3>📜 {t.recentTransactions}</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate && onNavigate('wallet')}>
            {t.viewAll} <ChevronRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t.transaction}</th>
                <th>{t.paymentMethod}</th>
                <th>{t.date}</th>
                <th style={{ textAlign: 'right' }}>{t.amount}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 8).map(txn => (
                <tr key={txn.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: txn.amount > 0 ? 'var(--green-soft)' : 'var(--red-soft)',
                        color: txn.amount > 0 ? 'var(--green-bright)' : 'var(--red)'
                      }}>
                        {txn.amount > 0 ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{lang === 'am' && txn.description === 'Monthly savings deposit' ? 'የወር የቁጠባ ተቀማጭ' : lang === 'am' && txn.description === 'Extra deposit for Eid' ? 'ለበዓል ተጨማሪ ተቀማጭ' : lang === 'am' && txn.description.includes('Menz sheep') ? 'የመንዝ በግ ግዢ ከገበያ' : lang === 'am' && txn.description.includes('Family deposit') ? 'የቤተሰብ ተቀማጭ - ሜሮን' : lang === 'am' && txn.description.includes('Savings for Genna') ? 'የገና ቁጠባ' : lang === 'am' && txn.description.includes('hens') ? 'የዶሮዎች ግዢ' : lang === 'am' && txn.description.includes('Bulk deposit') ? 'በትልቅ መጠን የተቀመጠ' : lang === 'am' && txn.description.includes('Holiday savings') ? 'የበዓል ቁጠባ' : lang === 'am' && txn.description.includes('Weekly savings') ? 'የሳምንት ቁጠባ' : txn.description}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{translateType(txn.type)}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-muted">{translateMethod(txn.method)}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{formatDateTime(txn.createdAt)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: txn.amount > 0 ? 'var(--green-bright)' : 'var(--red)' }}>
                    {txn.amount > 0 ? '+' : ''}{formatETB(txn.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="modal-overlay" onClick={() => {
          if (!depositSuccess) {
            setShowDeposit(false);
            setLockAcknowledged(false);
          }
        }}>
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
                  <h3>💰 {t.deposit}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowDeposit(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">{t.amount} (ETB)</label>
                    <input type="number" className="form-input" placeholder={t.enterAmount} value={depositAmount} onChange={e => setDepositAmount(e.target.value)} min="1" id="deposit-amount" onKeyDown={e => { if (['e', 'E', '-', '+', '.'].includes(e.key)) e.preventDefault(); }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t.paymentMethod}</label>
                    <select className="form-input form-select" value={depositMethod} onChange={e => setDepositMethod(e.target.value)} id="deposit-method">
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
                    <select className="form-input form-select" value={depositHolidayId} onChange={e => setDepositHolidayId(e.target.value)} id="deposit-holiday">
                      <option value="">{lang === 'am' ? 'አይቆለፍ - የሚገኝ ቀሪ ሂሳብ' : 'Do not lock - Available Cash'}</option>
                      {holidays.map(h => (
                        <option key={h.id} value={h.id}>{lang === 'am' ? h.name : h.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bonus and Lock Preview */}
                  {depositHolidayId && depositAmount && parseFloat(depositAmount) > 0 && (() => {
                    const hol = holidays.find(h => h.id === depositHolidayId);
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
                    <input type="text" className="form-input" placeholder={t.monthlySavings} value={depositNote} onChange={e => setDepositNote(e.target.value)} id="deposit-note" />
                  </div>
 
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16, marginTop: 8 }}>
                    <div className="flex justify-between" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'የአሁኑ ቀሪ ሂሳብ (available):' : 'Current Cash (Available):'}</span>
                      <span style={{ fontWeight: 600 }}>{formatETB(primaryWallet?.balance || 0)}</span>
                    </div>
                    {primaryWallet?.lockedBalance > 0 && (
                      <div className="flex justify-between" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'የታሰረ ቁጠባ:' : 'Current Locked Savings:'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{formatETB(primaryWallet.lockedBalance)}</span>
                      </div>
                    )}
                    <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t.afterDeposit}</span>
                      <span style={{ fontWeight: 700, color: 'var(--green-bright)' }}>
                        {depositHolidayId
                          ? `${formatETB(primaryWallet?.balance || 0)} Available / ${formatETB((primaryWallet?.lockedBalance || 0) + (parseFloat(depositAmount) || 0))} Locked`
                          : formatETB((primaryWallet?.balance || 0) + (parseFloat(depositAmount) || 0))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => {
                    setShowDeposit(false);
                    setLockAcknowledged(false);
                  }} disabled={loading}>{t.cancel}</button>
                  <button className="btn btn-success" onClick={handleDeposit} disabled={loading || (!!depositHolidayId && !lockAcknowledged)} id="deposit-confirm">
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

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="modal-overlay" onClick={() => {
          if (!withdrawSuccess) setShowWithdraw(false);
        }}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            {withdrawSuccess ? (
              <div style={{ padding: '50px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>⏳</div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{lang === 'am' ? 'የማውጣት ጥያቄ ቀርቧል' : 'Withdrawal Request Submitted'}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {formatETB(parseFloat(withdrawAmount) || 0)} {lang === 'am' ? 'ወደ' : 'via'} {translateMethod(withdrawMethod)}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 12 }}>
                  {lang === 'am' ? 'አስተዳዳሪው ይህንን ጥያቄ መገምገም እና ማረጋገጥ ይኖርበታል።' : 'Your request requires admin approval and will be processed shortly.'}
                </p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h3>💸 {t.withdraw || 'Withdraw'}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowWithdraw(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">{t.amount} (ETB)</label>
                    <input type="number" className="form-input" placeholder={t.enterAmount} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} min="1" id="withdraw-amount" />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      {lang === 'am' ? 'የሚገኝ:' : 'Available:'} {formatETB(primaryWallet?.balance || 0)}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{lang === 'am' ? 'የማውጣት ዘዴ' : 'Withdrawal Method'}</label>
                    <select className="form-input form-select" value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} id="withdraw-method">
                      <option value="Telebirr">{t.telebirr}</option>
                      <option value="CBE Birr">{t.cbeBirr}</option>
                      <option value="CBE Bank Transfer">{lang === 'am' ? 'የኢትዮጵያ ንግድ ባንክ' : 'CBE Bank Transfer'}</option>
                      <option value="Awash Bank">{lang === 'am' ? 'አዋሽ ባንክ' : 'Awash Bank'}</option>
                      <option value="Dashen Bank">{lang === 'am' ? 'ዳሽን ባንክ' : 'Dashen Bank'}</option>
                      <option value="Abyssinia Bank">{lang === 'am' ? 'አቢሲንያ ባንክ' : 'Abyssinia Bank'}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{lang === 'am' ? 'የሂሳብ ዝርዝር / ስልክ ቁጥር' : 'Account Details / Phone Number'}</label>
                    <input type="text" className="form-input" placeholder={lang === 'am' ? 'የሂሳብ ወይም የስልክ ቁጥር ያስገቡ' : 'Enter account or phone number'} value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)} />
                  </div>
                  <div style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12 }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      <strong style={{ color: '#f97316' }}>{lang === 'am' ? 'ማስታወሻ:' : 'Note:'}</strong> {lang === 'am' ? 'የማውጣት ጥያቄው በአስተዳዳሪ መረጋገጥ አለበት።' : 'Withdrawals are subject to admin review and processing times may vary (instant for mobile money, 1-3 days for banks).'}
                    </p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowWithdraw(false)} disabled={loading}>{t.cancel}</button>
                  <button className="btn btn-primary" onClick={handleWithdraw} disabled={loading || !withdrawAmount || !withdrawAccount} id="withdraw-confirm">
                    {loading ? <span className="btn-spinner" /> : t.confirmPurchase || 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
