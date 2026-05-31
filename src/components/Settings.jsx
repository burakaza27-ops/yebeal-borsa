import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Shield, Bell, Globe, RotateCcw,
  Save, Check, ChevronRight, Lock, Fingerprint, HelpCircle, MessageSquare
} from 'lucide-react';
import {
  getUser, updateUserProfile, updateNotifPreferences, setLanguage,
  initDB, formatDate, getTierInfo, TRANSLATIONS, syncWithBackend,
  getClientSupportTickets, createSupportTicket, changePassword
} from '../db';

export default function Settings({ onRefresh, lang }) {
  const [user, setUser] = useState(getUser());
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEnable2FA, setShowEnable2FA] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [otp2FA, setOtp2FA] = useState('');
  const [otp2FASent, setOtp2FASent] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('SUPPORT');
  const [ticketError, setTicketError] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(user.fullName);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editPhone, setEditPhone] = useState(user.phone);
  const [editAddress, setEditAddress] = useState(user.address || '');
  const [notifPrefs, setNotifPrefs] = useState(user.notifPreferences || {});
  const [selectedLang, setSelectedLang] = useState(user.language || 'en');


  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const tierInfo = getTierInfo(user.tier);

  const translateGender = (g) => {
    if (!g) return t.notSet;
    const map = {
      'male': lang === 'am' ? 'ወንድ' : 'Male',
      'female': lang === 'am' ? 'ሴት' : 'Female',
    };
    return map[g.toLowerCase()] || g;
  };

  const refresh = async () => {
    await syncWithBackend();
    setUser(getUser());
    if (onRefresh) onRefresh();
  };

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await getClientSupportTickets();
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'support') {
      fetchTickets();
    }
  }, [activeTab]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setTicketError('');
    setTicketSuccess(false);

    if (!ticketTitle.trim() || !ticketMessage.trim()) {
      setTicketError(lang === 'am' ? 'እባክዎ ርዕስ እና መልእክት ያስገቡ።' : 'Please fill in both title and message.');
      return;
    }

    try {
      await createSupportTicket(ticketTitle, ticketMessage, ticketCategory);
      setTicketSuccess(true);
      setTicketTitle('');
      setTicketMessage('');
      await fetchTickets();
      setTimeout(() => setTicketSuccess(false), 3000);
    } catch (err) {
      setTicketError(err.message || 'Failed to submit ticket');
    }
  };

  const handleSaveProfile = () => {
    updateUserProfile({
      fullName: editName, email: editEmail, phone: editPhone, address: editAddress
    });
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 2000);
    refresh();
  };

  const handleSaveNotifPrefs = () => {
    updateNotifPreferences(notifPrefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refresh();
  };

  const handleLanguageChange = (lng) => {
    setSelectedLang(lng);
    setLanguage(lng);
    refresh();
  };

  const handleResetData = () => {
    initDB(true);
    setShowResetConfirm(false);
    window.location.reload();
  };

  const toggleNotifPref = (key) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>{t.settings} ⚙️</h2>
        <p>{lang === 'am' ? 'የመገለጫ፣ ማሳወቂያ እና የመለያ ቅንብሮችዎን እዚህ ያስተዳድሩ' : 'Manage your profile, preferences, and account settings'}</p>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="toast-container">
          <div className="toast success">
            <Check size={18} color="var(--green)" />
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t.settingsSaved}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ maxWidth: 640, marginBottom: 24, flexWrap: 'wrap', gap: 6 }}>
        <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> {t.profile}
        </button>
        <button className={`tab ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> {t.notifPreferences}
        </button>
        <button className={`tab ${activeTab === 'language' ? 'active' : ''}`} onClick={() => setActiveTab('language')}>
          <Globe size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> {t.language}
        </button>
        <button className={`tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
          <Lock size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> {t.security}
        </button>
        <button className={`tab ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>
          <HelpCircle size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> {lang === 'am' ? 'እርዳታና ድጋፍ' : 'Help & Support'}
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
          {/* Profile card */}
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg, var(--green), var(--gold))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-inverse)'
              }}>
                {user.avatar}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{user.fullName}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user.fullNameAmharic}</div>
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${tierInfo.className === 'gold-tier' ? 'badge-tier-gold' : tierInfo.className === 'silver' ? 'badge-silver' : 'badge-bronze'}`}>
                  {tierInfo.icon} {tierInfo.label} {t.tierMember}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.faydaId}</span>
                <span style={{ fontWeight: 600 }}>{user.faydaId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.memberSince}</span>
                <span style={{ fontWeight: 600 }}>{formatDate(user.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.region}</span>
                <span style={{ fontWeight: 600 }}>{user.region === 'Addis Ababa' && lang === 'am' ? 'አዲስ አበባ' : user.region || 'Addis Ababa'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.gender}</span>
                <span style={{ fontWeight: 600 }}>{translateGender(user.gender)}</span>
              </div>
            </div>
          </div>

          {/* Edit form */}
          <div className="card">
            <div className="card-header">
              <h3>📝 {t.editProfile}</h3>
              {!editMode ? (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>{t.edit}</button>
              ) : (
                <button className="btn btn-success btn-sm" onClick={handleSaveProfile}>
                  <Save size={14} /> {t.save}
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t.fullName}</label>
              <input type="text" className="form-input" value={editName} onChange={e => setEditName(e.target.value)} disabled={!editMode} id="settings-name" />
            </div>
            <div className="form-group">
              <label className="form-label">{t.email}</label>
              <input type="email" className="form-input" value={editEmail} onChange={e => setEditEmail(e.target.value)} disabled={!editMode} id="settings-email" />
            </div>
            <div className="form-group">
              <label className="form-label">{t.phoneNumber}</label>
              <input type="tel" className="form-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} disabled={!editMode} id="settings-phone" />
            </div>
            <div className="form-group">
              <label className="form-label">{t.address}</label>
              <input type="text" className="form-input" value={editAddress} onChange={e => setEditAddress(e.target.value)} disabled={!editMode} placeholder={lang === 'am' ? 'ለምሳሌ፡ ቦሌ ክፍለ ከተማ፣ ወረዳ 03' : 'e.g., Bole Sub-City, Woreda 03'} id="settings-address" />
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-header">
            <h3>🔔 {t.notifPreferences}</h3>
            <button className="btn btn-success btn-sm" onClick={handleSaveNotifPrefs}>
              <Save size={14} /> {t.save}
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
            {t.chooseNotifsToReceive}
          </p>

          {[
            { key: 'deposits', label: t.depositConfirmations, desc: t.notifDepositDesc, icon: '💰' },
            { key: 'holidays', label: t.holidayReminders, desc: t.notifHolidayDesc, icon: '🎄' },
            { key: 'delivery', label: t.deliveryUpdates, desc: t.notifDeliveryDesc, icon: '🚚' },
            { key: 'system', label: t.systemAnnouncements, desc: t.notifSystemDesc, icon: '📢' },
            { key: 'promotions', label: t.promotionalOffers, desc: t.notifPromotionsDesc, icon: '🏷️' },
          ].map(item => (
            <div key={item.key} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
              borderBottom: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
              <button
                onClick={() => toggleNotifPref(item.key)}
                style={{
                  width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: notifPrefs[item.key] !== false ? 'var(--green)' : 'var(--bg-elevated)',
                  position: 'relative', transition: 'all var(--transition-fast)'
                }}
                aria-label={`Toggle ${item.label}`}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 3,
                  left: notifPrefs[item.key] !== false ? 23 : 3,
                  transition: 'all var(--transition-fast)',
                  boxShadow: '0 1px 3px hsla(0,0%,0%,0.2)'
                }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Language Tab */}
      {activeTab === 'language' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-header">
            <h3>🌍 {t.language}</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
            {t.selectLanguageDesc}
          </p>

          {[
            { key: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
            { key: 'am', label: 'Amharic', native: 'አማርኛ', flag: '🇪🇹' },
          ].map(lng => (
            <button
              key={lng.key}
              className={`btn ${selectedLang === lng.key ? 'btn-primary' : 'btn-secondary'} btn-block`}
              onClick={() => handleLanguageChange(lng.key)}
              style={{ justifyContent: 'flex-start', marginBottom: 10, padding: '16px 20px' }}
            >
              <span style={{ fontSize: '1.5rem', marginRight: 12 }}>{lng.flag}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>{lng.native}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>{lng.label}</div>
              </div>
              {selectedLang === lng.key && <Check size={18} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: 600 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>🔒 {lang === 'am' ? 'የደህንነት ቅንብሮች' : 'Security Settings'}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div className="flex items-center gap-3">
                  <Lock size={18} color="var(--blue)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.changePassword}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.changePasswordDesc}</div>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowChangePassword(true); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); setPwdError(''); setPwdSuccess(false); }}>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div className="flex items-center gap-3">
                  <Fingerprint size={18} color="var(--purple)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.biometricAuth}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.biometricAuthDesc}</div>
                  </div>
                </div>
                <span className="badge badge-muted">{t.mobileOnly}</span>
              </div>

              <div className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div className="flex items-center gap-3">
                  <Shield size={18} color="var(--green)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.twoFactorAuth}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.twoFactorAuthDesc}</div>
                  </div>
                </div>
                {twoFAEnabled ? (
                  <span className="badge badge-green"><Check size={10} /> {lang === 'am' ? 'ነቅቷል' : 'Enabled'}</span>
                ) : (
                  <button className="btn btn-success btn-sm" onClick={() => { setShowEnable2FA(true); setOtp2FA(''); setOtp2FASent(false); }}>{lang === 'am' ? 'አንቃ' : 'Enable'}</button>
                )}
              </div>

              <div className="flex items-center justify-between" style={{ padding: '12px 0' }}>
                <div className="flex items-center gap-3">
                  <User size={18} color="var(--gold)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.activeSessions}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.activeSessionsDesc}</div>
                  </div>
                </div>
                <span className="badge badge-gold">{t.activeCount}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ borderColor: 'var(--red-dim)' }}>
            <div className="card-header">
              <h3 style={{ color: 'var(--red)' }}>⚠️ {t.dangerZone}</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              {t.resetAppDesc}
            </p>
            <button className="btn btn-danger" onClick={() => setShowResetConfirm(true)}>
              <RotateCcw size={14} /> {t.resetData}
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal scale-in" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--red)' }}>{t.resetAllDataQuestion}</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t.resetAllDataDesc}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowResetConfirm(false)}>{t.cancel}</button>
              <button className="btn btn-danger" onClick={handleResetData}>
                <RotateCcw size={14} /> {t.confirmReset}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
          <div className="modal scale-in" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            {pwdSuccess ? (
              <div style={{ padding: '50px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                <h3 style={{ marginBottom: 8 }}>{t.passwordChangedTitle}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{t.passwordChangedDesc}</p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h3>🔑 {t.changePassword}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowChangePassword(false)}>✕</button>
                </div>
                <div className="modal-body">
                  {pwdError && (
                    <div style={{ background: 'var(--red-soft)', border: '1px solid hsla(0,72%,55%,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--red)' }}>
                      ⚠️ {pwdError}
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">{t.currentPassword}</label>
                    <input type="password" className="form-input" placeholder={t.enterCurrentPassword} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} id="current-pwd" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{lang === 'am' ? 'አዲስ የይለፍ ቃል' : 'New Password'}</label>
                    <input type="password" className="form-input" placeholder={t.minCharacters} value={newPwd} onChange={e => setNewPwd(e.target.value)} id="new-pwd" />
                    {newPwd.length > 0 && newPwd.length < 8 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--red)' }}>{t.passwordMustBe8Char}</span>
                    )}
                    {newPwd.length >= 8 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--green-bright)' }}>{t.strongPassword}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t.confirmNewPassword}</label>
                    <input type="password" className="form-input" placeholder={t.reenterNewPassword} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} id="confirm-pwd" />
                    {confirmPwd.length > 0 && confirmPwd !== newPwd && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--red)' }}>{t.passwordsDoNotMatch}</span>
                    )}
                    {confirmPwd.length > 0 && confirmPwd === newPwd && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--green-bright)' }}>{t.passwordsMatch}</span>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowChangePassword(false)}>{t.cancel}</button>
                  <button className="btn btn-primary" onClick={async () => {
                    setPwdError('');
                    if (!currentPwd) { setPwdError(lang === 'am' ? 'እባክዎ የአሁኑን የይለፍ ቃልዎን ያስገቡ።' : 'Please enter your current password.'); return; }
                    if (newPwd.length < 8) { setPwdError(lang === 'am' ? 'አዲሱ የይለፍ ቃል ቢያንስ 8 ቁምፊዎች መሆን አለበት።' : 'New password must be at least 8 characters.'); return; }
                    if (newPwd !== confirmPwd) { setPwdError(lang === 'am' ? 'የይለፍ ቃላቱ አይዛመዱም።' : 'Passwords do not match.'); return; }
                    try {
                      await changePassword(currentPwd, newPwd);
                      setPwdSuccess(true);
                      setTimeout(() => { setShowChangePassword(false); setPwdSuccess(false); }, 2000);
                    } catch (err) {
                      setPwdError(err.message || 'Failed to update password.');
                    }
                  }}>
                    <Lock size={14} /> {t.updatePasswordLabel}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Enable 2FA Modal */}
      {showEnable2FA && (
        <div className="modal-overlay" onClick={() => setShowEnable2FA(false)}>
          <div className="modal scale-in" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🛡️ {t.enable2faTitle}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEnable2FA(false)}>✕</button>
            </div>
            <div className="modal-body">
              {!otp2FASent ? (
                <>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    {lang === 'am' ? `ባለአንድ ጊዜ ማረጋገጫ ኮድ ወደ ስልክ ቁጥርዎ እንልካለን: ` : `We will send a one-time verification code to your registered phone number `}<strong style={{ color: 'var(--text-primary)' }}>{user.phone}</strong>.
                  </p>
                  <button className="btn btn-primary btn-block" onClick={() => setOtp2FASent(true)}>
                    <Phone size={16} /> {t.sendVerificationCode}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.82rem', color: 'var(--green-bright)', marginBottom: 16 }}>
                    {t.otpSentTo}: {user.phone}
                  </p>
                  <div className="form-group">
                    <label className="form-label">{t.enter6DigitCode}</label>
                    <input type="text" className="form-input" placeholder="000000" maxLength={6} value={otp2FA} onChange={e => setOtp2FA(e.target.value.replace(/\D/g, ''))} id="otp-2fa" style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '6px' }} />
                  </div>
                  <button className="btn btn-success btn-block" disabled={otp2FA.length < 6} onClick={() => {
                    setTwoFAEnabled(true);
                    setShowEnable2FA(false);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}>
                    <Shield size={16} /> {t.verifyEnable2fa}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Support Tab */}
      {activeTab === 'support' && (
        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
          {/* Ticket List */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>🎫 {lang === 'am' ? 'የድጋፍ ትኬቶች' : 'Support Tickets & Claims'}</h3>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => { setShowNewTicket(true); setTicketTitle(''); setTicketMessage(''); setTicketCategory('SUPPORT'); setTicketError(''); setTicketSuccess(false); }}
              >
                {lang === 'am' ? 'አዲስ ትኬት ፍጠር' : 'New Ticket'}
              </button>
            </div>
            
            {loadingTickets ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <span className="spinner-sm" />
                <span style={{ marginLeft: 8, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  {lang === 'am' ? 'ትኬቶች በመጫን ላይ...' : 'Loading tickets...'}
                </span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 10px' }}>
                <div className="empty-state-icon">🎫</div>
                <h4>{lang === 'am' ? 'ምንም የድጋፍ ትኬት የለም' : 'No Tickets Opened'}</h4>
                <p style={{ fontSize: '0.8rem' }}>
                  {lang === 'am' ? 'ማንኛውም ጥያቄ ወይም የኢንሹራንስ ካሳ ጥያቄ ካለዎት አዲስ ትኬት መፍጠር ይችላሉ።' : 'If you have any questions or insurance claims, you can submit a ticket.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
                {tickets.map(ticket => (
                  <div key={ticket.id} style={{
                    padding: 14, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 6
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ticket.title}</div>
                      <span className={`badge ${ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.65rem' }}>
                        {ticket.status === 'RESOLVED' ? (lang === 'am' ? 'ተፈቷል' : 'Resolved') : ticket.status === 'CLOSED' ? (lang === 'am' ? 'ተዘግቷል' : 'Closed') : (lang === 'am' ? 'በመጠባበቅ ላይ' : 'Open')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{ticket.message}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>
                        {ticket.category === 'INSURANCE_CLAIM' 
                          ? (lang === 'am' ? '🛡️ የኢንሹራንስ ጥያቄ' : '🛡️ Insurance Claim') 
                          : (lang === 'am' ? '💬 የቴክኒክ ድጋፍ' : '💬 Support')}
                      </span>
                      <span>{formatDate(ticket.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Ticket Form Modal */}
          {showNewTicket && (
            <div className="modal-overlay" onClick={() => setShowNewTicket(false)}>
              <div className="modal scale-in" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>🎫 {lang === 'am' ? 'አዲስ የድጋፍ ትኬት መፍጠሪያ' : 'Open Support Ticket'}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowNewTicket(false)}>✕</button>
                </div>
                <form onSubmit={handleSubmitTicket}>
                  <div className="modal-body">
                    {ticketSuccess && (
                      <div style={{ background: 'var(--green-soft)', border: '1px solid hsla(120,72%,45%,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--green-bright)' }}>
                        ✓ {lang === 'am' ? 'ትኬትዎ በተሳካ ሁኔታ ተፈጥሯል!' : 'Ticket submitted successfully!'}
                      </div>
                    )}
                    {ticketError && (
                      <div style={{ background: 'var(--red-soft)', border: '1px solid hsla(0,72%,55%,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--red)' }}>
                        ⚠️ {ticketError}
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">{lang === 'am' ? 'ክፍል / ዘርፍ' : 'Category'}</label>
                      <select 
                        className="form-input form-select" 
                        value={ticketCategory} 
                        onChange={e => setTicketCategory(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                      >
                        <option value="SUPPORT">{lang === 'am' ? 'የቴክኒክ ድጋፍ (General Support)' : 'General Support'}</option>
                        <option value="INSURANCE_CLAIM">{lang === 'am' ? 'የኢንሹራንስ ካሳ ጥያቄ (Insurance Claim)' : 'Insurance Claim'}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{lang === 'am' ? 'ርዕስ' : 'Subject / Title'}</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder={lang === 'am' ? 'ርዕስ እዚህ ይጻፉ...' : 'Enter subject...'} 
                        value={ticketTitle} 
                        onChange={e => setTicketTitle(e.target.value)} 
                        id="ticket-title"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{lang === 'am' ? 'ዝርዝር መልእክት' : 'Detailed Message'}</label>
                      <textarea 
                        className="form-input" 
                        rows={4} 
                        placeholder={lang === 'am' ? 'ጥያቄዎን ወይም ችግርዎን እዚህ በዝርዝር ይግለጹ...' : 'Describe your question or issue in detail...'} 
                        value={ticketMessage} 
                        onChange={e => setTicketMessage(e.target.value)} 
                        style={{ resize: 'none', padding: 12 }}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowNewTicket(false)}>{t.cancel}</button>
                    <button type="submit" className="btn btn-primary">
                      {lang === 'am' ? 'ትኬት አስገባ' : 'Submit Ticket'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

