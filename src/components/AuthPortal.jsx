import { useState, useEffect } from 'react';
import { Shield, Phone, Lock, Eye, EyeOff, CheckCircle, User, Fingerprint, ScanLine, ArrowRight, MapPin, Sparkles, Calendar, Mail } from 'lucide-react';
import { setLoggedIn, registerUser, TRANSLATIONS, getHolidays } from '../db';

export default function AuthPortal({ onLogin, lang = 'en', showToast }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [mode, setMode] = useState('login'); // login | register
  const [phone, setPhone] = useState('+251911234567');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [showFayda, setShowFayda] = useState(false);
  const [faydaStep, setFaydaStep] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration multi-step state
  const [regStep, setRegStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCity, setRegCity] = useState('Addis Ababa');
  const [regFaydaId, setRegFaydaId] = useState('');
  const [regHolidayId, setRegHolidayId] = useState('');
  const [regHolidayAmount, setRegHolidayAmount] = useState('');
  const [regHolidayPreference, setRegHolidayPreference] = useState('sheep');

  const activeHolidays = getHolidays() || [];

  // Set default holiday on load if available
  useEffect(() => {
    if (activeHolidays.length > 0 && !regHolidayId) {
      setRegHolidayId(activeHolidays[0].id);
      setRegHolidayAmount(activeHolidays[0].minimumDeposit.toString());
    }
  }, [activeHolidays, regHolidayId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setLoggedIn(true, phone, password);
      onLogin();
      if (showToast) showToast(lang === 'am' ? 'በድል ተገብቷል ✓' : 'Login successful ✓', 'success');
    } catch (err) {
      if (showToast) {
        showToast(err.message || (lang === 'am' ? 'መግባት አልተሳካም። እባክዎ መለያዎን ያረጋግጡ።' : 'Login failed. Please verify credentials.'), 'error');
      } else {
        alert(err.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName || !regPhone || !regPassword) {
      if (showToast) {
        showToast(lang === 'am' ? 'እባክዎ ሁሉንም መስኮች ይሙሉ' : 'Please fill in all fields.', 'warning');
      } else {
        alert('Please fill in all fields.');
      }
      return;
    }

    setLoading(true);
    try {
      await registerUser(regPhone, regName, regPassword, {
        email: regEmail,
        faydaId: regFaydaId,
        region: 'Addis Ababa',
        city: regCity,
        holidayId: regHolidayId,
        holidayTargetAmount: regHolidayAmount ? parseFloat(regHolidayAmount) : null,
        holidayAnimalPreference: regHolidayPreference
      });
      onLogin();
      if (showToast) showToast(lang === 'am' ? 'ምዝገባው በስኬት ተጠናቋል ✓' : 'Registration successful ✓', 'success');
    } catch (err) {
      if (showToast) {
        showToast(err.message || (lang === 'am' ? 'ምዝገባው አልተሳካም። እባክዎ መረጃውን ያረጋግጡ።' : 'Registration failed. Please check your data.'), 'error');
      } else {
        alert(err.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFaydaVerify = () => {
    setShowFayda(true);
    setFaydaStep(0);
  };

  const advanceFayda = () => {
    if (faydaStep < 3) {
      setFaydaStep(faydaStep + 1);
    } else {
      setShowFayda(false);
      if (mode === 'register') {
        setRegFaydaId('FID-2024-893421');
        setRegStep(5); // Advance to holiday selection
      } else {
        setLoggedIn(true);
        onLogin();
      }
    }
  };

  const handleSendOTP = () => {
    setOtpSent(true);
  };

  const faydaSteps = [
    { label: lang === 'am' ? 'ማንነት' : 'Identity', icon: <User size={14} /> },
    { label: lang === 'am' ? 'ባዮሜትሪክስ' : 'Biometrics', icon: <Fingerprint size={14} /> },
    { label: lang === 'am' ? 'መቃኘት' : 'Scan', icon: <ScanLine size={14} /> },
    { label: lang === 'am' ? 'ተጠናቋል' : 'Complete', icon: <CheckCircle size={14} /> }
  ];

  return (
    <div className="auth-container">
      <div className="auth-bg" />

      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">🐑</div>
          <h1>{lang === 'am' ? 'የበአል ቦርሳ' : 'Yebeal Borsa'}</h1>
          <p>{t.livestockSavingsMarket}</p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">{t.phoneNumber}</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  placeholder="+251 9XX XXX XXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  id="login-phone"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t.password}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  placeholder={t.enterPassword}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
              id="login-submit"
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="btn-spinner" /> {t.signIn}...
                </span>
              ) : (
                <>{t.signIn}</>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleSendOTP}>
                {t.forgotPassword}
              </button>
            </div>

            <div className="auth-divider">{t.orContinue}</div>

            <button type="button" className="fayda-btn" onClick={handleFaydaVerify} id="fayda-login">
              <Shield size={20} />
              {t.signInWithFayda}
            </button>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t.dontHaveAccount} {' '}
                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit' }} onClick={() => setMode('register')}>
                  {t.createAccount}
                </button>
              </span>
            </div>
          </form>
        ) : (
          <div className="registration-wizard">
            {/* Step Indicators */}
            <div className="reg-steps-indicator" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ color: regStep >= 1 ? 'var(--gold)' : 'inherit', fontWeight: regStep === 1 ? 'bold' : 'normal' }}>1. {lang === 'am' ? 'መረጃ' : 'Info'}</span>
              <span style={{ color: regStep >= 2 ? 'var(--gold)' : 'inherit', fontWeight: regStep === 2 ? 'bold' : 'normal' }}>2. {lang === 'am' ? 'ማረጋገጫ' : 'Verify'}</span>
              <span style={{ color: regStep >= 3 ? 'var(--gold)' : 'inherit', fontWeight: regStep === 3 ? 'bold' : 'normal' }}>3. {lang === 'am' ? 'ከተማ' : 'City'}</span>
              <span style={{ color: regStep >= 4 ? 'var(--gold)' : 'inherit', fontWeight: regStep === 4 ? 'bold' : 'normal' }}>4. {lang === 'am' ? 'ፋይዳ' : 'Fayda'}</span>
              <span style={{ color: regStep >= 5 ? 'var(--gold)' : 'inherit', fontWeight: regStep === 5 ? 'bold' : 'normal' }}>5. {lang === 'am' ? 'ግብ' : 'Goal'}</span>
            </div>

            {regStep === 1 && (
              <div className="fade-in">
                <div className="form-group">
                  <label className="form-label">{t.fullName}</label>
                  <input type="text" className="form-input" placeholder={t.enterFullName} value={regName} onChange={e => setRegName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.phoneNumber}</label>
                  <input type="tel" className="form-input" placeholder="+251 9XX XXX XXX" value={regPhone} onChange={e => setRegPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ኢሜይል (ከተፈለገ)' : 'Email Address (Optional)'}</label>
                  <input type="email" className="form-input" placeholder="name@email.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>
                <button
                  className="btn btn-primary btn-block btn-lg"
                  onClick={() => {
                    if (!regName || !regPhone) {
                      showToast(lang === 'am' ? 'እባክዎ ስም እና ስልክ ቁጥር ያስገቡ' : 'Please enter name and phone number.', 'warning');
                      return;
                    }
                    setOtpSent(true);
                    setRegStep(2);
                  }}
                >
                  {lang === 'am' ? 'ቀጥል' : 'Continue'} <ArrowRight size={16} />
                </button>
              </div>
            )}

            {regStep === 2 && (
              <div className="fade-in">
                <div className="form-group">
                  <label className="form-label">{t.enterOtp}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t.otpCodePlaceholder}
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    maxLength={6}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--green-bright)' }}>
                    {t.otpSentMsg}
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.createPassword}</label>
                  <input type="password" className="form-input" placeholder={t.minCharacters} value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setRegStep(1)}>{lang === 'am' ? 'ተመለስ' : 'Back'}</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (!otp || !regPassword) {
                        showToast(lang === 'am' ? 'እባክዎ የአንድ ጊዜ የይለፍ ቃል እና አዲስ የይለፍ ቃል ያስገቡ' : 'Please fill OTP and password.', 'warning');
                        return;
                      }
                      if (regPassword.length < 8) {
                        showToast(lang === 'am' ? 'የይለፍ ቃል ቢያንስ 8 ፊደላት መሆን አለበት' : 'Password must be at least 8 characters.', 'warning');
                        return;
                      }
                      setRegStep(3);
                    }}
                  >
                    {lang === 'am' ? 'አረጋግጥ' : 'Verify'}
                  </button>
                </div>
              </div>
            )}

            {regStep === 3 && (
              <div className="fade-in">
                <div className="form-group">
                  <label className="form-label"><MapPin size={14} style={{ marginRight: 4, display: 'inline' }} /> {lang === 'am' ? 'የሚኖሩበት ከተማ / ክልል' : 'Select City / Location'}</label>
                  <select className="form-input" value={regCity} onChange={e => setRegCity(e.target.value)}>
                    <option value="Addis Ababa">Addis Ababa (አዲስ አበባ)</option>
                    <option value="Adama">Adama (አዳማ)</option>
                    <option value="Hawassa">Hawassa (ሐዋሳ)</option>
                    <option value="Bahir Dar">Bahir Dar (ባህር ዳር)</option>
                    <option value="Mekelle">Mekelle (መቀሌ)</option>
                    <option value="Dire Dawa">Dire Dawa (ድሬዳዋ)</option>
                    <option value="Gondar">Gondar (ጎንደር)</option>
                    <option value="Jimma">Jimma (ጅማ)</option>
                    <option value="Bishoftu">Bishoftu (ቢሾፍቱ)</option>
                    <option value="Dessie">Dessie (ደሴ)</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setRegStep(2)}>{lang === 'am' ? 'ተመለስ' : 'Back'}</button>
                  <button className="btn btn-primary" onClick={() => setRegStep(4)}>{lang === 'am' ? 'ቀጥል' : 'Next'}</button>
                </div>
              </div>
            )}

            {regStep === 4 && (
              <div className="fade-in" style={{ textAlign: 'center' }}>
                <div style={{ padding: '10px 0', marginBottom: 16 }}>
                  <Shield size={40} style={{ color: 'var(--gold)', margin: '0 auto 12px' }} />
                  <h4>{lang === 'am' ? 'የፋይዳ ዲጂታል መታወቂያ (አማራጭ)' : 'Fayda Digital ID (Optional)'}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 8 }}>
                    {lang === 'am' ? 'የፋይዳ ብሄራዊ መታወቂያዎን በማገናኘት ቁጠባዎን የበለጠ ደህንነቱ የተጠበቀ ያድርጉ።' : 'Secure your wallet and increase limits by linking your national digital ID.'}
                  </p>
                </div>

                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">{t.faydaId}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="FID-YYYY-XXXXXXXX"
                    value={regFaydaId}
                    onChange={e => setRegFaydaId(e.target.value)}
                  />
                </div>

                <button type="button" className="fayda-btn btn-block" style={{ marginBottom: 20 }} onClick={handleFaydaVerify}>
                  <Fingerprint size={18} />
                  {lang === 'am' ? 'በፋይዳ ሲሙሌተር አረጋግጥ' : 'Verify with Fayda Simulator'}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setRegStep(3)}>{lang === 'am' ? 'ተመለስ' : 'Back'}</button>
                  <button className="btn btn-gold" onClick={() => setRegStep(5)}>
                    {regFaydaId ? (lang === 'am' ? 'ቀጥል' : 'Continue') : (lang === 'am' ? 'ለጊዜው እለፍ' : 'Skip Step')}
                  </button>
                </div>
              </div>
            )}

            {regStep === 5 && (
              <div className="fade-in">
                <div style={{ marginBottom: 12, padding: 8, background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--gold-dim)' }}>
                  <Sparkles size={16} style={{ color: 'var(--gold)', marginRight: 6, float: 'left' }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {lang === 'am'
                      ? 'ቁጠባዎን ለመጀመር የበአል ግብዎን ይምረጡ። የተወሰነውን ግብ ሲመቱ ለመግዛት ዝግጁ ይሆናሉ!'
                      : 'Choose your holiday target goal to start saving. Once goal is met, you can buy animal instantly!'}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label"><Calendar size={14} style={{ marginRight: 4, display: 'inline' }} /> {lang === 'am' ? 'ዒላማ በአል' : 'Target Holiday'}</label>
                  <select
                    className="form-input"
                    value={regHolidayId}
                    onChange={e => {
                      const selectedId = e.target.value;
                      setRegHolidayId(selectedId);
                      const hol = activeHolidays.find(h => h.id === selectedId);
                      if (hol) {
                        setRegHolidayAmount(hol.minimumDeposit.toString());
                      }
                    }}
                  >
                    {activeHolidays.map(h => (
                      <option key={h.id} value={h.id}>{lang === 'am' ? h.name : h.nameEn}</option>
                    ))}
                  </select>
                </div>

                {regHolidayId && (
                  <>
                    <div className="form-group">
                      <label className="form-label">{lang === 'am' ? 'የእንስሳ ዓይነት ምርጫ' : 'Animal Preference'}</label>
                      <select className="form-input" value={regHolidayPreference} onChange={e => setRegHolidayPreference(e.target.value)}>
                        <option value="sheep">{lang === 'am' ? 'በግ' : 'Sheep'}</option>
                        <option value="goat">{lang === 'am' ? 'ፍየል' : 'Goat'}</option>
                        <option value="cattle">{lang === 'am' ? 'ከብት' : 'Cattle'}</option>
                        <option value="hen">{lang === 'am' ? 'ዶሮ' : 'Hen'}</option>
                        <option value="kircha">{lang === 'am' ? 'ኪርቻ (የጋራ)' : 'Kircha (Shared Cattle)'}</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {lang === 'am' ? 'የታለመው የቁጠባ መጠን (ብር)' : 'Target Savings Amount (ETB)'}{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({lang === 'am' ? 'ቢያንስ፡ ' : 'Min: '} {activeHolidays.find(h => h.id === regHolidayId)?.minimumDeposit.toLocaleString()} ETB)
                        </span>
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={regHolidayAmount}
                        onChange={e => setRegHolidayAmount(e.target.value)}
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                  <button className="btn btn-secondary" onClick={() => setRegStep(4)}>{lang === 'am' ? 'ተመለስ' : 'Back'}</button>
                  <button className="btn btn-primary" onClick={handleRegister} disabled={loading}>
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span className="btn-spinner" /> {lang === 'am' ? 'በመፍጠር ላይ...' : 'Creating...'}
                      </span>
                    ) : (
                      lang === 'am' ? 'ምዝገባን ጨርስ ✓' : 'Complete Setup ✓'
                    )}
                  </button>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t.alreadyHaveAccount} {' '}
                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit' }} onClick={() => { setMode('login'); setOtpSent(false); setRegStep(1); }}>
                  {t.signIn}
                </button>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ---- Fayda ID Modal ---- */}
      {showFayda && (
        <div className="modal-overlay" onClick={() => setShowFayda(false)}>
          <div className="modal fayda-modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="fayda-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
                <Shield size={24} />
                <h3>{t.faydaAuthSim}</h3>
              </div>
              <p>Federal Democratic Republic of Ethiopia · Digital Identity</p>

              <div className="fayda-steps">
                {faydaSteps.map((step, i) => (
                  <div key={i} className={`fayda-step ${i < faydaStep ? 'done' : ''} ${i === faydaStep ? 'active' : ''}`}>
                    <div className="fayda-step-dot">
                      {i < faydaStep ? <CheckCircle size={12} /> : i + 1}
                    </div>
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-body">
              {faydaStep === 0 && (
                <div className="fade-in">
                  <h4 style={{ marginBottom: 16, fontSize: '0.95rem' }}>{t.faydaEnterNumber}</h4>
                  <div className="form-group">
                    <label className="form-label">{t.faydaId}</label>
                    <input type="text" className="form-input" defaultValue="FID-2024-893421" id="fayda-id-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t.faydaDob}</label>
                    <input type="date" className="form-input" defaultValue="1990-05-15" />
                  </div>
                </div>
              )}

              {faydaStep === 1 && (
                <div className="fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue), var(--purple))', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
                    <Fingerprint size={48} color="white" />
                  </div>
                  <h4 style={{ marginBottom: 8 }}>{t.biometricAuth}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.scanningFingerprint}</p>
                  <div className="progress-bar" style={{ marginTop: 20, maxWidth: 300, margin: '20px auto 0' }}>
                    <div className="progress-fill green" style={{ width: '100%', animation: 'shimmer 1.5s infinite' }} />
                  </div>
                  <p style={{ color: 'var(--green-bright)', fontSize: '0.82rem', marginTop: 12 }}>
                    {lang === 'am' ? '✓ ባዮሜትሪክ መረጃ በተሳካ ሁኔታ ተዛምዷል' : '✓ Biometric data matched successfully'}
                  </p>
                </div>
              )}

              {faydaStep === 2 && (
                <div className="fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 100, height: 100, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--green-dim), var(--green))', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ScanLine size={48} color="white" />
                  </div>
                  <h4 style={{ marginBottom: 8 }}>{t.docScanning}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.idVerified}</p>
                  <div style={{ marginTop: 16 }}>
                    <span className="badge badge-green">{t.photoMatched}</span>
                    <span className="badge badge-green" style={{ marginLeft: 8 }}>{t.dataVerified}</span>
                  </div>
                </div>
              )}

              {faydaStep === 3 && (
                <div className="fade-in">
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <CheckCircle size={48} color="var(--green-bright)" />
                    <h4 style={{ marginTop: 12, color: 'var(--green-bright)' }}>{t.authSuccess}</h4>
                  </div>

                  <div className="fayda-profile-card">
                    <div className="fayda-avatar">YB</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{lang === 'am' ? 'ዮሃንስ በርሀ' : 'Yohannes Berhe'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>ዮሃንስ በርሀ</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>
                        FID-2024-893421 · {lang === 'am' ? 'አዲስ አበባ' : 'Addis Ababa'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.82rem' }}>
                    <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 2 }}>{t.phone}</div>
                      <div>+251 911 234 567</div>
                    </div>
                    <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 2 }}>{t.gender}</div>
                      <div>{lang === 'am' ? 'ወንድ' : 'Male'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 2 }}>{t.region}</div>
                      <div>{lang === 'am' ? 'አዲስ አበባ' : 'Addis Ababa'}</div>
                    </div>
                    <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 2 }}>{t.status}</div>
                      <div style={{ color: 'var(--green-bright)' }}>{lang === 'am' ? '✓ ንቁ' : '✓ Active'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFayda(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={advanceFayda} id="fayda-next">
                {faydaStep === 3 ? t.continueToApp : t.next}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {otpSent && mode === 'login' && (
        <div className="modal-overlay" onClick={() => setOtpSent(false)}>
          <div className="modal scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.passwordRecovery}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setOtpSent(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16 }}>
                {t.recoveredPasswordDesc}
              </p>
              <div className="form-group">
                <label className="form-label">{t.recovEnterCode}</label>
                <input type="text" className="form-input" placeholder={t.otpCodePlaceholder} maxLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.recoveryNewPassword}</label>
                <input type="password" className="form-input" placeholder={t.enterPassword} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setOtpSent(false)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={() => setOtpSent(false)}>{t.recoveryResetPassword}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
