import { useState } from 'react';
import {
  Calendar, Target, ChevronRight, Plus, CheckCircle, X, Trash2
} from 'lucide-react';
import {
  getHolidays, getCustomerHolidays, addCustomerHoliday, depositToHoliday,
  cancelHolidayGoal, getWallets, formatETB, daysUntil, ANIMAL_EMOJIS, ANIMAL_TYPES,
  TRANSLATIONS, syncWithBackend
} from '../db';

export default function HolidayPlanner({ onRefresh, lang, showToast }) {
  const [holidays, setHolidays] = useState(getHolidays());
  const [customerHolidays, setCustomerHolidays] = useState(getCustomerHolidays());
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [joinTarget, setJoinTarget] = useState('');
  const [joinAnimal, setJoinAnimal] = useState('sheep');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('Telebirr');
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const translateAnimal = (type) => lang === 'am' ? { sheep: 'በግ', goat: 'ፍየል', cattle: 'ከብት', hen: 'ዶሮ', kircha: 'ኪርቻ' }[type] || type : type;

  const refresh = async () => {
    await syncWithBackend();
    setHolidays(getHolidays());
    setCustomerHolidays(getCustomerHolidays());
    if (onRefresh) onRefresh();
  };

  const enriched = holidays.map(h => {
    const ch = customerHolidays.find(c => c.holidayId === h.id && c.status === 'active');
    const days = daysUntil(h.deadline);
    const pct = ch ? Math.min(100, Math.round((ch.currentAmount / ch.targetAmount) * 100)) : 0;
    return { ...h, ch, days, pct };
  }).sort((a, b) => a.days - b.days);

  const handleJoin = (holiday) => {
    setSelectedHoliday(holiday);
    setJoinTarget(String(holiday.minimumDeposit));
    setJoinAnimal(holiday.animalTypes[0] || 'sheep');
    setShowJoinModal(true);
  };

  const confirmJoin = async () => {
    if (!selectedHoliday) return;
    const target = parseFloat(joinTarget);
    if (!target || target < selectedHoliday.minimumDeposit) {
      const msg = lang === 'am'
        ? `አነስተኛው የግብ መጠን ${selectedHoliday.minimumDeposit.toLocaleString()} ብር መሆን አለበት።`
        : `Minimum target amount must be at least ${selectedHoliday.minimumDeposit.toLocaleString()} ETB.`;
      if (showToast) showToast(msg, 'warning');
      else alert(msg);
      return;
    }
    setLoading(true);
    try {
      await addCustomerHoliday(selectedHoliday.id, target, joinAnimal);
      setShowJoinModal(false);
      if (showToast) {
        showToast(
          lang === 'am' ? 'የበዓል ቁጠባ ግብ በተሳካ ሁኔታ ተጀምሯል! 🎯' : 'Holiday savings goal started successfully! 🎯',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to join goal', 'error');
      else alert(err.message || 'Failed to join goal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = (holiday) => {
    setSelectedHoliday(holiday);
    setDepositAmount('');
    setDepositMethod('Telebirr');
    setDepositSuccess(false);
    setShowDepositModal(true);
  };

  const confirmDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0 || !selectedHoliday || !selectedHoliday.ch) return;
    setLoading(true);
    try {
      await depositToHoliday(selectedHoliday.ch.id, amount, depositMethod);
      setDepositSuccess(true);
      if (showToast) {
        showToast(
          lang === 'am' ? 'ገንዘብ በተሳካ ሁኔታ ተቀምጧል!' : 'Deposit successful!',
          'success'
        );
      }
      setTimeout(() => {
        setShowDepositModal(false);
        setDepositSuccess(false);
        refresh();
      }, 1500);
    } catch (err) {
      if (showToast) showToast(err.message || 'Deposit failed', 'error');
      else alert(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelGoal = async (chId) => {
    setLoading(true);
    try {
      await cancelHolidayGoal(chId);
      setShowCancelConfirm(null);
      if (showToast) {
        showToast(
          lang === 'am' ? 'የበዓል ቁጠባ ግብ ተሰርዟል።' : 'Holiday savings goal cancelled.',
          'warning'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to cancel goal', 'error');
      else alert(err.message || 'Failed to cancel goal');
    } finally {
      setLoading(false);
    }
  };

  const getCountdown = (days) => {
    const d = Math.floor(days);
    const months = Math.floor(d / 30);
    const remainDays = d % 30;
    const weeks = Math.floor(remainDays / 7);
    const finalDays = remainDays % 7;
    return { months, weeks, days: finalDays };
  };

  const wallets = getWallets();
  const primary = wallets.find(w => !w.isFamily);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>{t.holidayPlanner} 🎄</h2>
        <p>{lang === 'am' ? 'ለሚመጡት የኢትዮጵያ በዓላት የቁጠባ ግቦችን ያዘጋጁ እና ሂደቱን ይከታተሉ' : 'Set savings goals for upcoming Ethiopian holidays and track your progress'}</p>
      </div>

      {/* Holiday Cards Grid */}
      <div className="grid-2" style={{ gap: 20 }}>
        {enriched.map(h => {
          const cd = getCountdown(h.days);
          const joined = !!h.ch;

          return (
            <div key={h.id} className={`holiday-card ${h.color}`}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.5rem'
                  }}>
                    {h.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{h.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{h.nameEn}</div>
                  </div>
                </div>
                {joined ? (
                  <span className="badge badge-green"><CheckCircle size={10} /> {lang === 'am' ? 'ተቀላቅለዋል' : 'Joined'}</span>
                ) : (
                  <span className="badge badge-muted">{lang === 'am' ? 'አልተቀላቀሉም' : 'Not joined'}</span>
                )}
              </div>

              {/* Countdown */}
              <div className="holiday-countdown">
                <div className="countdown-unit">
                  <div className="value">{cd.months}</div>
                  <div className="label">{t.months}</div>
                </div>
                <div className="countdown-unit">
                  <div className="value">{cd.weeks}</div>
                  <div className="label">{t.weeks}</div>
                </div>
                <div className="countdown-unit">
                  <div className="value">{cd.days}</div>
                  <div className="label">{t.days}</div>
                </div>
              </div>

              {/* Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, fontSize: '0.82rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{t.deadline}</div>
                  <div style={{ fontWeight: 600 }}>{new Date(h.deadline).toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{t.minDeposit}</div>
                  <div style={{ fontWeight: 600, color: 'var(--gold)' }}>{formatETB(h.minimumDeposit)}</div>
                </div>
              </div>

              {/* Animal Types */}
              <div style={{ marginTop: 12 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 6 }}>{t.availableAnimals}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {h.animalTypes.map(type => (
                    <span key={type} className="badge badge-muted" style={{ textTransform: 'capitalize' }}>
                      {ANIMAL_EMOJIS[type]} {translateAnimal(type)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progress (if joined) */}
              {joined && (
                <div style={{ marginTop: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                  <div className="flex justify-between" style={{ marginBottom: 6, fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t.savingsProgress}</span>
                    <span style={{ fontWeight: 700, color: h.pct >= 100 ? 'var(--green-bright)' : 'var(--gold)' }}>{h.pct}%</span>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 8 }}>
                    <div className={`progress-fill ${h.pct >= 100 ? 'green' : 'gold'}`} style={{ width: `${h.pct}%` }} />
                  </div>
                  <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{formatETB(h.ch.currentAmount)} / {formatETB(h.ch.targetAmount)}</span>
                    <span>{ANIMAL_EMOJIS[h.ch.animalPreference]} {translateAnimal(h.ch.animalPreference)}</span>
                  </div>
                  {h.pct >= 100 && (
                    <div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.82rem', color: 'var(--green-bright)', fontWeight: 600 }}>
                      {t.goalReachedCelebration}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                {joined ? (
                  <>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleDeposit(h)}>
                      <Plus size={14} /> {t.deposit}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={() => setShowCancelConfirm(h.ch.id)}
                      title={t.cancelGoal}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => handleJoin(h)}>
                    <Target size={14} /> {t.setGoal}
                  </button>
                )}
                <button className="btn btn-secondary btn-sm">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Join Modal */}
      {showJoinModal && selectedHoliday && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎯 {t.setSavingsGoal}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowJoinModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '2rem' }}>{selectedHoliday.icon}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedHoliday.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {t.deadline}: {new Date(selectedHoliday.deadline).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t.targetAmountEtb}</label>
                <input type="number" className="form-input" value={joinTarget} onChange={e => setJoinTarget(e.target.value)} min={selectedHoliday.minimumDeposit} id="join-target" onKeyDown={e => { if (['e', 'E', '-', '+', '.'].includes(e.key)) e.preventDefault(); }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.minimum}: {formatETB(selectedHoliday.minimumDeposit)}</span>
              </div>

              <div className="form-group">
                <label className="form-label">{t.animalPreference}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {selectedHoliday.animalTypes.map(type => (
                    <button key={type} className={`btn ${joinAnimal === type ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setJoinAnimal(type)} style={{ justifyContent: 'center', textTransform: 'capitalize' }}>
                      {ANIMAL_EMOJIS[type]} {translateAnimal(type)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowJoinModal(false)} disabled={loading}>{t.cancel}</button>
              <button className="btn btn-success" onClick={confirmJoin} id="join-confirm" disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn-spinner" /> {lang === 'am' ? 'በማዘጋጀት ላይ...' : 'Setting goal...'}
                  </>
                ) : (
                  <>
                    <Target size={16} /> {t.setGoal}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal — now targets specific holiday */}
      {showDepositModal && selectedHoliday && (
        <div className="modal-overlay" onClick={() => !depositSuccess && setShowDepositModal(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            {depositSuccess ? (
              <div style={{ padding: '50px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>{t.deposited}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {formatETB(parseFloat(depositAmount) || 0)} {t.addedTo} {selectedHoliday.name}
                </p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h3>💰 {t.deposit} {lang === 'am' ? 'ለ' : 'for'} {selectedHoliday.name}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowDepositModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.5rem' }}>{selectedHoliday.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{selectedHoliday.name}</div>
                      {selectedHoliday.ch && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatETB(selectedHoliday.ch.currentAmount)} / {formatETB(selectedHoliday.ch.targetAmount)} {t.saved}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t.amount} (ETB)</label>
                    <input type="number" className="form-input" placeholder={t.enterAmount} value={depositAmount} onChange={e => setDepositAmount(e.target.value)} min="1" id="holiday-deposit-amount" onKeyDown={e => { if (['e', 'E', '-', '+', '.'].includes(e.key)) e.preventDefault(); }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.walletBalance}: {formatETB(primary?.balance || 0)}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t.paymentMethod}</label>
                    <select className="form-input form-select" value={depositMethod} onChange={e => setDepositMethod(e.target.value)}>
                      <option value="Telebirr">{t.telebirr}</option>
                      <option value="CBE Birr">{t.cbeBirr}</option>
                      <option value="Bank Transfer">{lang === 'am' ? 'ባንክ ማስተላለፍ' : 'Bank Transfer'}</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[500, 1000, 2000].map(amt => (
                      <button key={amt} className="btn btn-secondary btn-sm" style={{ justifyContent: 'center' }} onClick={() => setDepositAmount(String(amt))}>
                        {formatETB(amt)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowDepositModal(false)} disabled={loading}>{t.cancel}</button>
                  <button className="btn btn-success" onClick={confirmDeposit} disabled={loading}>
                    {loading ? (
                      <>
                        <span className="btn-spinner" /> {lang === 'am' ? 'በማስቀመጥ ላይ...' : 'Depositing...'}
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> {t.deposit}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel Goal Confirmation */}
      {showCancelConfirm && (
        <div className="modal-overlay" onClick={() => setShowCancelConfirm(null)}>
          <div className="modal scale-in" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 style={{ color: 'var(--red)' }}>{t.cancelGoalQuestion}</h3></div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t.cancelGoalDesc}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCancelConfirm(null)} disabled={loading}>{t.cancel}</button>
              <button className="btn btn-danger" onClick={() => handleCancelGoal(showCancelConfirm)} disabled={loading}>
                {loading ? (
                  <>
                    <span className="btn-spinner" /> {lang === 'am' ? 'በመሰረዝ ላይ...' : 'Cancelling...'}
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> {t.removeGoal}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
