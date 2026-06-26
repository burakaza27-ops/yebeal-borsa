import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, MapPin, Weight, Star, Heart, ShoppingCart,
  Truck, User, CheckCircle, X, Package, Calendar,
  Filter, Clock, CreditCard, ArrowUpDown, Users,
  Plus, ChevronRight, Smartphone, Building2, Zap
} from 'lucide-react';
import {
  placeOrder, getDeliveryBreakdown,
  formatETB, formatDate, ANIMAL_EMOJIS, ANIMAL_TYPES, DELIVERY_ZONES,
  DELIVERY_TIME_WINDOWS, PAYMENT_METHODS_ORDER, TRANSLATIONS, getPrimaryBalance,
  toggleFavorite, getKirchaPool,
  cancelOrder, rateOrder, createSupportTicket,
  INSTALLMENT_PLANS, INSTALLMENT_MIN_PRICE, getInstallmentPrice
} from '../db';
import { fetchAnimals, fetchOrders, fetchFavorites, fetchWallets } from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function vibrate(ms = 10) { if (navigator.vibrate) navigator.vibrate(ms); }

const ssGet = (key, fallback) => {
  try { const v = sessionStorage.getItem('yb_mkt_' + key); return v !== null ? v : fallback; }
  catch { return fallback; }
};

