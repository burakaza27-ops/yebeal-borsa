import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronRight, ArrowDownLeft, ArrowUpRight,
  Smartphone, Building2, CreditCard, CheckCircle, Lock,
  TrendingUp, Target, Zap, AlertCircle
} from 'lucide-react';
import {
  makeDeposit, formatETB, formatDateTime, getTierInfo,
  daysUntil, TRANSLATIONS, requestWithdrawal
} from '../db';
import { fetchWallets, fetchTransactions, fetchHolidays, fetchCustomerHolidays } from '../api';

// ─── Helper: vibration (mobile haptic feel) ──────────────────────────────────
function vibrate(ms = 10) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// ─── Helper: relative date ────────────────────────────────────────────────────
function relativeDate(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(iso);
}

// ─── Helper: shorten description ─────────────────────────────────────────────
function shortDesc(desc, lang) {
  if (!desc) return '';
  if (lang === 'am') {
    if (desc.includes('Monthly savings')) return 'የወር ቁጠባ';
    if (desc.includes('Holiday savings') || desc.includes('Savings for')) return 'የበዓል ቁጠባ';
    if (desc.includes('deposit') || desc.includes('Deposit')) return 'ተቀማጭ';
    if (desc.includes('Menz sheep') || desc.includes('sheep')) return 'የበግ ግዢ';
    if (desc.includes('hens') || desc.includes('hen')) return 'ዶሮ ግዢ';
    if (desc.includes('withdrawal') || desc.includes('Withdrawal')) return 'ገንዘብ ማውጣት';
  }
  return desc.length > 36 ? desc.slice(0, 34) + '…' : desc;
}

