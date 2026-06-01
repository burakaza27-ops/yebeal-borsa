import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, TrendingUp, Clock, Gift, ArrowUpRight, ArrowDownRight,
  Plus, CreditCard, Smartphone, Building2, ChevronRight, PiggyBank,
  DollarSign
} from 'lucide-react';
import {
  makeDeposit, formatETB, formatDateTime, getTierInfo,
  daysUntil, getAnalytics, ANIMAL_EMOJIS, TRANSLATIONS
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

      {/* KPI Stats — showing Available, Locked, Platform Credits, and Total Deposits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-icon"><Wallet size={20} /></div>
          <div className="stat-value">{formatETB(primaryWallet?.balance || 0)}</div>
          <div className="stat-label">{lang === 'am' ? 'ለመውጣት የሚችል' : 'Available Cash'}</div>
        </div>
        <div className="stat-card gold">
          <div className="stat-icon"><Clock size={20} /></div>
          <div className="stat-value">{formatETB(primaryWallet?.lockedBalance || 0)}</div>
          <div className="stat-label">{lang === 'am' ? 'የታሰረ የቁጠባ ግብ' : 'Locked Savings'}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><Gift size={20} /></div>
          <div className="stat-value">{formatETB(primaryWallet?.platformCredits || 0)}</div>
          <div className="stat-label">{lang === 'am' ? 'የቦነስ ክሬዲት' : 'Platform Credits'}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon"><TrendingUp size={20} /></div>
          <div className="stat-value">{formatETB(user.totalDeposits)}</div>
          <div className="stat-label">{t.totalDeposits}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><DollarSign size={20} /></div>
          <div className="stat-value">{formatETB(user.totalSpent)}</div>
          <div className="stat-label">{t.totalSpent}</div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[1000, 2000, 5000, 10000].map(amt => (
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
              { icon: <CreditCard size={14} />, label: t.bank, key: 'Bank' }
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
              {enrichedHolidays.map(ch => (
                <div key={ch.id} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1.2rem' }}>{ch.holiday.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{lang === 'am' ? ch.holiday.name : ch.holiday.nameEn}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {ch.days} {t.daysLeft} · {ANIMAL_EMOJIS[ch.animalPreference]} {translateAnimal(ch.animalPreference)}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: ch.pct >= 100 ? 'var(--green-bright)' : 'var(--gold)' }}>{ch.pct}%</span>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 8 }}>
                    <div
                      className={`progress-fill ${ch.pct >= 100 ? 'green' : ch.pct >= 50 ? 'gold' : 'blue'}`}
                      style={{ width: `${ch.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>{formatETB(ch.currentAmount)} {t.saved}</span>
                    <span>{formatETB(ch.remaining)} {t.remaining}</span>
                  </div>
                </div>
              ))}
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
    </div>
  );
}