// ─── Step Dots (reused from Dashboard) ────────────────────────────────────────
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

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'gold', height = 8 }) {
  return (
    <div style={{ height, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
      <div className={`progress-fill ${color}`} style={{ width: `${Math.min(100, pct)}%`, height: '100%' }} />
    </div>
  );
}

export default function Marketplace({ onRefresh, lang, showToast, user }) {
  const queryClient = useQueryClient();

  const { data: animalsRaw = { animals: [] } } = useQuery({ queryKey: ['animals'], queryFn: fetchAnimals });
  const { data: ordersRaw = [] } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const { data: favoritesRaw = [] } = useQuery({ queryKey: ['favorites'], queryFn: fetchFavorites });
  const { data: walletsRaw = [] } = useQuery({ queryKey: ['wallets'], queryFn: fetchWallets });

  const animalsList = Array.isArray(animalsRaw) ? animalsRaw : (animalsRaw?.animals || []);
  const animals = animalsList.filter(a => a.isActive && a.isApproved);
  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
  const favorites = Array.isArray(favoritesRaw) ? favoritesRaw : [];
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(() => ssGet('search', ''));
  const [typeFilter, setTypeFilter] = useState(() => ssGet('typeFilter', 'all'));
  const [priceRange, setPriceRange] = useState(() => ssGet('priceRange', 'all'));
  const [locationFilter, setLocationFilter] = useState(() => ssGet('locationFilter', 'all'));
  const [ratingFilter, setRatingFilter] = useState(() => ssGet('ratingFilter', 'all'));
  const [dateFilter, setDateFilter] = useState(() => ssGet('dateFilter', ''));
  const [certFilter, setCertFilter] = useState(() => ssGet('certFilter', 'all'));
  const [sortBy, setSortBy] = useState(() => ssGet('sortBy', 'default'));
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState(() => ssGet('activeTab', 'browse'));

  useEffect(() => {
    const vals = { search, typeFilter, priceRange, locationFilter, ratingFilter, dateFilter, certFilter, sortBy, activeTab };
    Object.entries(vals).forEach(([k, v]) => { try { sessionStorage.setItem('yb_mkt_' + k, v); } catch {} });
  }, [search, typeFilter, priceRange, locationFilter, ratingFilter, dateFilter, certFilter, sortBy, activeTab]);

  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activePool, setActivePool] = useState(null);
  const [loadingPool, setLoadingPool] = useState(false);

  // ── Order Wizard State ──────────────────────────────────────────────────
  const [orderStep, setOrderStep] = useState(0); // 0=type, 1=delivery, 2=payment, 3=confirm
  const [purchaseType, setPurchaseType] = useState('cash'); // 'cash' | 'installment'
  const [installmentMonths, setInstallmentMonths] = useState(6);
  const [kirchaShares, setKirchaShares] = useState(3);
  const [deliveryOption, setDeliveryOption] = useState('delivery');
  const [deliveryZone, setDeliveryZone] = useState('Megenagna');
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState(DELIVERY_TIME_WINDOWS[0]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [vetInsurance, setVetInsurance] = useState(false);

  // ── Order Action Modals ─────────────────────────────────────────────────
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [rateOrderId, setRateOrderId] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [claimOrderId, setClaimOrderId] = useState(null);
  const [claimMessage, setClaimMessage] = useState('');

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const translateAnimal = (type) => lang === 'am' ? { sheep: 'በግ', goat: 'ፍየል', cattle: 'ከብት', hen: 'ዶሮ', kircha: 'ኪርቻ' }[type] || type : type;
  const translateMethod = (m) => {
    const map = {
      'Telebirr': lang === 'am' ? 'ቴሌቢር' : 'Telebirr',
      'CBE Birr': lang === 'am' ? 'ሲቢኢ ብር' : 'CBE Birr',
      'Bank Transfer': lang === 'am' ? 'ባንክ ማስተላለፍ' : 'Bank Transfer',
      'Wallet': lang === 'am' ? 'የኪስ ቦርሳ' : 'Wallet',
      'Cash on Delivery': lang === 'am' ? 'ሲረከቡ በጥሬ ገንዘብ' : 'Cash on Delivery',
    };
    return map[m] || m;
  };
  const translateStep = (step) => {
    const map = {
      'Order Placed': lang === 'am' ? 'ትዕዛዝ ተቀምጧል' : 'Order Placed',
      'Vet Inspection': lang === 'am' ? 'የእንስሳት ሐኪም ምርመራ' : 'Vet Inspection',
      'In Transit': lang === 'am' ? 'በመንገድ ላይ' : 'In Transit',
      'Delivered': lang === 'am' ? 'ደረሰ' : 'Delivered'
    };
    return map[step] || step;
  };

  const refresh = async () => {
    setLoading(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setLoading(false), 600);
  };

  const handleToggleFavorite = async (e, animalId) => {
    e.stopPropagation();
    try {
      await toggleFavorite(animalId);
      await refresh();
      if (showToast) showToast(lang === 'am' ? 'የተወዳጆች ዝርዝር ተዘምኗል' : 'Favorites updated', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update favorites', 'error');
    }
  };

  const handleConfirmCancel = async () => {
    setActionLoading(true);
    try {
      await cancelOrder(cancelOrderId, cancelReasonText);
      showToast(lang === 'am' ? 'ትዕዛዙ ተሰርዟል፤ ተመላሽ ክፍያው እየተመረመረ ነው' : 'Order cancelled. Refund pending admin review.', 'success');
      setCancelOrderId(null); setCancelReasonText(''); refresh();
    } catch (err) { showToast(err.message || 'Failed to cancel order', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleConfirmRate = async () => {
    setActionLoading(true);
    try {
      await rateOrder(rateOrderId, ratingValue);
      showToast(lang === 'am' ? 'ደረጃ ስኬታማ በሆነ መንገድ ተሰጥቷል!' : 'Seller rated successfully!', 'success');
      setRateOrderId(null); refresh();
    } catch (err) { showToast(err.message || 'Failed to rate seller', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleConfirmClaim = async () => {
    setActionLoading(true);
    try {
      const title = `Insurance Claim for Order #${claimOrderId.slice(-6)}`;
      await createSupportTicket(title, claimMessage, 'INSURANCE_CLAIM');
      showToast(lang === 'am' ? 'የኢንሹራንስ ካሳ ጥያቄዎ ተልኳል 🛡️' : 'Insurance claim submitted! 🛡️', 'success');
      setClaimOrderId(null); setClaimMessage(''); refresh();
    } catch (err) { showToast(err.message || 'Failed to submit claim', 'error'); }
    finally { setActionLoading(false); }
  };

  const locations = [...new Set(animals.map(a => a.locationArea))];

  const filtered = animals
    .filter(a => {
      if (!a.isApproved) return false;
      if (typeFilter !== 'all' && a.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
      if (locationFilter !== 'all' && a.locationArea !== locationFilter) return false;
      if (ratingFilter === '4.5+' && a.sellerRating < 4.5) return false;
      if (ratingFilter === '4.7+' && a.sellerRating < 4.7) return false;
      if (certFilter === 'certified' && !a.healthCertificate) return false;
      if (activeTab === 'favorites' && !favorites.includes(a.id)) return false;
      if (dateFilter && new Date(a.availableDate) > new Date(dateFilter)) return false;
      if (search && ![a.breed, a.type, a.description, a.sellerName, a.locationArea]
        .some(f => f.toLowerCase().includes(search.toLowerCase()))) return false;
      if (priceRange === 'low' && a.price > 5000) return false;
      if (priceRange === 'mid' && (a.price < 5000 || a.price > 15000)) return false;
      if (priceRange === 'high' && a.price < 15000) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return b.sellerRating - a.sellerRating;
      if (sortBy === 'weight') return b.weight - a.weight;
      if (sortBy === 'newest') return new Date(b.availableDate) - new Date(a.availableDate);
      return 0;
    });

  // ── Open detail / order ─────────────────────────────────────────────────
  const openDetail = async (animal) => {
    setSelectedAnimal(animal);
    setShowDetail(true);
    if (animal.type === 'kircha') {
      setLoadingPool(true);
      try {
        const pool = await getKirchaPool(animal.id);
        setActivePool(pool);
        if (pool && pool.bookedShares > 0) setKirchaShares(pool.totalShares);
        else setKirchaShares(5);
      } catch (err) { console.error(err); }
      finally { setLoadingPool(false); }
    } else { setActivePool(null); }
  };

  const openOrder = async (animal) => {
    vibrate();
    setSelectedAnimal(animal);
    setShowDetail(false);
    setOrderSuccess(false);
    setOrderStep(0);
    setPurchaseType('cash');
    setInstallmentMonths(6);
    setDeliveryOption('delivery');
    setDeliveryZone('Megenagna');
    setDeliveryTimeWindow(DELIVERY_TIME_WINDOWS[0]);
    setDeliveryAddress('');
    setDeliveryDate('');
    setPaymentMethod('wallet');
    setVetInsurance(false);

    if (animal.type === 'kircha') {
      setLoadingPool(true);
      try {
        const pool = await getKirchaPool(animal.id);
        setActivePool(pool);
        if (pool && pool.bookedShares > 0) setKirchaShares(pool.totalShares);
        else setKirchaShares(5);
      } catch (err) { console.error(err); }
      finally { setLoadingPool(false); }
    } else { setActivePool(null); }
    setShowOrder(true);
  };

  // ── Price calculations ──────────────────────────────────────────────────
  const getBasePrice = () => {
    if (!selectedAnimal) return 0;
    return selectedAnimal.type === 'kircha' ? Math.round(selectedAnimal.price / kirchaShares) : selectedAnimal.price;
  };

  const getOrderTotal = () => {
    const basePrice = getBasePrice();
    let price = basePrice;
    if (purchaseType === 'installment') {
      const inst = getInstallmentPrice(basePrice, installmentMonths);
      if (inst) price = inst.totalPrice;
    }
    const insuranceFee = vetInsurance ? Math.round(basePrice * 0.05) : 0;
    if (deliveryOption !== 'delivery') return price + insuranceFee;
    const bd = getDeliveryBreakdown(selectedAnimal.locationArea, deliveryZone, selectedAnimal.type, basePrice);
    return bd.grandTotal - basePrice + price + insuranceFee;
  };

  const breakdown = selectedAnimal && deliveryOption === 'delivery'
    ? (() => {
        const basePrice = getBasePrice();
        return getDeliveryBreakdown(selectedAnimal.locationArea, deliveryZone, selectedAnimal.type, basePrice);
      })()
    : null;

  // ── Step navigation ─────────────────────────────────────────────────────
  const goToNextStep = () => {
    vibrate();
    if (orderStep === 1 && deliveryOption === 'delivery') {
      if (!deliveryAddress.trim()) {
        showToast(lang === 'am' ? 'እባክዎ የማድረሻ አድራሻ ያስገቡ' : 'Please enter a delivery address', 'warning');
        return;
      }
      if (!deliveryDate) {
        showToast(lang === 'am' ? 'እባክዎ የማድረሻ ቀን ይምረጡ' : 'Please select a delivery date', 'warning');
        return;
      }
    }
    setOrderStep(s => s + 1);
  };

  const goBack = () => { vibrate(); setOrderStep(s => s - 1); };

  // ── Confirm order ───────────────────────────────────────────────────────
  const confirmOrder = async () => {
    if (!selectedAnimal) return;
    const balance = getPrimaryBalance();
    const total = getOrderTotal();

    if (paymentMethod === 'wallet' && balance < total) {
      showToast(
        lang === 'am'
          ? `የኪስ ቦርሳ ቀሪ ሂሳብ በቂ አይደለም። ${formatETB(balance)} አለዎት ነገር ግን ${formatETB(total)} ያስፈልጋል።`
          : `Insufficient wallet balance. You have ${formatETB(balance)} but need ${formatETB(total)}.`,
        'warning'
      );
      return;
    }

    if (paymentMethod === 'wallet' && (balance - total) < 100) {
      showToast(lang === 'am' ? 'ከግዢ በኋላ ቢያንስ 100 ብር መያዣ መቅረት አለበት!' : 'A minimum 100 ETB reserve must remain after purchase!', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const basePrice = getBasePrice();
      const instInfo = purchaseType === 'installment' ? getInstallmentPrice(basePrice, installmentMonths) : null;

      await placeOrder(
        selectedAnimal.id,
        deliveryOption,
        deliveryZone,
        deliveryTimeWindow,
        paymentMethod,
        selectedAnimal.type === 'kircha' ? kirchaShares : null,
        {
          deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress.trim() : null,
          deliveryDate: deliveryOption === 'delivery' ? deliveryDate : null,
          insuranceAdded: vetInsurance,
          purchaseType,
          installmentPlan: instInfo ? {
            months: instInfo.months,
            monthlyPayment: instInfo.monthlyPayment,
            totalPrice: instInfo.totalPrice,
            paidInstallments: purchaseType === 'installment' ? 1 : 0,
          } : null,
        }
      );
      vibrate(20);
      setOrderSuccess(true);
      showToast(lang === 'am' ? 'ትዕዛዝዎ ተመዝግቧል! 🎉' : 'Order placed successfully! 🎉', 'success');
      setTimeout(() => { setShowOrder(false); setOrderSuccess(false); refresh(); }, 2000);
    } catch (err) {
      showToast(err.message || 'Failed to place order', 'error');
    } finally { setActionLoading(false); }
  };

  const clearFilters = () => {
    setTypeFilter('all'); setPriceRange('all'); setLocationFilter('all');
    setRatingFilter('all'); setDateFilter(''); setCertFilter('all'); setSearch(''); setSortBy('default');
    ['search','typeFilter','priceRange','locationFilter','ratingFilter','dateFilter','certFilter','sortBy'].forEach(k => {
      try { sessionStorage.removeItem('yb_mkt_' + k); } catch {}
    });
  };

  const activeFilterCount = [typeFilter !== 'all', priceRange !== 'all', locationFilter !== 'all', ratingFilter !== 'all', dateFilter !== '', certFilter !== 'all'].filter(Boolean).length;

  // ── Payment method cards for wizard ─────────────────────────────────────
  const METHODS = [
    { key: 'wallet', icon: <CreditCard size={20} />, label: lang === 'am' ? 'ከኪስ ቦርሳ' : 'Wallet', color: 'var(--gold)' },
    { key: 'telebirr', icon: <Smartphone size={20} />, label: lang === 'am' ? 'ቴሌቢር' : 'Telebirr', color: 'var(--green)' },
    { key: 'cbe', icon: <Building2 size={20} />, label: lang === 'am' ? 'ሲቢኢ ብር' : 'CBE Birr', color: 'var(--blue)' },
    { key: 'cod', icon: <Zap size={20} />, label: lang === 'am' ? 'ሲረከቡ ይከፈላል' : 'Cash on Delivery', color: 'var(--purple)' },
  ];

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>{t.marketplace} 🏪</h2>
        <p>{lang === 'am' ? 'ከተረጋገጡ ሻጮች ጥራት ያላቸውን እንስሳት ይመልከቱ' : 'Browse quality livestock from verified sellers across Addis Ababa'}</p>
      </div>

      <div className="tabs" style={{ maxWidth: 520 }}>
        <button className={`tab ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>
          🐑 {t.browse}
        </button>
        <button className={`tab ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => setActiveTab('favorites')}>
          ❤️ {t.favorites} ({favorites.length})
        </button>
        <button className={`tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          📦 {t.myOrders} ({orders.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BROWSE / FAVORITES TAB
      ═══════════════════════════════════════════════════════════════ */}
      {(activeTab === 'browse' || activeTab === 'favorites') && (
        <>
          {/* Search + Sort bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div className="search-bar" style={{ flex: 1 }}>
              <Search size={18} className="search-icon" />
              <input placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} id="marketplace-search" />
              <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(!showFilters)} style={{ position: 'relative' }}>
                <Filter size={16} />
                {activeFilterCount > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--gold)', color: 'var(--text-inverse)', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} color="var(--text-muted)" />
              <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)} id="marketplace-sort">
                <option value="default">{lang === 'am' ? 'ነባሪ' : 'Default'}</option>
                <option value="price-asc">{lang === 'am' ? 'ዋጋ: ከዝቅተኛ' : 'Price: Low → High'}</option>
                <option value="price-desc">{lang === 'am' ? 'ዋጋ: ከከፍተኛ' : 'Price: High → Low'}</option>
                <option value="rating">{lang === 'am' ? 'ከፍተኛ ደረጃ' : 'Top Rated'}</option>
                <option value="weight">{lang === 'am' ? 'ከባድ እንስሳ' : 'Heaviest'}</option>
                <option value="newest">{lang === 'am' ? 'አዲስ' : 'Newest'}</option>
              </select>
            </div>
          </div>

          {/* Type pills */}
          <div className="filter-pills" style={{ marginBottom: 12 }}>
            <button className={`filter-pill ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>{t.all}</button>
            {ANIMAL_TYPES.map(type => (
              <button key={type} className={`filter-pill ${typeFilter === type ? 'active' : ''}`} onClick={() => setTypeFilter(type)}>
                {ANIMAL_EMOJIS[type]} {translateAnimal(type)}
                {type === 'kircha' && <span className="kircha-badge" style={{ marginLeft: 6 }}>{t.group}</span>}
              </button>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="card" style={{ marginBottom: 16, animation: 'slideUp 0.2s ease' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: '0.9rem' }}>{lang === 'am' ? '🔍 ተጨማሪ ማጣሪያዎች' : '🔍 Advanced Filters'}</h3>
                <button className="btn btn-ghost btn-sm" onClick={clearFilters}>{lang === 'am' ? 'ሁሉንም አጽዳ' : 'Clear All'}</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t.priceRange}</label>
                  <select className="form-input form-select" value={priceRange} onChange={e => setPriceRange(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.82rem' }}>
                    <option value="all">{t.anyPrice}</option>
                    <option value="low">{t.under5000}</option>
                    <option value="mid">{t.between5000And15000}</option>
                    <option value="high">{t.above15000}</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{lang === 'am' ? 'ቦታ' : 'Location'}</label>
                  <select className="form-input form-select" value={locationFilter} onChange={e => setLocationFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.82rem' }}>
                    <option value="all">{t.allLocations}</option>
                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{lang === 'am' ? 'ደረጃ' : 'Seller Rating'}</label>
                  <select className="form-input form-select" value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.82rem' }}>
                    <option value="all">{t.anyRating}</option>
                    <option value="4.5+">{t.stars45}</option>
                    <option value="4.7+">{t.stars47}</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t.availableBefore}</label>
                  <input type="date" className="form-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.82rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t.healthCertificate}</label>
                  <select className="form-input form-select" value={certFilter} onChange={e => setCertFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.82rem' }}>
                    <option value="all">{t.all}</option>
                    <option value="certified">{t.certifiedOnly}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t.showing} <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> {t.animalsText}
            {sortBy !== 'default' && <span style={{ marginLeft: 8 }} className="badge badge-gold">{t.sortedBy} {sortBy.replace('-', ' ')}</span>}
          </div>

          {loading ? (
            <div className="animal-grid">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="animal-card skeleton" style={{ height: 350, display: 'flex', flexDirection: 'column', padding: 20 }}>
                  <div className="skeleton" style={{ height: 160, width: '100%', marginBottom: 16, background: 'var(--bg-card-hover)' }} />
                  <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12, background: 'var(--bg-card-hover)' }} />
                  <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 20, background: 'var(--bg-card-hover)' }} />
                  <div className="skeleton" style={{ height: 40, width: '100%', marginTop: 'auto', background: 'var(--bg-card-hover)' }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{activeTab === 'favorites' ? '❤️' : '🔍'}</div>
              <h3>{activeTab === 'favorites' ? t.noFavoritesYet : t.noAnimalsFound}</h3>
              <p>{activeTab === 'favorites' ? t.tapHeartToSave : t.adjustFilters}</p>
              {activeFilterCount > 0 && <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={clearFilters}>{t.clearFilters}</button>}
            </div>
          ) : (
            <div className="animal-grid">
              {filtered.map((animal, idx) => {
                const isFav = favorites.includes(animal.id);
                const isKircha = animal.type === 'kircha';
                const canInstall = animal.price >= INSTALLMENT_MIN_PRICE;
                const defaultInst = canInstall ? getInstallmentPrice(animal.price, 6) : null;
                return (
                  <div key={animal.id} className="animal-card animate-in" onClick={() => openDetail(animal)} style={{ cursor: 'pointer', animationDelay: `${idx * 0.04}s` }}>
                    <div className="animal-card-image">
                      <span style={{ fontSize: isKircha ? '4.5rem' : '4rem' }}>{ANIMAL_EMOJIS[animal.type] || '🐾'}</span>
                      <div className="animal-card-badge" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        <button className={`favorite-btn ${isFav ? 'active' : ''}`} onClick={e => handleToggleFavorite(e, animal.id)} aria-label="Toggle favorite">
                          <Heart size={16} fill={isFav ? 'white' : 'none'} />
                        </button>
                        {animal.healthCertificate && <span className="badge badge-green" style={{ fontSize: '0.6rem' }}><CheckCircle size={9} /> {lang === 'am' ? 'የጤና ማረጋገጫ' : 'Cert'}</span>}
                        {isKircha && <span className="kircha-badge"><Users size={10} /> {t.group}</span>}
                      </div>
                    </div>
                    <div className="animal-card-body">
                      <div className="animal-card-type">{translateAnimal(animal.type)}</div>
                      <div className="animal-card-name">{lang === 'am' ? translateAnimal(animal.type) + ' (' + animal.breed + ')' : animal.breed + ' ' + animal.type.charAt(0).toUpperCase() + animal.type.slice(1)}</div>
                      <div className="animal-card-meta">
                        <span><Weight size={13} /> {animal.weight}{lang === 'am' ? 'ኪ.ግ' : 'kg'}</span>
                        <span><MapPin size={13} /> {animal.locationArea}</span>
                        <span><Star size={13} fill="var(--gold)" color="var(--gold)" /> {animal.sellerRating}</span>
                        {animal.age && <span><Clock size={13} /> {animal.age}</span>}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <div className="animal-card-price">{formatETB(animal.price)}</div>
                        {isKircha && <div style={{ fontSize: '0.68rem', color: 'var(--purple)', fontWeight: 600 }}>÷ {3} {lang === 'am' ? 'ቤተሰቦች' : 'families'} = {formatETB(Math.round(animal.price / 3))} {lang === 'am' ? 'በአንድ ቤተሰብ' : 'each'}</div>}
                        {canInstall && !isKircha && defaultInst && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            📅 {lang === 'am' ? 'ወይም' : 'or'} {formatETB(defaultInst.monthlyPayment)}/{lang === 'am' ? 'ወር' : 'mo'} × 6
                          </div>
                        )}
                      </div>
                      <div className="animal-card-footer">
                        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); openOrder(animal); }}>
                          <ShoppingCart size={14} /> {t.buyNow}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); openDetail(animal); }}>
                          {t.details}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ORDERS TAB
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📦</div><h3>{lang === 'am' ? 'ምንም ትዕዛዝ የለም' : 'No Orders Yet'}</h3><p>{lang === 'am' ? 'ገበያውን ይጎብኙ' : 'Browse the marketplace and place your first order'}</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {orders.map(order => {
                const getStatusDisplay = (status) => {
                  const map = {
                    confirmed: { className: 'badge-gold', text: lang === 'am' ? '✓ ተረጋግጧል' : '✓ Confirmed' },
                    preparing: { className: 'badge-gold', text: lang === 'am' ? '⏳ በመዘጋጀት ላይ' : '⏳ Preparing' },
                    ready: { className: 'badge-gold', text: lang === 'am' ? '📍 ዝግጁ' : '📍 Ready' },
                    pickup_ready: { className: 'badge-gold', text: lang === 'am' ? '📍 ለመውሰድ ዝግጁ' : '📍 Pickup Ready' },
                    processing: { className: 'badge-blue', text: lang === 'am' ? '⏳ በመስራት ላይ' : '⏳ Processing' },
                    in_transit: { className: 'badge-blue', text: lang === 'am' ? '🚚 በመንገድ ላይ' : '🚚 In Transit' },
                    delivered: { className: 'badge-green', text: lang === 'am' ? '✓ ደርሷል' : '✓ Delivered' },
                    cancelled: { className: 'badge-red', text: lang === 'am' ? '✗ ተሰርዟል' : '✗ Cancelled' }
                  };
                  return map[status] || { className: 'badge-muted', text: status };
                };
                const sd = getStatusDisplay(order.deliveryStatus);
                const instPlan = order.installmentPlan;
                return (
                  <div key={order.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                          {ANIMAL_EMOJIS[order.animalType] || '🐾'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{order.animalBreed} {translateAnimal(order.animalType)}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            #{order.id.slice(-6)} · {formatDate(order.createdAt)}
                            {order.deliveryTimeWindow && <> · {order.deliveryTimeWindow}</>}
                          </div>
                          {order.purchaseType === 'installment' && (
                            <span className="badge badge-gold" style={{ marginTop: 4, fontSize: '0.65rem' }}>
                              📅 {lang === 'am' ? 'የእኩብ ክፍያ' : 'Installment'}
                            </span>
                          )}
                          {order.paymentMethod && order.purchaseType !== 'installment' && (
                            <span className="badge badge-muted" style={{ marginTop: 4, fontSize: '0.65rem' }}>
                              {translateMethod(order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'telebirr' ? 'Telebirr' : 'Wallet')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1.1rem' }}>{formatETB(order.totalPrice)}</div>
                        <span className={`badge ${sd.className}`}>{sd.text}</span>
                      </div>
                    </div>

                    {/* Installment progress bar */}
                    {instPlan && (
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 12, border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            📅 {lang === 'am' ? 'የክፍያ ሂደት' : 'Payment Progress'}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--gold)' }}>
                            {instPlan.paidInstallments || 1}/{instPlan.months}
                          </span>
                        </div>
                        <ProgressBar pct={((instPlan.paidInstallments || 1) / instPlan.months) * 100} />
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                          {formatETB(instPlan.monthlyPayment)}/{lang === 'am' ? 'ወር' : 'mo'} × {instPlan.months} {lang === 'am' ? 'ወራት' : 'months'}
                        </div>
                      </div>
                    )}

                    {/* Delivery tracker */}
                    {order.deliveryOption === 'delivery' && order.deliverySteps?.length > 0 && (
                      <div className="delivery-tracker">
                        {order.deliverySteps.map((step, i) => {
                          const isActive = !step.done && (i === 0 || order.deliverySteps[i - 1]?.done);
                          return (
                            <div key={i} className={`tracker-step ${step.done ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                              <div className="tracker-dot">
                                {step.done ? <CheckCircle size={16} /> : isActive ? <Truck size={16} /> : <Package size={14} />}
                              </div>
                              <div className="tracker-label">{translateStep(step.label)}</div>
                              {step.time && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{step.time}</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Delivery info */}
                    {order.deliveryOption === 'delivery' && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                        <div style={{ marginBottom: 4 }}><strong>{lang === 'am' ? '📍 አድራሻ: ' : '📍 Address: '}</strong>{order.deliveryAddress || 'N/A'}</div>
                        <div style={{ marginBottom: 4 }}><strong>{lang === 'am' ? '📅 ቀን: ' : '📅 Date: '}</strong>{order.deliveryDate ? formatDate(order.deliveryDate) : 'N/A'}</div>
                        {order.deliveryFee > 0 && <div><strong>{lang === 'am' ? '💵 ክፍያ: ' : '💵 Fee: '}</strong>{formatETB(order.deliveryFee)}</div>}
                      </div>
                    )}

                    {order.insuranceAdded && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--green-bright)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--green-soft)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid hsla(120,72%,45%,0.15)' }}>
                        🛡️ <span>{lang === 'am' ? `ዋስትና ንቁ (+${formatETB(order.insurancePremium)})` : `Insurance Active (+${formatETB(order.insurancePremium)})`}</span>
                      </div>
                    )}

                    {order.deliveryStatus === 'cancelled' && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--red)', background: 'var(--red-soft)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid hsla(0,72%,55%,0.15)' }}>
                        <div style={{ marginBottom: 4 }}><strong>{lang === 'am' ? 'ምክንያት: ' : 'Reason: '}</strong>{order.cancelReason || 'N/A'}</div>
                        {order.cancelledAt && <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{lang === 'am' ? 'ቀን: ' : 'At: '}{formatDate(order.cancelledAt)}</div>}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border-light)', paddingTop: 10, flexWrap: 'wrap' }}>
                      {(order.deliveryStatus === 'in_transit' || order.deliveryStatus === 'processing') && (
                        <button className="btn btn-primary btn-sm" onClick={() => alert(lang === 'am' ? 'መከታተያ በቅርቡ ይመጣል' : 'Live tracking: Driver is 15 mins away.')}>
                          📍 {lang === 'am' ? 'ተከታተል' : 'Track Order'}
                        </button>
                      )}
                      {order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'completed' && order.deliveryStatus !== 'cancelled' && (
                        <button className="btn btn-danger btn-sm" onClick={() => { setCancelOrderId(order.id); setCancelReasonText(''); }}>
                          {lang === 'am' ? 'ሰርዝ ✗' : 'Cancel ✗'}
                        </button>
                      )}
                      {order.deliveryStatus === 'delivered' && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setRateOrderId(order.id); setRatingValue(5); }}>
                            ⭐️ {lang === 'am' ? 'ደረጃ ስጥ' : 'Rate Seller'}
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ background: 'var(--bg-elevated)', color: 'var(--red)', border: '1px solid var(--border-light)' }}
                            onClick={() => alert(lang === 'am' ? 'ችግር ሪፖርት' : 'Issue reporting form opened.')}>
                            ⚠️ {lang === 'am' ? 'ሪፖርት' : 'Report'}
                          </button>
                        </>
                      )}
                      {order.deliveryStatus === 'delivered' && order.insuranceAdded && (
                        <button className="btn btn-sm" style={{ background: 'linear-gradient(135deg, var(--purple), hsla(270,70%,60%,0.85))', color: 'white', border: 'none' }}
                          onClick={() => { setClaimOrderId(order.id); setClaimMessage(''); }}>
                          🛡️ {lang === 'am' ? 'ካሳ ጠይቅ' : 'File Claim'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ANIMAL DETAIL MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {showDetail && selectedAnimal && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal scale-in" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{ANIMAL_EMOJIS[selectedAnimal.type]} {selectedAnimal.breed} {translateAnimal(selectedAnimal.type)}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDetail(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ height: 160, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', marginBottom: 20 }}>
                {ANIMAL_EMOJIS[selectedAnimal.type]}
              </div>

              {selectedAnimal.type === 'kircha' && (
                <div style={{ background: 'linear-gradient(135deg, hsla(270,70%,60%,0.1), hsla(210,100%,60%,0.05))', border: '1px solid hsla(270,70%,60%,0.2)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={16} /> {lang === 'am' ? 'የኪርቻ ገንዳ' : 'Kircha Group Pool'}
                    </div>
                    {activePool && activePool.bookedShares > 0 && <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{lang === 'am' ? 'ተጀምሯል' : 'Pool Started'}</span>}
                  </div>
                  {loadingPool ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, color: 'var(--text-muted)', fontSize: '0.8rem' }}><span className="spinner-sm" /> {lang === 'am' ? 'በመጫን ላይ...' : 'Loading...'}</div>
                  ) : activePool ? (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4, color: 'var(--text-secondary)' }}>
                        <span>{lang === 'am' ? `${activePool.bookedShares} ከ ${activePool.totalShares} ተይዟል` : `${activePool.bookedShares} of ${activePool.totalShares} booked`}</span>
                        <span style={{ fontWeight: 600, color: 'var(--purple)' }}>{Math.round((activePool.bookedShares / activePool.totalShares) * 100)}%</span>
                      </div>
                      <ProgressBar pct={(activePool.bookedShares / activePool.totalShares) * 100} color="purple" height={10} />
                      {activePool.members?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{lang === 'am' ? 'አባላት' : 'Members'}:</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {activePool.members.map((m, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', border: '1px solid var(--border-light)' }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>{m.avatar || m.fullName[0]}</div>
                                <span style={{ fontWeight: 500 }}>{m.fullName}</span>
                                <span style={{ color: 'var(--text-muted)' }}>({m.shares} {lang === 'am' ? 'እጣ' : 'sh'})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{t.kirchaDesc}</p>
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>{lang === 'am' ? 'ክፍፍል' : 'Pool Division'}:</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[3, 5, 7].map(n => {
                        const isLocked = activePool && activePool.bookedShares > 0;
                        return (
                          <button key={n} className={`btn btn-sm ${kirchaShares === n ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ minWidth: 48, opacity: isLocked && kirchaShares !== n ? 0.4 : 1 }}
                            onClick={() => !isLocked && setKirchaShares(n)} disabled={isLocked}>÷{n}</button>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 10, fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold)' }}>
                      {t.yourShare}: {formatETB(Math.round(selectedAnimal.price / kirchaShares))}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: t.breed, value: selectedAnimal.breed },
                  { label: lang === 'am' ? 'ክብደት' : 'Weight', value: `${selectedAnimal.weight} ${lang === 'am' ? 'ኪ.ግ' : 'kg'}` },
                  { label: t.age, value: selectedAnimal.age || 'N/A' },
                  { label: lang === 'am' ? 'ቦታ' : 'Location', value: selectedAnimal.locationArea },
                  { label: lang === 'am' ? 'ቀን' : 'Available', value: formatDate(selectedAnimal.availableDate) },
                  { label: lang === 'am' ? 'የጤና ማረጋገጫ' : 'Health Cert.', value: selectedAnimal.healthCertificate ? '✓' : '✗', color: selectedAnimal.healthCertificate ? 'var(--green-bright)' : 'var(--text-muted)' },
                  { label: lang === 'am' ? 'ጾታ' : 'Gender', value: selectedAnimal.gender || (lang === 'am' ? 'ወንድ' : 'Male') },
                  { label: lang === 'am' ? 'ጤና' : 'Health', value: selectedAnimal.healthStatus || (lang === 'am' ? 'በጣም ጥሩ' : 'Excellent'), color: '#22c55e' },
                  { label: lang === 'am' ? 'ክትባት' : 'Vaccination', value: selectedAnimal.vaccinationStatus ? '✓' : '✗', color: selectedAnimal.vaccinationStatus ? '#22c55e' : 'var(--text-muted)' },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: item.color || 'var(--text-primary)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{selectedAnimal.description}</p>
              <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}><User size={22} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{selectedAnimal.sellerName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.verifiedSeller} · {selectedAnimal.locationArea}</div>
                </div>
                <div className="flex items-center gap-1"><Star size={14} fill="var(--gold)" color="var(--gold)" /><span style={{ fontWeight: 700 }}>{selectedAnimal.sellerRating}</span></div>
              </div>
              <div className="flex items-center justify-between" style={{ padding: '16px 0 4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t.totalPrice}</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold)' }}>
                  {formatETB(selectedAnimal.type === 'kircha' ? Math.round(selectedAnimal.price / kirchaShares) : selectedAnimal.price)}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>{t.close}</button>
              <button className="btn btn-primary" onClick={() => openOrder(selectedAnimal)}><ShoppingCart size={16} /> {t.buyNow}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ORDER WIZARD MODAL — 4-Step Flow
      ═══════════════════════════════════════════════════════════════ */}
      {showOrder && selectedAnimal && (
        <div className="modal-overlay" onClick={() => !orderSuccess && setShowOrder(false)} role="dialog" aria-label="Place Order" aria-modal="true">
          <div className="modal cd-modal scale-in" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            {orderSuccess ? (
              <div style={{ padding: '50px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: 8, fontWeight: 700 }}>
                  {lang === 'am' ? 'ትዕዛዝ ተመዝግቧል!' : 'Order Placed!'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {purchaseType === 'installment'
                    ? (lang === 'am' ? 'የእኩብ ክፍያ ዕቅድዎ ተጀምሯል' : `Installment plan started — ${formatETB(getInstallmentPrice(getBasePrice(), installmentMonths)?.monthlyPayment || 0)}/mo`)
                    : (deliveryOption === 'delivery'
                        ? `${lang === 'am' ? 'ወደ' : 'Delivering to'} ${deliveryZone}`
                        : `${lang === 'am' ? 'ለመውሰድ ዝግጁ' : 'Ready for pickup'}`)}
                </p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {orderStep > 0 && (
                      <button className="btn btn-ghost btn-icon" onClick={goBack} aria-label="Back" style={{ marginRight: 4 }}>←</button>
                    )}
                    <h3>🛒 {lang === 'am' ? 'ትዕዛዝ' : 'Place Order'}</h3>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowOrder(false)} aria-label="Close">✕</button>
                </div>

                <div className="modal-body">
                  <StepDots step={orderStep} total={4} />

                  {/* Animal summary (always visible) */}
                  <div style={{ display: 'flex', gap: 14, background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 18 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>{ANIMAL_EMOJIS[selectedAnimal.type]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{selectedAnimal.breed} {translateAnimal(selectedAnimal.type)}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{selectedAnimal.weight}{lang === 'am' ? 'ኪ.ግ' : 'kg'} · {selectedAnimal.locationArea} · ⭐ {selectedAnimal.sellerRating}</div>
                      <div style={{ fontWeight: 700, color: 'var(--gold)', marginTop: 4 }}>{formatETB(getBasePrice())}</div>
                    </div>
                  </div>

                  {/* ── Step 0: Purchase Type ── */}
                  {orderStep === 0 && (
                    <div className="animate-in">
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {lang === 'am' ? 'እንዴት መክፈል ይፈልጋሉ?' : 'How would you like to pay?'}
                        </div>
                      </div>

                      {/* Cash vs Installment cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: selectedAnimal.price >= INSTALLMENT_MIN_PRICE && selectedAnimal.type !== 'kircha' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
                        <div
                          className={`mp-purchase-card ${purchaseType === 'cash' ? 'selected' : ''}`}
                          onClick={() => { vibrate(); setPurchaseType('cash'); }}
                          role="button" tabIndex={0}
                        >
                          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>💵</div>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{lang === 'am' ? 'ጥሬ ገንዘብ' : 'Pay Now'}</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold)' }}>{formatETB(getBasePrice())}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            {lang === 'am' ? 'ሙሉ ክፍያ አሁን' : 'Full payment today'}
                          </div>
                        </div>

                        {selectedAnimal.price >= INSTALLMENT_MIN_PRICE && selectedAnimal.type !== 'kircha' && (() => {
                          const inst = getInstallmentPrice(getBasePrice(), installmentMonths);
                          return (
                            <div
                              className={`mp-purchase-card ${purchaseType === 'installment' ? 'selected' : ''}`}
                              onClick={() => { vibrate(); setPurchaseType('installment'); }}
                              role="button" tabIndex={0}
                            >
                              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📅</div>
                              <div style={{ fontWeight: 700, marginBottom: 4 }}>{lang === 'am' ? 'እኩብ ክፍያ' : 'Installment'}</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold)' }}>
                                {formatETB(inst?.monthlyPayment || 0)}<span style={{ fontSize: '0.7rem', fontWeight: 500 }}>/{lang === 'am' ? 'ወር' : 'mo'}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                × {installmentMonths} {lang === 'am' ? 'ወራት' : 'months'}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Installment plan selector */}
                      {purchaseType === 'installment' && (
                        <div className="animate-in" style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                            {lang === 'am' ? 'የክፍያ ዕቅድ ይምረጡ' : 'Choose your plan'}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            {INSTALLMENT_PLANS.map(plan => (
                              <button
                                key={plan.months}
                                className={`cd-chip ${installmentMonths === plan.months ? 'selected' : ''}`}
                                onClick={() => { vibrate(); setInstallmentMonths(plan.months); }}
                                style={{ flex: 1 }}
                              >
                                {lang === 'am' ? plan.labelAm : plan.label}
                              </button>
                            ))}
                          </div>

                          {(() => {
                            const inst = getInstallmentPrice(getBasePrice(), installmentMonths);
                            if (!inst) return null;
                            return (
                              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, border: '1px solid var(--border-light)' }}>
                                <div className="cd-confirm-row">
                                  <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ወርሃዊ ክፍያ' : 'Monthly Payment'}</span>
                                  <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1.05rem' }}>{formatETB(inst.monthlyPayment)}</span>
                                </div>
                                <div className="cd-confirm-row">
                                  <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ጠቅላላ' : 'Total Price'}</span>
                                  <span style={{ fontWeight: 600 }}>{formatETB(inst.totalPrice)}</span>
                                </div>
                                <div className="cd-confirm-row">
                                  <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ተጨማሪ ክፍያ' : 'Markup'}</span>
                                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>+{formatETB(inst.markup)} ({(inst.markupPct * 100)}%)</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Kircha share selector */}
                      {selectedAnimal.type === 'kircha' && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                            {activePool && activePool.bookedShares > 0 ? (lang === 'am' ? 'ገንዳው ተቆልፏል:' : 'Pool locked:') : t.splitBetweenFamilies}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            {[3, 5, 7].map(n => {
                              const isLocked = activePool && activePool.bookedShares > 0;
                              return (
                                <button key={n} className={`cd-chip ${kirchaShares === n ? 'selected' : ''}`}
                                  style={{ flex: 1, opacity: isLocked && kirchaShares !== n ? 0.4 : 1 }}
                                  onClick={() => !isLocked && setKirchaShares(n)} disabled={isLocked}>÷{n} {lang === 'am' ? 'ቤተሰቦች' : 'families'}</button>
                              );
                            })}
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--purple)' }}>
                            {lang === 'am' ? 'የእርስዎ ድርሻ' : 'Your share'}: {formatETB(Math.round(selectedAnimal.price / kirchaShares))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Step 1: Delivery ── */}
                  {orderStep === 1 && (
                    <div className="animate-in">
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {lang === 'am' ? 'የማድረሻ ዘዴ ይምረጡ' : 'Choose delivery method'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <button className={`cd-chip ${deliveryOption === 'delivery' ? 'selected' : ''}`} onClick={() => { vibrate(); setDeliveryOption('delivery'); }} style={{ flex: 1, minHeight: 48, gap: 6 }}>
                          🚚 {lang === 'am' ? 'ማድረስ' : 'Delivery'}
                        </button>
                        <button className={`cd-chip ${deliveryOption === 'pickup' ? 'selected' : ''}`} onClick={() => { vibrate(); setDeliveryOption('pickup'); }} style={{ flex: 1, minHeight: 48, gap: 6 }}>
                          🏪 {lang === 'am' ? 'ራስ ማንሳት' : 'Pickup'}
                        </button>
                      </div>

                      {deliveryOption === 'pickup' && (
                        <div style={{ background: 'linear-gradient(135deg, hsla(210,100%,50%,0.08), hsla(150,80%,45%,0.06))', border: '1px solid hsla(210,100%,50%,0.18)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <MapPin size={18} color="#3b82f6" />
                            <strong style={{ fontSize: '0.88rem' }}>{lang === 'am' ? 'የመውሰጃ ቦታ' : 'Pickup Location'}</strong>
                          </div>
                          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            <div style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>📍 </strong>{selectedAnimal.locationArea} {lang === 'am' ? 'ማዕከል' : 'Market Center'}</div>
                            <div style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>🕐 </strong>{lang === 'am' ? 'ከ2-12 ሰዓት (ሰኞ-ቅዳሜ)' : '8AM–6PM (Mon–Sat)'}</div>
                            <div><strong style={{ color: 'var(--text-primary)' }}>📞 </strong>+251-11-XXX-XXXX</div>
                          </div>
                          <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={12} color="#22c55e" />
                            {lang === 'am' ? 'ማረጋገጫ ኮድ በSMS ይላካል' : 'Pickup code sent via SMS after confirmation'}
                          </div>
                        </div>
                      )}

                      {deliveryOption === 'delivery' && (
                        <>
                          <div className="form-group">
                            <label className="form-label">{lang === 'am' ? 'የማድረሻ አድራሻ' : 'Delivery Address'}</label>
                            <input type="text" className="form-input" placeholder={lang === 'am' ? 'ለምሳሌ: ቦሌ ክፍለ ከተማ, ወረዳ 03' : 'e.g. Bole Sub-City, Woreda 03'} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">{lang === 'am' ? 'የማድረሻ ቀን' : 'Delivery Date'}</label>
                            <input type="date" className="form-input"
                              min={selectedAnimal?.availableDate?.slice(0, 10) > new Date(Date.now() + 86400000).toISOString().slice(0, 10) ? selectedAnimal.availableDate.slice(0, 10) : new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                              max={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
                              value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">{t.deliveryZone}</label>
                            <select className="form-input form-select" value={deliveryZone} onChange={e => setDeliveryZone(e.target.value)} id="delivery-zone">
                              {Object.keys(DELIVERY_ZONES).map(zone => <option key={zone} value={zone}>{zone}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">{t.deliveryTimeWindow}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {DELIVERY_TIME_WINDOWS.map(tw => (
                                <button key={tw} className={`cd-chip ${deliveryTimeWindow === tw ? 'selected' : ''}`}
                                  onClick={() => { vibrate(); setDeliveryTimeWindow(tw); }}
                                  style={{ justifyContent: 'center', fontSize: '0.75rem', minHeight: 44 }}>
                                  <Clock size={12} /> {lang === 'am' && tw.includes('Morning') ? 'ጠዋት' : lang === 'am' && tw.includes('Afternoon') ? 'ከሰዓት' : lang === 'am' && tw.includes('Evening') ? 'ማታ' : lang === 'am' && tw.includes('Full') ? 'ሙሉ ቀን' : tw}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Step 2: Payment & Insurance ── */}
                  {orderStep === 2 && (
                    <div className="animate-in">
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {lang === 'am' ? 'የክፍያ ዘዴ ይምረጡ' : 'Choose payment method'}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        {METHODS.map(m => (
                          <button key={m.key} className={`cd-method-card ${paymentMethod === m.key ? 'selected' : ''}`}
                            onClick={() => { vibrate(); setPaymentMethod(m.key); }} id={`pay-${m.key}`}
                            style={{ '--method-color': m.color }}>
                            <span style={{ color: m.color, marginBottom: 6 }}>{m.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{m.label}</span>
                          </button>
                        ))}
                      </div>

                      {paymentMethod === 'wallet' && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{lang === 'am' ? 'ቀሪ ሂሳብ:' : 'Balance:'} <strong style={{ color: 'var(--green-bright)' }}>{formatETB(getPrimaryBalance())}</strong></span>
                          <span>{lang === 'am' ? 'ከክፍያ በኋላ:' : 'After:'} <strong style={{ color: getPrimaryBalance() - getOrderTotal() >= 100 ? 'var(--green-bright)' : 'var(--red)' }}>{formatETB(getPrimaryBalance() - getOrderTotal())}</strong></span>
                        </div>
                      )}

                      {/* Vet insurance */}
                      {selectedAnimal.insurancePremium !== undefined && (
                        <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border-light)' }}>
                          <input type="checkbox" id="vet-insurance-check" checked={vetInsurance} onChange={e => setVetInsurance(e.target.checked)} style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }} />
                          <label htmlFor="vet-insurance-check" style={{ fontSize: '0.8rem', cursor: 'pointer', flex: 1 }}>
                            <strong>🛡️ {lang === 'am' ? 'የእንስሳት ሐኪም መድን (+5%)' : 'Vet Insurance (+5%)'}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                              {lang === 'am' ? 'በማጓጓዣ እና ከደረሰ በኋላ ለ48 ሰዓታት ሽፋን' : 'Covers transport & 48hr post-delivery'}
                            </div>
                          </label>
                        </div>
                      )}

                      {/* Installment reminder */}
                      {purchaseType === 'installment' && (
                        <div style={{ background: 'var(--gold-soft)', border: '1px solid hsla(45,100%,51%,0.2)', borderRadius: 'var(--radius-md)', padding: 12, marginTop: 12, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          📅 {lang === 'am'
                            ? `${installmentMonths} ወራት የእኩብ ክፍያ — የመጀመሪያ ክፍያ ዛሬ`
                            : `${installmentMonths}-month installment — first payment today`}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Step 3: Review & Confirm ── */}
                  {orderStep === 3 && (
                    <div className="animate-in">
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {lang === 'am' ? 'ዝርዝሮችን ያረጋግጡ' : 'Review your order'}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16 }}>
                        <div className="cd-confirm-row">
                          <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'የግዢ ዓይነት' : 'Purchase Type'}</span>
                          <span style={{ fontWeight: 600 }}>
                            {purchaseType === 'installment'
                              ? `📅 ${lang === 'am' ? 'እኩብ' : 'Installment'} (${installmentMonths} ${lang === 'am' ? 'ወር' : 'mo'})`
                              : `💵 ${lang === 'am' ? 'ጥሬ ገንዘብ' : 'Cash'}`}
                          </span>
                        </div>
                        <div className="cd-confirm-row">
                          <span style={{ color: 'var(--text-secondary)' }}>{t.animalPrice}{selectedAnimal.type === 'kircha' ? ` (÷${kirchaShares})` : ''}</span>
                          <span style={{ fontWeight: 600 }}>{formatETB(getBasePrice())}</span>
                        </div>
                        {purchaseType === 'installment' && (() => {
                          const inst = getInstallmentPrice(getBasePrice(), installmentMonths);
                          return inst ? (
                            <>
                              <div className="cd-confirm-row">
                                <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ተጨማሪ' : 'Markup'} ({(inst.markupPct * 100)}%)</span>
                                <span style={{ fontWeight: 600 }}>+{formatETB(inst.markup)}</span>
                              </div>
                              <div className="cd-confirm-row">
                                <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ወርሃዊ' : 'Monthly'}</span>
                                <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatETB(inst.monthlyPayment)}/{lang === 'am' ? 'ወር' : 'mo'}</span>
                              </div>
                            </>
                          ) : null;
                        })()}
                        {deliveryOption === 'delivery' && breakdown && (
                          <>
                            <div className="cd-confirm-row">
                              <span style={{ color: 'var(--text-secondary)' }}>{t.transport} ({breakdown.distance} km)</span>
                              <span style={{ fontWeight: 600 }}>{formatETB(breakdown.transport)}</span>
                            </div>
                            <div className="cd-confirm-row">
                              <span style={{ color: 'var(--text-secondary)' }}>{t.labor}</span>
                              <span style={{ fontWeight: 600 }}>{formatETB(breakdown.labor)}</span>
                            </div>
                            <div className="cd-confirm-row">
                              <span style={{ color: 'var(--text-secondary)' }}>{t.insurance}</span>
                              <span style={{ fontWeight: 600 }}>{formatETB(breakdown.insurance)}</span>
                            </div>
                          </>
                        )}
                        {vetInsurance && (
                          <div className="cd-confirm-row">
                            <span style={{ color: 'var(--text-secondary)' }}>🛡️ {lang === 'am' ? 'መድን' : 'Vet Insurance'} (5%)</span>
                            <span style={{ fontWeight: 600, color: '#3b82f6' }}>+{formatETB(Math.round(getBasePrice() * 0.05))}</span>
                          </div>
                        )}
                        <div className="cd-confirm-row">
                          <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ዘዴ' : 'Payment'}</span>
                          <span style={{ fontWeight: 600 }}>{METHODS.find(m => m.key === paymentMethod)?.label || paymentMethod}</span>
                        </div>
                        <div className="cd-confirm-row">
                          <span style={{ color: 'var(--text-secondary)' }}>{lang === 'am' ? 'ማድረሻ' : 'Delivery'}</span>
                          <span style={{ fontWeight: 600 }}>
                            {deliveryOption === 'delivery' ? `🚚 ${deliveryZone}` : `🏪 ${lang === 'am' ? 'ራስ ማንሳት' : 'Pickup'}`}
                          </span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 12, paddingTop: 12 }}>
                          <div className="cd-confirm-row">
                            <span style={{ fontWeight: 700 }}>{t.total}</span>
                            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--gold)' }}>{formatETB(getOrderTotal())}</span>
                          </div>
                        </div>
                        {paymentMethod === 'wallet' && getPrimaryBalance() - getOrderTotal() < 100 && (
                          <div style={{ color: 'var(--red)', fontSize: '0.72rem', marginTop: 6, fontWeight: 600, textAlign: 'center' }}>
                            ⚠️ {lang === 'am' ? 'ቢያንስ 100 ብር መያዣ መቅረት አለበት!' : '100 ETB minimum reserve must remain!'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  {orderStep < 3 ? (
                    <>
                      <button className="btn btn-secondary" onClick={() => { vibrate(); orderStep > 0 ? goBack() : setShowOrder(false); }} disabled={actionLoading}>
                        {orderStep === 0 ? t.cancel : (lang === 'am' ? 'ተመለስ' : 'Back')}
                      </button>
                      <button className="btn btn-success" onClick={goToNextStep} disabled={actionLoading} id="order-next">
                        {lang === 'am' ? 'ቀጣይ →' : 'Next →'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-secondary" onClick={goBack} disabled={actionLoading}>
                        {lang === 'am' ? 'ተመለስ' : 'Back'}
                      </button>
                      <button className="btn btn-success" onClick={confirmOrder} disabled={actionLoading} id="confirm-order">
                        {actionLoading ? (
                          <><span className="btn-spinner" /> {lang === 'am' ? 'በማስኬድ ላይ...' : 'Processing...'}</>
                        ) : (
                          <><CheckCircle size={16} /> {t.confirmPurchase}</>
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

      {/* ═══════════════════════════════════════════════════════════════
          CANCEL ORDER MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {cancelOrderId && (
        <div className="modal-overlay" onClick={() => setCancelOrderId(null)}>
          <div className="modal scale-in" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{lang === 'am' ? 'ትዕዛዝ ሰርዝ ✗' : 'Cancel Order'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setCancelOrderId(null)} disabled={actionLoading}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                {lang === 'am' ? 'እርግጠኛ ነዎት? ተመላሽ ክፍያው በአስተዳዳሪ ማረጋገጫ ይጠብቃል።' : 'Are you sure? Refund pending admin approval.'}
              </p>
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'ምክንያት' : 'Reason'}</label>
                <textarea className="form-input" rows={3} placeholder={lang === 'am' ? 'ምክንያትዎን ያስገቡ...' : 'Enter reason...'} value={cancelReasonText} onChange={e => setCancelReasonText(e.target.value)} style={{ resize: 'none', padding: 12 }} disabled={actionLoading} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCancelOrderId(null)} disabled={actionLoading}>{t.cancel}</button>
              <button className="btn btn-danger" onClick={handleConfirmCancel} disabled={actionLoading || !cancelReasonText.trim()}>
                {actionLoading ? <><span className="btn-spinner" /> {lang === 'am' ? 'በመሰረዝ...' : 'Cancelling...'}</> : (lang === 'am' ? 'ሰርዝ' : 'Confirm Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          RATE SELLER MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {rateOrderId && (
        <div className="modal-overlay" onClick={() => setRateOrderId(null)}>
          <div className="modal scale-in" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{lang === 'am' ? 'ሻጭ ደረጃ ስጥ ⭐️' : 'Rate Seller'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setRateOrderId(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                {lang === 'am' ? 'ምን ያህል ኮከብ ይሰጣሉ?' : 'How would you rate this seller?'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRatingValue(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', transform: ratingValue >= star ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s ease' }}>
                    <Star size={36} fill={ratingValue >= star ? 'var(--gold)' : 'none'} color={ratingValue >= star ? 'var(--gold)' : 'var(--text-muted)'} />
                  </button>
                ))}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gold)' }}>{ratingValue} / 5</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRateOrderId(null)} disabled={actionLoading}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleConfirmRate} disabled={actionLoading}>
                {actionLoading ? <><span className="btn-spinner" /> {lang === 'am' ? 'በማስገባት...' : 'Submitting...'}</> : (lang === 'am' ? 'አስገባ' : 'Submit Rating')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          INSURANCE CLAIM MODAL
      ═══════════════════════════════════════════════════════════════ */}
      {claimOrderId && (
        <div className="modal-overlay" onClick={() => setClaimOrderId(null)}>
          <div className="modal scale-in" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🛡️ {lang === 'am' ? 'የኢንሹራንስ ካሳ ጥያቄ' : 'File Insurance Claim'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setClaimOrderId(null)} disabled={actionLoading}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                {lang === 'am' ? 'ችግሩን በዝርዝር ይግለጹ። ቡድናችን ይመረምራል።' : 'Describe the issue. Our team will review the claim.'}
              </p>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{lang === 'am' ? 'ትዕዛዝ' : 'Order'}</label>
                <input className="form-input" value={`#${claimOrderId.slice(-6)}`} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'ዝርዝር' : 'Description'}</label>
                <textarea className="form-input" rows={4} placeholder={lang === 'am' ? 'ችግሩን ይግለጹ...' : 'Describe the issue...'} value={claimMessage} onChange={e => setClaimMessage(e.target.value)} style={{ resize: 'none', padding: 12 }} disabled={actionLoading} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setClaimOrderId(null)} disabled={actionLoading}>{t.cancel}</button>
              <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--purple), hsla(270,70%,60%,0.85))', border: 'none' }} onClick={handleConfirmClaim} disabled={actionLoading || !claimMessage.trim()}>
                {actionLoading ? <><span className="btn-spinner" /> {lang === 'am' ? 'በማስገባት...' : 'Submitting...'}</> : (lang === 'am' ? 'አስገባ' : 'Submit Claim')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