// ─── Step dots indicator ──────────────────────────────────────────────────────
function StepDots({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === step ? 20 : 8, height: 8,
            borderRadius: 'var(--radius-full)',
            background: i <= step ? 'var(--gold)' : 'var(--bg-elevated)',
            transition: 'all var(--transition-base)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Real CSS Progress Bar ────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'gold', height = 8 }) {
  return (
    <div style={{
      height, background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-full)', overflow: 'hidden',
    }}>
      <div
        className={`progress-fill ${color}`}
        style={{ width: `${Math.min(100, pct)}%`, height: '100%' }}
      />
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ ch, lang, idx, onAddMoney }) {
  const dailyNeeded = ch.days > 0 ? Math.ceil(ch.remaining / ch.days) : 0;
  const isComplete = ch.remaining === 0;
  const t_label = lang === 'am' ? ch.holiday.name : ch.holiday.nameEn;

  return (
    <div
      className="cd-goal-card animate-in"
      style={{ animationDelay: `${idx * 0.07}s` }}
      onClick={() => { vibrate(); onAddMoney(ch); }}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') { vibrate(); onAddMoney(ch); } }}
      aria-label={`Add money to ${t_label}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: '1.3rem' }}>{ch.holiday.icon}</span>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{t_label}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {lang === 'am' ? `${ch.days} ቀናት ይቀራሉ` : `${ch.days} days left`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '1.1rem', fontWeight: 800,
            color: isComplete ? 'var(--green-bright)' : 'var(--gold)',
          }}>
            {ch.pct}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {lang === 'am' ? 'ተቀምጧል' : 'saved'}
          </div>
        </div>
      </div>

      <ProgressBar pct={ch.pct} color={isComplete ? 'green' : 'gold'} height={10} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 8, marginBottom: 12 }}>
        <span>{formatETB(ch.currentAmount)} {lang === 'am' ? 'ተቀምጧል' : 'saved'}</span>
        <span>{lang === 'am' ? 'ግብ:' : 'Goal:'} {formatETB(ch.targetAmount)}</span>
      </div>

      {isComplete ? (
        <div style={{
          background: 'var(--green-soft)', border: '1px solid hsla(152,69%,40%,0.2)',
          borderRadius: 'var(--radius-sm)', padding: '8px 12px',
          fontSize: '0.78rem', color: 'var(--green-bright)', fontWeight: 600,
        }}>
          🎉 {lang === 'am' ? 'ግብ ተደርሷል!' : 'Goal reached!'}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {dailyNeeded > 0 && (
            <div style={{
              background: 'var(--gold-soft)', borderRadius: 'var(--radius-sm)',
              padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-secondary)',
            }}>
              💡 {lang === 'am' ? `ቀን/ቀን ${formatETB(dailyNeeded)} ቁጠቡ` : `Save ${formatETB(dailyNeeded)}/day`}
            </div>
          )}
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600,
          }}>
            {lang === 'am' ? 'ገንዘብ ጨምር' : 'Add money'} <ChevronRight size={14} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Transaction Item ─────────────────────────────────────────────────────────
function TxnItem({ txn, lang }) {
  const isIn = Number(txn.amount) > 0;
  const typeLabel = {
    deposit: lang === 'am' ? 'ተቀማጭ' : 'Deposit',
    purchase: lang === 'am' ? 'ግዢ' : 'Purchase',
    withdrawal: lang === 'am' ? 'ማውጣት' : 'Withdrawal',
  }[txn.type] || txn.type;

  return (
    <div className="cd-txn-item animate-in">
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isIn ? 'var(--green-soft)' : 'var(--red-soft)',
        color: isIn ? 'var(--green-bright)' : 'var(--red)',
      }}>
        {isIn ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shortDesc(txn.description, lang)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-muted" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>{typeLabel}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{relativeDate(txn.createdAt)}</span>
        </div>
      </div>
      <div style={{
        fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
        color: isIn ? 'var(--green-bright)' : 'var(--red)',
      }}>
        {isIn ? '+' : ''}{formatETB(txn.amount)}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CustomerDashboard({ onRefresh, lang, onNavigate, showToast, user }) {
  const queryClient = useQueryClient();

  const { data: wallets = [] } = useQuery({ queryKey: ['wallets'], queryFn: fetchWallets });
  const { data: transactionsRaw = {} } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: holidays = [] } = useQuery({ queryKey: ['holidays'], queryFn: fetchHolidays });
  const { data: customerHolidays = [] } = useQuery({ queryKey: ['customer-holidays'], queryFn: fetchCustomerHolidays });

  const transactions = Array.isArray(transactionsRaw)
    ? transactionsRaw
    : (transactionsRaw?.transactions || []);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const primaryWallet = wallets.find(w => !w.isFamily);
  const tierInfo = getTierInfo(user.tier);

  // ── Deposit wizard state ──────────────────────────────────────────────────
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositStep, setDepositStep] = useState(0); // 0=amount, 1=method, 2=lock, 3=confirm
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('TELEBIRR');
  const [depositHolidayId, setDepositHolidayId] = useState('');
  const [lockAcknowledged, setLockAcknowledged] = useState(false);
  const [depositNote, setDepositNote] = useState('');
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);

  // ── Withdraw state ────────────────────────────────────────────────────────
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('TELEBIRR');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // ── "Add money to goal" shortcut ──────────────────────────────────────────
  const [preselectedGoal, setPreselectedGoal] = useState(null);

  const depositAmountRef = useRef(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['wallets'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['customer-holidays'] });
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };

  // Focus input when modal opens
  useEffect(() => {
    if (showDeposit && depositStep === 0) {
      setTimeout(() => depositAmountRef.current?.focus(), 100);
    }
  }, [showDeposit, depositStep]);

  // Enrich holidays
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

  const nextHoliday = enrichedHolidays[0];

  // ── Open deposit (optionally with pre-selected goal) ──────────────────────
  const openDeposit = (goal = null) => {
    setPreselectedGoal(goal);
    setDepositHolidayId(goal ? goal.holidayId : '');
    setDepositAmount('');
    setDepositMethod('TELEBIRR');
    setLockAcknowledged(false);
    setDepositNote('');
    setDepositStep(0);
    setDepositSuccess(false);
    setShowDeposit(true);
    vibrate();
  };

  const closeDeposit = () => {
    if (depositSuccess) return;
    setShowDeposit(false);
    setPreselectedGoal(null);
    setDepositHolidayId('');
    setLockAcknowledged(false);
  };

  const goToNextDepositStep = () => {
    vibrate();
    // Validate step 0
    if (depositStep === 0) {
      const amt = parseFloat(depositAmount);
      if (!amt || amt <= 0) {
        showToast(lang === 'am' ? 'ትክክለኛ መጠን ያስገቡ' : 'Enter a valid amount', 'error');
        return;
      }
      setDepositStep(1);
      return;
    }
    setDepositStep(s => s + 1);
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;

    const previousWallets = queryClient.getQueryData(['wallets']);
    if (previousWallets) {
      queryClient.setQueryData(['wallets'], old => {
        if (!old) return old;
        return old.map(w => {
          if (w.id === primaryWallet?.id) {
            if (depositHolidayId) return { ...w, lockedBalance: (w.lockedBalance || 0) + amount };
            return { ...w, balance: (w.balance || 0) + amount };
          }
          return w;
        });
      });
    }

    setDepositLoading(true);
    try {
      await makeDeposit(
        primaryWallet.id, amount,
        depositNote || (depositHolidayId ? 'Locked Holiday Savings' : 'Quick deposit'),
        depositMethod, depositHolidayId || null
      );
      vibrate(20);
      setDepositSuccess(true);
      showToast(lang === 'am' ? 'ገንዘብ በተሳካ ሁኔታ ተቀምጧል!' : 'Deposit successful!', 'success');
      setTimeout(() => {
        setShowDeposit(false);
        setDepositAmount('');
        setDepositNote('');
        setDepositHolidayId('');
        setDepositSuccess(false);
        setPreselectedGoal(null);
        setDepositStep(0);
        refresh();
      }, 1800);
    } catch (err) {
      if (previousWallets) queryClient.setQueryData(['wallets'], previousWallets);
      showToast(err.message || 'Deposit failed', 'error');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;
    if (amount > (primaryWallet?.balance || 0)) {
      showToast(lang === 'am' ? 'በቂ ቀሪ ሂሳብ የለም' : 'Insufficient available cash', 'error');
      return;
    }
    setWithdrawLoading(true);
    try {
      const isBank = withdrawMethod.includes('BANK') || withdrawMethod.includes('AWASH') || withdrawMethod.includes('DASHEN') || withdrawMethod.includes('ABYSSINIA');
      const reason = isBank ? `Withdrawal to ${withdrawMethod}` : 'User withdrawal request';
      await requestWithdrawal(primaryWallet.id, amount, reason, withdrawMethod, withdrawAccount, user.fullName);
      vibrate(20);
      setWithdrawSuccess(true);
      showToast(lang === 'am' ? 'የማውጣት ጥያቄ ቀርቧል!' : 'Withdrawal request submitted!', 'success');
      setTimeout(() => {
        setShowWithdraw(false);
        setWithdrawAmount('');
        setWithdrawAccount('');
        setWithdrawSuccess(false);
        refresh();
      }, 1800);
    } catch (err) {
      showToast(err.message || 'Withdrawal failed', 'error');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // ── Deposit bonus preview ─────────────────────────────────────────────────
  const getBonusInfo = () => {
    if (!depositHolidayId || !depositAmount || parseFloat(depositAmount) <= 0) return null;
    const hol = holidays.find(h => h.id === depositHolidayId);
    if (!hol) return null;
    const diff = new Date(hol.deadline) - new Date();
    const days = Math.max(0, Math.ceil(diff / 86400000));
    let pct = 0;
    if (days >= 180) pct = 0.05;
    else if (days >= 90) pct = 0.03;
    else if (days >= 30) pct = 0.02;
    const bonus = parseFloat(depositAmount) * pct;
    return pct > 0 ? { pct, bonus, days, hol } : null;
  };

  const bonusInfo = getBonusInfo();

  // ── Payment method cards ──────────────────────────────────────────────────
  const METHODS = [
    { key: 'TELEBIRR', icon: <Smartphone size={20} />, label: lang === 'am' ? 'ቴሌቢር' : 'Telebirr', color: 'var(--green)' },
    { key: 'CBE_BIRR', icon: <Building2 size={20} />, label: lang === 'am' ? 'ሲቢኢ ብር' : 'CBE Birr', color: 'var(--blue)' },
    { key: 'BANK_TRANSFER', icon: <CreditCard size={20} />, label: lang === 'am' ? 'ባንክ' : 'Bank', color: 'var(--gold)' },
    { key: 'CASH', icon: <Zap size={20} />, label: lang === 'am' ? 'ጥሬ ገንዘብ' : 'Cash', color: 'var(--purple)' },
  ];

  const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

  return (
    <div className="cd-page fade-in">
      {/* ── Hero Balance Card ──────────────────────────────────────────── */}
      <div className="cd-hero animate-in">
        <div style={{ marginBottom: 4, fontSize: '0.8rem', opacity: 0.85 }}>
          {lang === 'am' ? 'ሰላም, ' : 'Hello, '}{user.fullName.split(' ')[0]} 👋
        </div>
        <div style={{ fontSize: '0.78rem', opacity: 0.75, marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)',
            padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600,
          }}>
            {tierInfo.icon} {tierInfo.label}
          </span>
        </div>

        <div style={{ marginBottom: 6, fontSize: '0.85rem', opacity: 0.85 }}>
          {lang === 'am' ? 'ለማውጣት የሚችል ቀሪ ሂሳብ' : 'Available Balance'}
        </div>
        <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 4, letterSpacing: '-1px' }}>
          {formatETB(primaryWallet?.balance || 0)}
        </div>
        <div style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: 24 }}>ETB</div>

        {/* Sub-stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div className="cd-hero-stat">
            <Lock size={13} style={{ marginBottom: 3, opacity: 0.8 }} />
            <div style={{ fontSize: '0.68rem', opacity: 0.8, marginBottom: 2 }}>
              {lang === 'am' ? 'የታሰረ' : 'Locked'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {formatETB(primaryWallet?.lockedBalance || 0)}
            </div>
          </div>
          <div className="cd-hero-stat">
            <TrendingUp size={13} style={{ marginBottom: 3, opacity: 0.8 }} />
            <div style={{ fontSize: '0.68rem', opacity: 0.8, marginBottom: 2 }}>
              {lang === 'am' ? 'ጠቅላላ ቁጠባ' : 'Total Saved'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {formatETB(user.totalDeposits)}
            </div>
          </div>
          {(primaryWallet?.platformCredits || 0) > 0 && (
            <div className="cd-hero-stat">
              <Zap size={13} style={{ marginBottom: 3, opacity: 0.8 }} />
              <div style={{ fontSize: '0.68rem', opacity: 0.8, marginBottom: 2 }}>
                {lang === 'am' ? 'ክሬዲት' : 'Credits'}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {formatETB(primaryWallet.platformCredits)}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="cd-hero-btn primary"
            onClick={() => openDeposit()}
            id="btn-deposit-hero"
            aria-label="Deposit money"
          >
            <Plus size={18} />
            {lang === 'am' ? 'አስቀምጥ' : 'Deposit'}
          </button>
          <button
            className="cd-hero-btn secondary"
            onClick={() => { setShowWithdraw(true); vibrate(); }}
            id="btn-withdraw-hero"
            aria-label="Withdraw money"
          >
            <ArrowUpRight size={18} />
            {lang === 'am' ? 'አውጣ' : 'Withdraw'}
          </button>
        </div>
      </div>

      {/* ── Holiday Countdown Banner ───────────────────────────────────── */}
      {nextHoliday && (
        <div className="cd-countdown-banner animate-in" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.8rem' }}>{nextHoliday.holiday.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {lang === 'am' ? nextHoliday.holiday.name : nextHoliday.holiday.nameEn}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {formatETB(nextHoliday.remaining)} {lang === 'am' ? 'ይቀራል' : 'remaining to reach goal'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>
              {nextHoliday.days}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {lang === 'am' ? 'ቀናት' : 'days left'}
            </div>
          </div>
        </div>
      )}

      {/* ── Savings Goals ──────────────────────────────────────────────── */}
      <div className="cd-section animate-in" style={{ animationDelay: '0.15s' }}>
        <div className="cd-section-header">
          <h3>🎯 {lang === 'am' ? 'የቁጠባ ግቦች' : 'Savings Goals'}</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigate && onNavigate('holidays')}
            style={{ fontSize: '0.78rem' }}
          >
            {lang === 'am' ? 'ሁሉም' : 'View All'} <ChevronRight size={14} />
          </button>
        </div>

        {enrichedHolidays.length === 0 ? (
          <div className="cd-empty-state">
            <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.5 }}>🎯</div>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.95rem' }}>
              {lang === 'am' ? 'ምንም ግብ የለም' : 'No goals yet'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              {lang === 'am'
                ? 'ለበዓሉ ቁጠባ ለመጀመር + ቁልፍን ጫን'
                : 'Tap the + button to create your first savings goal'}
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate && onNavigate('holidays')}
            >
              <Plus size={14} /> {lang === 'am' ? 'ግብ ፍጠር' : 'Create a Goal'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {enrichedHolidays.slice(0, 3).map((ch, idx) => (
              <GoalCard
                key={ch.id}
                ch={ch}
                lang={lang}
                idx={idx}
                onAddMoney={goal => openDeposit(goal)}
              />
            ))}
            {enrichedHolidays.length > 3 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onNavigate && onNavigate('holidays')}
              >
                {lang === 'am' ? `ሌሎች ${enrichedHolidays.length - 3} ግቦች ይመልከቱ` : `View ${enrichedHolidays.length - 3} more goals`}
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Recent Activity ─────────────────────────────────────────────── */}
      <div className="cd-section animate-in" style={{ animationDelay: '0.22s' }}>
        <div className="cd-section-header">
          <h3>📜 {lang === 'am' ? 'የቅርብ ጊዜ ግብይቶች' : 'Recent Activity'}</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigate && onNavigate('wallet')}
            style={{ fontSize: '0.78rem' }}
          >
            {lang === 'am' ? 'ሁሉም' : 'View All'} <ChevronRight size={14} />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="cd-empty-state" style={{ padding: '24px 16px' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10, opacity: 0.4 }}>📋</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {lang === 'am' ? 'ምንም ግብይቶች የሉም' : 'No transactions yet'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {transactions.slice(0, 7).map(txn => (
              <TxnItem key={txn.id} txn={txn} lang={lang} />
            ))}
          </div>
        )}
      </div>

      {/* ── Floating Action Button ──────────────────────────────────────── */}
      <button
        className="cd-fab"
        onClick={() => openDeposit()}
        id="fab-deposit"
        aria-label="Quick deposit"
        title={lang === 'am' ? 'ፈጣን ተቀማጭ' : 'Quick deposit'}
      >
        <Plus size={26} />
      </button>

      {/* ═══════════════════════════════════════════════════════════════════
          DEPOSIT MODAL — Step Wizard
      ══════════════════════════════════════════════════════════════════ */}
      {showDeposit && (
        <div
          className="modal-overlay"
          onClick={closeDeposit}
          role="dialog"
          aria-label="Deposit money"
          aria-modal="true"
        >
          <div className="modal cd-modal scale-in" onClick={e => e.stopPropagation()}>
            {depositSuccess ? (
              /* ── Success Screen ── */
              <div style={{ padding: '50px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: 8, fontWeight: 700 }}>
                  {lang === 'am' ? 'ተቀምጧል!' : 'Deposit Successful!'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {formatETB(parseFloat(depositAmount) || 0)} {lang === 'am' ? 'ገቢ ተደርጓል' : 'has been added to your wallet'}
                </p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {depositStep > 0 && (
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => { vibrate(); setDepositStep(s => s - 1); }}
                        aria-label="Back"
                        style={{ marginRight: 4 }}
                      >
                        ←
                      </button>
                    )}
                    <h3>💰 {lang === 'am' ? 'ተቀማጭ' : 'Deposit'}</h3>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={closeDeposit} aria-label="Close">✕</button>
                </div>

                <div className="modal-body">
                  <StepDots step={depositStep} total={4} />

                  {/* ── Step 0: Amount ── */}
                  {depositStep === 0 && (
                    <div className="animate-in">
                      <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                          {lang === 'am' ? 'ምን ያህል ማስቀመጥ ይፈልጋሉ?' : 'How much would you like to deposit?'}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            ref={depositAmountRef}
                            type="number"
                            className="form-input cd-amount-input"
                            placeholder="0"
                            value={depositAmount}
                            onChange={e => setDepositAmount(e.target.value)}
                            min="1"
                            id="deposit-amount"
                            onKeyDown={e => {
                              if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault();
                              if (e.key === 'Enter') goToNextDepositStep();
                            }}
                            inputMode="decimal"
                          />
                          <span style={{
                            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--text-muted)', fontWeight: 600, pointerEvents: 'none',
                          }}>ETB</span>
                        </div>
                      </div>

                      {/* Quick amount chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                        {QUICK_AMOUNTS.map(amt => (
                          <button
                            key={amt}
                            className={`cd-chip ${depositAmount === String(amt) ? 'selected' : ''}`}
                            onClick={() => { vibrate(); setDepositAmount(String(amt)); }}
                          >
                            {formatETB(amt)}
                          </button>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        {lang === 'am' ? 'ያለው ቀሪ ሂሳብ: ' : 'Current balance: '}
                        <strong style={{ color: 'var(--text-primary)' }}>{formatETB(primaryWallet?.balance || 0)}</strong>
                      </div>
                    </div>
                  )}

                  {/* ── Step 1: Method ── */}
                  {depositStep === 1 && (
                    <div className="animate-in">
                      <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {lang === 'am' ? 'የክፍያ ዘዴ ይምረጡ' : 'Choose your payment method'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {METHODS.map(m => (
                          <button
                            key={m.key}
                            className={`cd-method-card ${depositMethod === m.key ? 'selected' : ''}`}
                            onClick={() => { vibrate(); setDepositMethod(m.key); }}
                            id={`method-${m.key}`}
                            style={{ '--method-color': m.color }}
                          >
                            <span style={{ color: m.color, marginBottom: 6 }}>{m.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Step 2: Lock for holiday ── */}
                  {depositStep === 2 && (
                    <div className="animate-in">
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {lang === 'am' ? 'ለበዓል ቁጠባ ሊቆለፍ ይፈልጋሉ? (ባካዎን)' : 'Lock this deposit for a Holiday Goal? (Optional)'}
                        </div>
                      </div>

                      {/* No lock option */}
                      <div
                        className={`cd-lock-option ${!depositHolidayId ? 'selected' : ''}`}
                        onClick={() => { vibrate(); setDepositHolidayId(''); setLockAcknowledged(false); }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {lang === 'am' ? '🔓 አይቆለፍ — ሊወጣ ይችላል' : '🔓 No Lock — Available Cash'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {lang === 'am' ? 'ገንዘቡ ሊወጣ ወይም ለግዢ ሊዋል ይችላል' : 'Freely spend or withdraw anytime'}
                        </div>
                      </div>

                      {/* Holiday options */}
                      {enrichedHolidays.map(ch => {
                        const isSelected = depositHolidayId === ch.holidayId;
                        const diff = new Date(ch.holiday.deadline) - new Date();
                        const days = Math.max(0, Math.ceil(diff / 86400000));
                        let pctBonus = 0;
                        if (days >= 180) pctBonus = 5;
                        else if (days >= 90) pctBonus = 3;
                        else if (days >= 30) pctBonus = 2;
                        return (
                          <div
                            key={ch.id}
                            className={`cd-lock-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => { vibrate(); setDepositHolidayId(ch.holidayId); }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.2rem' }}>{ch.holiday.icon}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>
                                  {lang === 'am' ? ch.holiday.name : ch.holiday.nameEn}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                  {ch.days} {lang === 'am' ? 'ቀናት ይቀራሉ' : 'days left'} · {ch.pct}% {lang === 'am' ? 'ተቀምጧል' : 'saved'}
                                </div>
                              </div>
                              {pctBonus > 0 && (
                                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                                  +{pctBonus}% {lang === 'am' ? 'ጉርሻ' : 'bonus'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Bonus preview */}
                      {bonusInfo && (
                        <div style={{
                          background: 'var(--green-soft)', border: '1px solid hsla(152,69%,40%,0.2)',
                          borderRadius: 'var(--radius-md)', padding: 12, marginTop: 12,
                          fontSize: '0.8rem', color: 'var(--text-secondary)',
                        }}>
                          🎉 <strong style={{ color: 'var(--green-bright)' }}>
                            +{formatETB(bonusInfo.bonus)} {lang === 'am' ? 'ጉርሻ ክሬዲት' : 'bonus credit'}
                          </strong>{' '}
                          {lang === 'am'
                            ? `(${(bonusInfo.pct * 100)}% ለ${bonusInfo.days} ቀናት ቆለፋ)`
                            : `(${(bonusInfo.pct * 100)}% for locking ${bonusInfo.days} days)`}
                        </div>
                      )}

                      {/* Lock acknowledgement */}
                      {depositHolidayId && (
                        <div style={{
                          background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)',
                          borderRadius: 'var(--radius-md)', padding: 12, marginTop: 12,
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}>
                          <input
                            type="checkbox"
                            id="lock-ack"
                            checked={lockAcknowledged}
                            onChange={e => setLockAcknowledged(e.target.checked)}
                            style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                          />
                          <label htmlFor="lock-ack" style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <strong style={{ color: '#f97316' }}>⚠️ {lang === 'am' ? 'ማስጠንቀቂያ: ' : 'Warning: '}</strong>
                            {lang === 'am'
                              ? 'ቀደምት ክፍያ 30% ቅጣት ያስከትላል።'
                              : 'Early withdrawal before the holiday date incurs a 30% penalty.'}
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Step 3: Confirm ── */}
                  {depositStep === 3 && (
                    <div className="animate-in">
                      <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {lang === 'am' ? 'ዝርዝሮችን ያረጋግጡ' : 'Review your deposit'}
                        </div>
                      </div>

                      <div style={{
                        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
                        padding: 20, marginBottom: 16,
                      }}>
                        <div className="cd-confirm-row">
                          <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'መጠን' : 'Amount'}</span>
                          <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1.1rem' }}>
                            {formatETB(parseFloat(depositAmount) || 0)} ETB
                          </span>
                        </div>
                        <div className="cd-confirm-row">
                          <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ዘዴ' : 'Method'}</span>
                          <span style={{ fontWeight: 600 }}>
                            {METHODS.find(m => m.key === depositMethod)?.label || depositMethod}
                          </span>
                        </div>
                        <div className="cd-confirm-row">
                          <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ዓይነት' : 'Type'}</span>
                          <span style={{ fontWeight: 600 }}>
                            {depositHolidayId
                              ? `🔒 ${lang === 'am' ? 'ቆልፍ' : 'Locked'} — ${holidays.find(h => h.id === depositHolidayId)?.[lang === 'am' ? 'name' : 'nameEn'] || ''}`
                              : `🔓 ${lang === 'am' ? 'ሊወጣ ይችላል' : 'Available Cash'}`}
                          </span>
                        </div>
                        {bonusInfo && (
                          <div className="cd-confirm-row">
                            <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ጉርሻ' : 'Bonus'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--green-bright)' }}>
                              +{formatETB(bonusInfo.bonus)} ETB
                            </span>
                          </div>
                        )}
                        <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 12, paddingTop: 12 }}>
                          <div className="cd-confirm-row">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {lang === 'am' ? 'ከዚህ በኋላ ቀሪ ሂሳብ' : 'Balance after'}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--green-bright)' }}>
                              {depositHolidayId
                                ? formatETB(primaryWallet?.balance || 0)
                                : formatETB((primaryWallet?.balance || 0) + (parseFloat(depositAmount) || 0))}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">{t.noteOptional}</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={t.monthlySavings || 'e.g. Monthly savings'}
                          value={depositNote}
                          onChange={e => setDepositNote(e.target.value)}
                          id="deposit-note"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  {depositStep < 3 ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => { vibrate(); depositStep > 0 ? setDepositStep(s => s - 1) : closeDeposit(); }}
                        disabled={depositLoading}
                      >
                        {depositStep === 0 ? t.cancel : (lang === 'am' ? 'ተመለስ' : 'Back')}
                      </button>
                      <button
                        className="btn btn-success"
                        onClick={goToNextDepositStep}
                        disabled={
                          depositLoading ||
                          (depositStep === 0 && (!depositAmount || parseFloat(depositAmount) <= 0)) ||
                          (depositStep === 2 && !!depositHolidayId && !lockAcknowledged)
                        }
                        id="deposit-next"
                      >
                        {lang === 'am' ? 'ቀጣይ →' : 'Next →'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setDepositStep(2)}
                        disabled={depositLoading}
                      >
                        {lang === 'am' ? 'ተመለስ' : 'Back'}
                      </button>
                      <button
                        className="btn btn-success"
                        onClick={handleDeposit}
                        disabled={depositLoading}
                        id="deposit-confirm"
                      >
                        {depositLoading ? (
                          <><span className="btn-spinner" /> {lang === 'am' ? 'በማስቀመጥ ላይ...' : 'Depositing...'}</>
                        ) : (
                          <><CheckCircle size={16} /> {lang === 'am' ? 'አረጋግጥ' : 'Confirm Deposit'}</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          WITHDRAW MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showWithdraw && (
        <div
          className="modal-overlay"
          onClick={() => { if (!withdrawSuccess) setShowWithdraw(false); }}
          role="dialog"
          aria-label="Withdraw money"
          aria-modal="true"
        >
          <div className="modal cd-modal scale-in" onClick={e => e.stopPropagation()}>
            {withdrawSuccess ? (
              <div style={{ padding: '50px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⏳</div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: 8, fontWeight: 700 }}>
                  {lang === 'am' ? 'ጥያቄ ቀርቧል' : 'Request Submitted'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {formatETB(parseFloat(withdrawAmount) || 0)} ETB{' '}
                  {lang === 'am' ? 'ወደ' : 'via'}{' '}
                  {withdrawMethod}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 12 }}>
                  {lang === 'am' ? 'አስተዳዳሪ ማጽደቅ ይጠብቃል' : 'Pending admin approval'}
                </p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h3>💸 {lang === 'am' ? 'ማውጣት' : 'Withdraw'}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowWithdraw(false)} aria-label="Close">✕</button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">{t.amount} (ETB)</label>
                    <input
                      type="number"
                      className="form-input cd-amount-input"
                      placeholder={t.enterAmount}
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      min="1"
                      id="withdraw-amount"
                      inputMode="decimal"
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      {lang === 'am' ? 'ሊወጣ ይችላል:' : 'Available:'} <strong>{formatETB(primaryWallet?.balance || 0)}</strong>
                    </div>
                  </div>

                  {/* Quick amounts */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {[100, 500, 1000, 5000].map(amt => (
                      <button
                        key={amt}
                        className={`cd-chip ${withdrawAmount === String(amt) ? 'selected' : ''}`}
                        onClick={() => { vibrate(); setWithdrawAmount(String(amt)); }}
                        disabled={amt > (primaryWallet?.balance || 0)}
                        style={{ opacity: amt > (primaryWallet?.balance || 0) ? 0.4 : 1 }}
                      >
                        {formatETB(amt)}
                      </button>
                    ))}
                  </div>

                  <div className="form-group">
                    <label className="form-label">{lang === 'am' ? 'የማውጣት ዘዴ' : 'Withdrawal Method'}</label>
                    <select
                      className="form-input form-select"
                      value={withdrawMethod}
                      onChange={e => setWithdrawMethod(e.target.value)}
                      id="withdraw-method"
                    >
                      <option value="TELEBIRR">{lang === 'am' ? 'ቴሌቢር' : 'Telebirr'}</option>
                      <option value="CBE_BIRR">{lang === 'am' ? 'ሲቢኢ ብር' : 'CBE Birr'}</option>
                      <option value="BANK_TRANSFER">{lang === 'am' ? 'የኢትዮጵያ ንግድ ባንክ' : 'CBE Bank Transfer'}</option>
                      <option value="AWASH_BANK">{lang === 'am' ? 'አዋሽ ባንክ' : 'Awash Bank'}</option>
                      <option value="DASHEN_BANK">{lang === 'am' ? 'ዳሽን ባንክ' : 'Dashen Bank'}</option>
                      <option value="ABYSSINIA_BANK">{lang === 'am' ? 'አቢሲንያ ባንክ' : 'Abyssinia Bank'}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{lang === 'am' ? 'ሂሳብ / ስልክ ቁጥር' : 'Account / Phone Number'}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={lang === 'am' ? 'ቁጥር ያስገቡ' : 'Enter account or phone number'}
                      value={withdrawAccount}
                      onChange={e => setWithdrawAccount(e.target.value)}
                      id="withdraw-account"
                    />
                  </div>

                  <div style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)',
                    borderRadius: 'var(--radius-md)', padding: 12,
                  }}>
                    <AlertCircle size={16} style={{ color: '#f97316', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                      {lang === 'am'
                        ? 'የማውጣት ጥያቄ አስተዳዳሪ ሊያጸድቅ ይጠብቃል።'
                        : 'Withdrawals require admin approval. Mobile money is instant; banks take 1–3 days.'}
                    </p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowWithdraw(false)} disabled={withdrawLoading}>
                    {t.cancel}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleWithdraw}
                    disabled={withdrawLoading || !withdrawAmount || !withdrawAccount}
                    id="withdraw-confirm"
                  >
                    {withdrawLoading ? <span className="btn-spinner" /> : (lang === 'am' ? 'አረጋግጥ' : 'Confirm')}
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
