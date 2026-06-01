import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, MapPin, Weight, Star, Heart, ShoppingCart,
  Truck, User, CheckCircle, X, Package, Calendar,
  Filter, Clock, CreditCard, ArrowUpDown, Users
} from 'lucide-react';
import {
  placeOrder, getDeliveryBreakdown,
  formatETB, formatDate, ANIMAL_EMOJIS, ANIMAL_TYPES, DELIVERY_ZONES,
  DELIVERY_TIME_WINDOWS, PAYMENT_METHODS_ORDER, TRANSLATIONS, getPrimaryBalance,
  toggleFavorite, getKirchaPool,
  cancelOrder, rateOrder, createSupportTicket
} from '../db';
import { fetchAnimals, fetchOrders, fetchFavorites, fetchWallets } from '../api';

// Helper: read a value from sessionStorage with a fallback default
const ssGet = (key, fallback) => {
  try { const v = sessionStorage.getItem('yb_mkt_' + key); return v !== null ? v : fallback; }
  catch { return fallback; }
};

export default function Marketplace({ onRefresh, lang, showToast, user }) {
  const queryClient = useQueryClient();

  const { data: animalsRaw = { animals: [] } } = useQuery({ queryKey: ['animals'], queryFn: fetchAnimals });
  const { data: ordersRaw = [] } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const { data: favoritesRaw = [] } = useQuery({ queryKey: ['favorites'], queryFn: fetchFavorites });
  const { data: walletsRaw = [] } = useQuery({ queryKey: ['wallets'], queryFn: fetchWallets });

  const animals = (animalsRaw.animals || animalsRaw || []).filter(a => a.isActive && a.isApproved);
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

  // Persist filter state to sessionStorage whenever any filter value changes
  useEffect(() => {
    const vals = { search, typeFilter, priceRange, locationFilter, ratingFilter, dateFilter, certFilter, sortBy, activeTab };
    Object.entries(vals).forEach(([k, v]) => { try { sessionStorage.setItem('yb_mkt_' + k, v); } catch {} });
  }, [search, typeFilter, priceRange, locationFilter, ratingFilter, dateFilter, certFilter, sortBy, activeTab]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('delivery');
  const [deliveryZone, setDeliveryZone] = useState('Megenagna');
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState(DELIVERY_TIME_WINDOWS[0]);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [kirchaShares, setKirchaShares] = useState(3);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [activePool, setActivePool] = useState(null);
  const [loadingPool, setLoadingPool] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New checkout fields
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [vetInsurance, setVetInsurance] = useState(false);

  // New order action fields
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [rateOrderId, setRateOrderId] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [claimOrderId, setClaimOrderId] = useState(null);
  const [claimMessage, setClaimMessage] = useState('');

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const handleConfirmCancel = async () => {
    setActionLoading(true);
    try {
      await cancelOrder(cancelOrderId, cancelReasonText);
      showToast(
        lang === 'am' ? 'ትዕዛዙ ተሰርዟል፤ ተመላሽ ክፍያው እየተመረመረ ነው' : 'Order cancelled. Refund pending admin review.',
        'success'
      );
      setCancelOrderId(null);
      setCancelReasonText('');
      refresh();
    } catch (err) {
      showToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRate = async () => {
    setActionLoading(true);
    try {
      await rateOrder(rateOrderId, ratingValue);
      showToast(
        lang === 'am' ? 'ደረጃ ስኬታማ በሆነ መንገድ ተሰጥቷል! እናመሰግናለን።' : 'Seller rated successfully! Thank you.',
        'success'
      );
      setRateOrderId(null);
      refresh();
    } catch (err) {
      showToast(err.message || 'Failed to rate seller', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmClaim = async () => {
    setActionLoading(true);
    try {
      const title = `Insurance Claim for Order #${claimOrderId.slice(-6)}`;
      await createSupportTicket(title, claimMessage, 'INSURANCE_CLAIM');
      showToast(
        lang === 'am' ? 'የኢንሹራንስ ካሳ ጥያቄዎ በተሳካ ሁኔታ ተልኳል 🛡️' : 'Insurance claim submitted successfully! 🛡️',
        'success'
      );
      setClaimOrderId(null);
      setClaimMessage('');
      refresh();
    } catch (err) {
      showToast(err.message || 'Failed to submit claim', 'error');
    } finally {
      setActionLoading(false);
    }
  };

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

  const locations = [...new Set(animals.map(a => a.location.area))];

  const filtered = animals
    .filter(a => {
      if (!a.isApproved) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (locationFilter !== 'all' && a.location.area !== locationFilter) return false;
      if (ratingFilter === '4.5+' && a.sellerRating < 4.5) return false;
      if (ratingFilter === '4.7+' && a.sellerRating < 4.7) return false;
      if (certFilter === 'certified' && !a.healthCertificate) return false;
      if (activeTab === 'favorites' && !favorites.includes(a.id)) return false;
      if (dateFilter && new Date(a.availableDate) > new Date(dateFilter)) return false;
      if (search && ![a.breed, a.type, a.description, a.sellerName, a.location.area]
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

  const openDetail = async (animal) => {
    setSelectedAnimal(animal);
    setShowDetail(true);
    if (animal.type === 'kircha') {
      setLoadingPool(true);
      try {
        const pool = await getKirchaPool(animal.id);
        setActivePool(pool);
        if (pool && pool.bookedShares > 0) {
          setKirchaShares(pool.totalShares);
        } else {
          setKirchaShares(5); // default
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPool(false);
      }
    } else {
      setActivePool(null);
    }
  };

  const openOrder = async (animal) => {
    setSelectedAnimal(animal);
    setDeliveryOption('delivery');
    setDeliveryZone('Megenagna');
    setDeliveryTimeWindow(DELIVERY_TIME_WINDOWS[0]);
    setPaymentMethod('wallet');
    setShowDetail(false);
    setOrderSuccess(false);
    setDeliveryAddress('');
    setDeliveryDate('');
    setVetInsurance(false);

    if (animal.type === 'kircha') {
      setLoadingPool(true);
      try {
        const pool = await getKirchaPool(animal.id);
        setActivePool(pool);
        if (pool && pool.bookedShares > 0) {
          setKirchaShares(pool.totalShares);
        } else {
          setKirchaShares(5);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPool(false);
      }
    } else {
      setActivePool(null);
    }
    setShowOrder(true);
  };

  const confirmOrder = async () => {
    if (!selectedAnimal) return;
    
    if (deliveryOption === 'delivery' && !deliveryAddress.trim()) {
      const msg = lang === 'am' ? 'እባክዎ የማድረሻ አድራሻ ያስገቡ።' : 'Please enter a delivery address.';
      if (showToast) showToast(msg, 'warning');
      else alert(msg);
      return;
    }

    if (deliveryOption === 'delivery' && !deliveryDate) {
      const msg = lang === 'am' ? 'እባክዎ የማድረሻ ቀን ይምረጡ።' : 'Please select a delivery date.';
      if (showToast) showToast(msg, 'warning');
      else alert(msg);
      return;
    }

    const balance = getPrimaryBalance();
    const total = getOrderTotal();
    
    if (paymentMethod === 'wallet' && balance < total) {
      if (showToast) {
        showToast(
          lang === 'am'
            ? `የኪስ ቦርሳ ቀሪ ሂሳብ በቂ አይደለም። ያለዎት ${formatETB(balance)} ነው ነገር ግን ${formatETB(total)} ያስፈልጋል።`
            : `Insufficient wallet balance. You have ${formatETB(balance)} but need ${formatETB(total)}.`,
          'warning'
        );
      } else {
        alert(`Insufficient wallet balance. You have ${formatETB(balance)} but need ${formatETB(total)}.`);
      }
      return;
    }

    // 100 ETB Reserve check
    if (paymentMethod === 'wallet' && (balance - total) < 100) {
      const msg = lang === 'am'
        ? `ትዕዛዝ ማከናወን አይቻልም። ከግዢው በኋላ ቢያንስ 100 ብር መያዣ በኪስ ቦርሳዎ ውስጥ መቅረት አለበት (ያለዎት ቀሪ ሂሳብ: ${formatETB(balance)})።`
        : `Cannot complete purchase. A minimum wallet reserve of 100 ETB must remain in your wallet after checkout.`;
      if (showToast) showToast(msg, 'warning');
      else alert(msg);
      return;
    }

    setActionLoading(true);
    try {
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
        }
      );
      setOrderSuccess(true);
      if (showToast) {
        showToast(lang === 'am' ? 'ትዕዛዝዎ በስኬት ተመዝግቧል! 🎉' : 'Order placed successfully! 🎉', 'success');
      }
      setTimeout(() => { setShowOrder(false); setOrderSuccess(false); refresh(); }, 2000);
    } catch (err) {
      if (showToast) {
        showToast(err.message || 'Failed to place order', 'error');
      } else {
        alert(err.message || 'Failed to place order');
      }
    } finally {
      setActionLoading(false);
    }
  };
 
  const getOrderTotal = () => {
    if (!selectedAnimal) return 0;
    const basePrice = selectedAnimal.type === 'kircha' ? Math.round(selectedAnimal.price / kirchaShares) : selectedAnimal.price;
    const insuranceFee = vetInsurance ? Math.round(basePrice * 0.05) : 0;
    if (deliveryOption !== 'delivery') return basePrice + insuranceFee;
    const bd = getDeliveryBreakdown(selectedAnimal.location.area, deliveryZone, selectedAnimal.type, basePrice);
    return bd.grandTotal + insuranceFee;
  };
 
  const breakdown = selectedAnimal && deliveryOption === 'delivery'
    ? (() => {
        const basePrice = selectedAnimal.type === 'kircha' ? Math.round(selectedAnimal.price / kirchaShares) : selectedAnimal.price;
        return getDeliveryBreakdown(selectedAnimal.location.area, deliveryZone, selectedAnimal.type, basePrice);
      })()
    : null;

  const clearFilters = () => {
    setTypeFilter('all'); setPriceRange('all'); setLocationFilter('all');
    setRatingFilter('all'); setDateFilter(''); setCertFilter('all'); setSearch(''); setSortBy('default');
    // Also clear sessionStorage so filters are truly reset
    ['search','typeFilter','priceRange','locationFilter','ratingFilter','dateFilter','certFilter','sortBy'].forEach(k => {
      try { sessionStorage.removeItem('yb_mkt_' + k); } catch {}
    });
  };

  const activeFilterCount = [typeFilter !== 'all', priceRange !== 'all', locationFilter !== 'all', ratingFilter !== 'all', dateFilter !== '', certFilter !== 'all'].filter(Boolean).length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>{t.marketplace} 🏪</h2>
        <p>Browse quality livestock from verified sellers across Addis Ababa</p>
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
                <option value="price-asc">{lang === 'am' ? 'ዋጋ: ከዝቅተኛ ወደ ከፍተኛ' : 'Price: Low → High'}</option>
                <option value="price-desc">{lang === 'am' ? 'ዋጋ: ከከፍተኛ ወደ ዝቅተኛ' : 'Price: High → Low'}</option>
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
              {filtered.map(animal => {
                const isFav = favorites.includes(animal.id);
                const isKircha = animal.type === 'kircha';
                return (
                  <div key={animal.id} className="animal-card" onClick={() => openDetail(animal)} style={{ cursor: 'pointer' }}>
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
                        <span><MapPin size={13} /> {animal.location.area}</span>
                        <span><Star size={13} fill="var(--gold)" color="var(--gold)" /> {animal.sellerRating}</span>
                        {animal.age && <span><Clock size={13} /> {animal.age}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justify_content: 'space-between', marginTop: 4 }}>
                        <div>
                          <div className="animal-card-price">{formatETB(animal.price)}</div>
                          {isKircha && <div style={{ fontSize: '0.68rem', color: 'var(--purple)', fontWeight: 600 }}>÷ {3} {lang === 'am' ? 'ቤተሰቦች' : 'families'} = {formatETB(Math.round(animal.price / 3))} {lang === 'am' ? 'በአንድ ቤተሰብ' : 'each'}</div>}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <Calendar size={10} /> {formatDate(animal.availableDate)}
                        </span>
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

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📦</div><h3>{lang === 'am' ? 'ምንም ትዕዛዝ የለም' : 'No Orders Yet'}</h3><p>{lang === 'am' ? 'ገበያውን ይጎብኙ እና የመጀመሪያዎን ትዕዛዝ ያስገቡ' : 'Browse the marketplace and place your first order'}</p></div>
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
                          {order.paymentMethod && (
                            <span className="badge badge-muted" style={{ marginTop: 4, fontSize: '0.65rem' }}>
                              {translateMethod(order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'telebirr' ? 'Telebirr' : 'Wallet')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1.1rem' }}>{formatETB(order.totalPrice)}</div>
                        <span className={`badge ${sd.className}`}>
                          {sd.text}
                        </span>
                      </div>
                    </div>
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

                    {/* Delivery / Address Details */}
                    {order.deliveryOption === 'delivery' && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                        <div style={{ marginBottom: 4 }}>
                          <strong>{lang === 'am' ? '📍 የማድረሻ አድራሻ: ' : '📍 Delivery Address: '}</strong> {order.deliveryAddress || 'N/A'}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>{lang === 'am' ? '📅 የማድረሻ ቀን: ' : '📅 Delivery Date: '}</strong> {order.deliveryDate ? formatDate(order.deliveryDate) : 'N/A'}
                        </div>
                        {order.deliveryFee > 0 && (
                          <div>
                            <strong>{lang === 'am' ? '💵 የማድረሻ ክፍያ: ' : '💵 Delivery Fee: '}</strong> {formatETB(order.deliveryFee)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Vet Insurance Status */}
                    {order.insuranceAdded && (
                      <div style={{ 
                        fontSize: '0.8rem', color: 'var(--green-bright)', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6, background: 'var(--green-soft)',
                        padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid hsla(120,72%,45%,0.15)'
                      }}>
                        🛡️ <span>{lang === 'am' ? `የእንስሳት ሐኪም ዋስትና ንቁ ነው (+${formatETB(order.insurancePremium)})` : `Vet Insurance Active (+${formatETB(order.insurancePremium)})`}</span>
                      </div>
                    )}

                    {/* Cancellation Details */}
                    {order.deliveryStatus === 'cancelled' && (
                      <div style={{ 
                        fontSize: '0.82rem', color: 'var(--red)', background: 'var(--red-soft)', 
                        padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid hsla(0,72%,55%,0.15)' 
                      }}>
                        <div style={{ marginBottom: 4 }}>
                          <strong>{lang === 'am' ? 'የተሰረዘበት ምክንያት: ' : 'Cancellation Reason: '}</strong> {order.cancelReason || 'N/A'}
                        </div>
                        {order.cancelledAt && (
                          <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                            {lang === 'am' ? 'የተሰረዘበት ቀን: ' : 'Cancelled At: '} {formatDate(order.cancelledAt)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border-light)', paddingTop: 10, flexWrap: 'wrap' }}>
                      {order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'cancelled' && (
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => { setCancelOrderId(order.id); setCancelReasonText(''); }}
                        >
                          {lang === 'am' ? 'ትዕዛዝ ሰርዝ ✗' : 'Cancel Order ✗'}
                        </button>
                      )}
                      
                      {order.deliveryStatus === 'delivered' && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => { setRateOrderId(order.id); setRatingValue(5); }}
                        >
                          ⭐️ {lang === 'am' ? 'ሻጭ ደረጃ ስጥ' : 'Rate Seller'}
                        </button>
                      )}

                      {order.deliveryStatus === 'delivered' && order.insuranceAdded && (
                        <button 
                          className="btn btn-sm" 
                          style={{ background: 'linear-gradient(135deg, var(--purple), hsla(270,70%,60%,0.85))', color: 'white', border: 'none' }}
                          onClick={() => { setClaimOrderId(order.id); setClaimMessage(''); }}
                        >
                          🛡️ {lang === 'am' ? 'የኢንሹራንስ ካሳ ጠይቅ' : 'File Insurance Claim'}
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

      {/* Animal Detail Modal */}
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
                      <Users size={16} />
                      {lang === 'am' ? 'የኪርቻ የጋራ ግዥ ገንዳ' : 'Kircha Group Pool'}
                    </div>
                    {activePool && activePool.bookedShares > 0 && (
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                        {lang === 'am' ? 'ገንዳው ተጀምሯል' : 'Pool Started'}
                      </span>
                    )}
                  </div>

                  {/* Pool Progress Bar */}
                  {loadingPool ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                      <span className="spinner-sm" />
                      {lang === 'am' ? 'የኪርቻ መረጃ በመጫን ላይ...' : 'Loading pool details...'}
                    </div>
                  ) : activePool ? (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4, color: 'var(--text-secondary)' }}>
                        <span>
                          {lang === 'am'
                            ? `የተያዙ ቦታዎች: ${activePool.bookedShares} ከ ${activePool.totalShares}`
                            : `Booked Shares: ${activePool.bookedShares} of ${activePool.totalShares}`}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--purple)' }}>
                          {Math.round((activePool.bookedShares / activePool.totalShares) * 100)}%
                        </span>
                      </div>
                      <div className="progress-bar" style={{ height: 10 }}>
                        <div
                          className="progress-fill purple"
                          style={{ width: `${(activePool.bookedShares / activePool.totalShares) * 100}%` }}
                        />
                      </div>

                      {activePool.members && activePool.members.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                            {lang === 'am' ? 'የገንዳው አባላት' : 'Pool Members'}:
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {activePool.members.map((m, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: 'var(--bg-elevated)',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.72rem',
                                  border: '1px solid var(--border-light)'
                                }}
                              >
                                <div style={{
                                  width: 16, height: 16, borderRadius: '50%',
                                  background: 'var(--purple)', color: 'white',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.6rem', fontWeight: 700
                                }}>
                                  {m.avatar || m.fullName[0].toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 500 }}>{m.fullName}</span>
                                <span style={{ color: 'var(--text-muted)' }}>({m.shares} {lang === 'am' ? 'እጣ' : 'sh'})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                    {t.kirchaDesc}
                  </p>

                  {/* Division controls */}
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      {lang === 'am' ? 'የድርሻ ክፍፍል መምረጫ (አዲስ ገንዳ ከሆነ ብቻ)' : 'Pool Division (First buyer determines division)'}:
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[3, 5, 7].map(n => {
                        const isLocked = activePool && activePool.bookedShares > 0;
                        const isSelected = kirchaShares === n;
                        return (
                          <button
                            key={n}
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ minWidth: 48, opacity: isLocked && !isSelected ? 0.4 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                            onClick={() => !isLocked && setKirchaShares(n)}
                            disabled={isLocked}
                            title={isLocked ? 'Division is locked for active pools' : ''}
                          >
                            ÷{n}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 10, fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold)' }}>
                      {t.yourShare}: {formatETB(Math.round(selectedAnimal.price / kirchaShares))} ({lang === 'am' ? `ከ ${kirchaShares} ቤተሰብ 1` : `1 of ${kirchaShares} families`})
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: t.breed, value: selectedAnimal.breed },
                  { label: lang === 'am' ? 'ክብደት' : 'Weight', value: `${selectedAnimal.weight} ${lang === 'am' ? 'ኪ.ግ' : 'kg'}` },
                  { label: t.age, value: selectedAnimal.age || 'N/A' },
                  { label: lang === 'am' ? 'ቦታ' : 'Location', value: selectedAnimal.location.area },
                  { label: lang === 'am' ? 'የሚገኝበት ቀን' : 'Available', value: formatDate(selectedAnimal.availableDate) },
                  { label: lang === 'am' ? 'የጤና ማረጋገጫ' : 'Health Cert.', value: selectedAnimal.healthCertificate ? (lang === 'am' ? '✓ አዎ' : '✓ Yes') : (lang === 'am' ? '✗ የለም' : '✗ No'), color: selectedAnimal.healthCertificate ? 'var(--green-bright)' : 'var(--text-muted)' },
                  { label: lang === 'am' ? 'ጾታ' : 'Gender', value: selectedAnimal.gender || (lang === 'am' ? 'ወንድ' : 'Male') },
                  { label: lang === 'am' ? 'የጤና ሁኔታ' : 'Health Status', value: selectedAnimal.healthStatus || (lang === 'am' ? 'በጣም ጥሩ' : 'Excellent'), color: '#22c55e' },
                  { label: lang === 'am' ? 'ክትባት' : 'Vaccination', value: selectedAnimal.vaccinationStatus ? (lang === 'am' ? 'የተከተበ' : 'Vaccinated') : (lang === 'am' ? 'ያልተከተበ' : 'Not Vaccinated'), color: selectedAnimal.vaccinationStatus ? '#22c55e' : 'var(--text-muted)' },
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
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.verifiedSeller} · {selectedAnimal.location.area}</div>
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

      {/* Order Modal */}
      {showOrder && selectedAnimal && (
        <div className="modal-overlay" onClick={() => !orderSuccess && setShowOrder(false)}>
          <div className="modal scale-in" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            {orderSuccess ? (
              <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: 8 }}>{t.orderPlaced}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {deliveryOption === 'delivery' ? `${t.deliveringTo} ${deliveryZone} · ${deliveryTimeWindow}` : `${t.readyForPickup} ${selectedAnimal.location.area}`}
                </p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h3>🛒 {t.placeOrder}</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowOrder(false)}><X size={18} /></button>
                </div>
                <div className="modal-body">
                  <div style={{ display: 'flex', gap: 14, background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 18 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>{ANIMAL_EMOJIS[selectedAnimal.type]}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{selectedAnimal.breed} {translateAnimal(selectedAnimal.type)}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{selectedAnimal.weight}{lang === 'am' ? 'ኪ.ግ' : 'kg'} · {selectedAnimal.location.area} · ⭐ {selectedAnimal.sellerRating}</div>
                      {selectedAnimal.type === 'kircha' && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                            {activePool && activePool.bookedShares > 0
                              ? (lang === 'am' ? 'ገንዳው የተዘጋጀው ለ:' : 'Pool locked to division:')
                              : t.splitBetweenFamilies}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[3, 5, 7].map(n => {
                              const isLocked = activePool && activePool.bookedShares > 0;
                              const isSelected = kirchaShares === n;
                              return (
                                <button
                                  key={n}
                                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                  style={{ padding: '3px 8px', fontSize: '0.72rem', opacity: isLocked && !isSelected ? 0.4 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                                  disabled={isLocked}
                                  onClick={() => !isLocked && setKirchaShares(n)}
                                >
                                  ÷{n}
                                </button>
                              );
                            })}
                          </div>
                          <div style={{ marginTop: 6, fontSize: '0.82rem', fontWeight: 700, color: 'var(--purple)' }}>
                            {lang === 'am' ? 'የእርስዎ ድርሻ' : 'Your share'}: {formatETB(Math.round(selectedAnimal.price / kirchaShares))}
                            {activePool && activePool.bookedShares > 0 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: 8, fontWeight: 500 }}>
                                ({lang === 'am' ? `${activePool.bookedShares}/${activePool.totalShares} ቦታ ተይዟል` : `${activePool.bookedShares}/${activePool.totalShares} slots filled`})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedAnimal.type !== 'kircha' && <div style={{ fontWeight: 700, color: 'var(--gold)', marginTop: 4 }}>{formatETB(selectedAnimal.price)}</div>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t.deliveryOption}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className={`btn btn-sm ${deliveryOption === 'delivery' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDeliveryOption('delivery')} style={{ flex: 1, justifyContent: 'center' }}>
                        🚚 {t.delivery}
                      </button>
                      <button className={`btn btn-sm ${deliveryOption === 'pickup' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDeliveryOption('pickup')} style={{ flex: 1, justifyContent: 'center' }}>
                        🏪 {t.pickup}
                      </button>
                    </div>
                  </div>

                  {/* Self-Pickup Location Info */}
                  {deliveryOption === 'pickup' && selectedAnimal && (
                    <div style={{
                      background: 'linear-gradient(135deg, hsla(210,100%,50%,0.08), hsla(150,80%,45%,0.06))',
                      border: '1px solid hsla(210,100%,50%,0.18)',
                      borderRadius: 'var(--radius-md)',
                      padding: 16,
                      marginBottom: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <MapPin size={18} color="#3b82f6" />
                        <strong style={{ fontSize: '0.88rem' }}>
                          {lang === 'am' ? 'የመውሰጃ ቦታ ዝርዝር' : 'Pickup Location Details'}
                        </strong>
                      </div>
                      <div style={{
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 12,
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.7
                      }}>
                        <div style={{ marginBottom: 6 }}>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {lang === 'am' ? '📍 ተቋም: ' : '📍 Facility: '}
                          </strong>
                          {selectedAnimal.location.area}{lang === 'am' ? ' የእንስሳት ገበያ ማዕከል' : ' Livestock Market Center'}
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {lang === 'am' ? '🏢 ማከማቻ: ' : '🏢 Holding Yard: '}
                          </strong>
                          {lang === 'am'
                            ? `ሞጆ/ቢሾፍቱ ማቆያ - ${selectedAnimal.location.area} ዞን`
                            : `Modjo/Bishoftu Holding Facility — ${selectedAnimal.location.area} Zone`}
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {lang === 'am' ? '🕐 ሰዓት: ' : '🕐 Hours: '}
                          </strong>
                          {lang === 'am' ? 'ከጠዋቱ 2:00 - ከምሽቱ 12:00 (ሰኞ - ቅዳሜ)' : '8:00 AM — 6:00 PM (Mon–Sat)'}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {lang === 'am' ? '📞 ስልክ: ' : '📞 Contact: '}
                          </strong>
                          +251-11-XXX-XXXX
                        </div>
                      </div>
                      <div style={{
                        marginTop: 10,
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <CheckCircle size={12} color="#22c55e" />
                        {lang === 'am'
                          ? 'ትዕዛዝዎ ከተረጋገጠ በኋላ የመውሰጃ ማረጋገጫ ኮድ በSMS ይላካል።'
                          : 'A pickup confirmation code will be sent via SMS after order confirmation.'}
                      </div>
                    </div>
                  )}

                  {deliveryOption === 'delivery' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">{lang === 'am' ? 'የማድረሻ አድራሻ' : 'Delivery Address'}</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={lang === 'am' ? 'ለምሳሌ፡ ቦሌ ክፍለ ከተማ፣ ወረዳ 03' : 'e.g. Bole Sub-City, Woreda 03'}
                          value={deliveryAddress}
                          onChange={e => setDeliveryAddress(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{lang === 'am' ? 'የማድረሻ ቀን' : 'Delivery Date'}</label>
                        <input
                          type="date"
                          className="form-input"
                          min={
                            selectedAnimal?.availableDate && selectedAnimal.availableDate.slice(0, 10) > new Date(Date.now() + 86400000).toISOString().slice(0, 10)
                              ? selectedAnimal.availableDate.slice(0, 10)
                              : new Date(Date.now() + 86400000).toISOString().slice(0, 10)
                          }
                          max={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}
                          value={deliveryDate}
                          onChange={e => setDeliveryDate(e.target.value)}
                        />
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
                            <button key={tw} className={`btn btn-sm ${deliveryTimeWindow === tw ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDeliveryTimeWindow(tw)} style={{ justifyContent: 'center', fontSize: '0.75rem' }}>
                              <Clock size={12} /> {lang === 'am' && tw.includes('Morning') ? 'ጠዋት (ከ2-6 ሰዓት)' : lang === 'am' && tw.includes('Afternoon') ? 'ከሰዓት (ከ6-10 ሰዓት)' : lang === 'am' && tw.includes('Evening') ? 'ማታ (ከ10-1 ሰዓት)' : lang === 'am' && tw.includes('Full Day') ? 'ሙሉ ቀን (ከ2-1 ሰዓት)' : tw}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
 
                  {/* Vet Insurance Option */}
                  {selectedAnimal.insurancePremium !== undefined && (
                    <div className="form-group" style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border-light)' }}>
                      <input
                        type="checkbox"
                        id="vet-insurance-check"
                        checked={vetInsurance}
                        onChange={e => setVetInsurance(e.target.checked)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <label htmlFor="vet-insurance-check" style={{ fontSize: '0.8rem', cursor: 'pointer', flex: 1 }}>
                        <strong>{lang === 'am' ? 'የእንስሳት ሐኪም መድን ጨምር (+5%)' : 'Add Veterinary Insurance (+5%)'}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {lang === 'am'
                            ? 'በማጓጓዣ ወቅት እና ከደረሰ በኋላ ለ48 ሰዓታት ለሚከሰት ህመም ወይም ጉዳት ሙሉ ሽፋን ይሰጣል።'
                            : 'Covers illness or accidental death during transport and 48 hours post-delivery.'}
                        </div>
                      </label>
                    </div>
                  )}
 
                  <div className="form-group">
                    <label className="form-label">{t.paymentMethod}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {PAYMENT_METHODS_ORDER.map(pm => (
                        <button key={pm.key} className={`btn btn-sm ${paymentMethod === pm.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPaymentMethod(pm.key)} style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', padding: '10px 8px', height: 'auto' }}>
                          <span style={{ fontSize: '1.2rem' }}>{pm.icon}</span>
                          <span style={{ fontSize: '0.68rem', marginTop: 2 }}>{translateMethod(pm.label)}</span>
                        </button>
                      ))}
                    </div>
                    {paymentMethod === 'wallet' && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{lang === 'am' ? 'ቀሪ ሂሳብ:' : 'Wallet Balance:'} <strong style={{ color: 'var(--green-bright)' }}>{formatETB(getPrimaryBalance())}</strong></span>
                        <span>{lang === 'am' ? 'ከክፍያ በኋላ ቀሪ:' : 'After checkout:'} <strong style={{ color: getPrimaryBalance() - getOrderTotal() >= 100 ? 'var(--green-bright)' : 'var(--red)' }}>{formatETB(getPrimaryBalance() - getOrderTotal())}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="cost-breakdown">
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.85rem' }}>💰 {t.priceBreakdown}</div>
                    <div className="cost-row">
                      <span>{t.animalPrice}{selectedAnimal.type === 'kircha' ? ` (÷${kirchaShares})` : ''}</span>
                      <span style={{ fontWeight: 600 }}>{formatETB(selectedAnimal.type === 'kircha' ? Math.round(selectedAnimal.price / kirchaShares) : selectedAnimal.price)}</span>
                    </div>
                    {deliveryOption === 'delivery' && breakdown && (
                      <>
                        <div className="cost-row"><span>{t.transport} ({breakdown.distance} km)</span><span style={{ fontWeight: 600 }}>{formatETB(breakdown.transport)}</span></div>
                        <div className="cost-row"><span>{t.labor}</span><span style={{ fontWeight: 600 }}>{formatETB(breakdown.labor)}</span></div>
                        <div className="cost-row"><span>{t.insurance}</span><span style={{ fontWeight: 600 }}>{formatETB(breakdown.insurance)}</span></div>
                      </>
                    )}
                    {vetInsurance && (
                      <div className="cost-row">
                        <span>{lang === 'am' ? 'የእንስሳ ሐኪም መድን (5%)' : 'Vet Insurance (5%)'}</span>
                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>+{formatETB(Math.round((selectedAnimal.type === 'kircha' ? Math.round(selectedAnimal.price / kirchaShares) : selectedAnimal.price) * 0.05))}</span>
                      </div>
                    )}
                    <div className="cost-row total"><span>{t.total}</span><span>{formatETB(getOrderTotal())}</span></div>
                    {paymentMethod === 'wallet' && getPrimaryBalance() - getOrderTotal() < 100 && (
                      <div style={{ color: 'var(--red)', fontSize: '0.72rem', marginTop: 6, fontWeight: 600, textAlign: 'center' }}>
                        ⚠️ {lang === 'am' ? 'ከክፍያ በኋላ ቢያንስ 100 ብር መያዣ መቅረት አለበት!' : '100 ETB minimum reserve must remain in wallet after purchase!'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowOrder(false)} disabled={actionLoading}>{t.cancel}</button>
                  <button className="btn btn-success" onClick={confirmOrder} id="confirm-order" disabled={actionLoading}>
                    {actionLoading ? (
                      <>
                        <span className="btn-spinner" /> {lang === 'am' ? 'በማስኬድ ላይ...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} /> {t.confirmPurchase}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelOrderId && (
        <div className="modal-overlay" onClick={() => setCancelOrderId(null)}>
          <div className="modal scale-in" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{lang === 'am' ? 'ትዕዛዝ ሰርዝ ✗' : 'Cancel Order'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setCancelOrderId(null)} disabled={actionLoading}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                {lang === 'am'
                  ? 'እርግጠኛ ነዎት ይህንን ትዕዛዝ መሰረዝ ይፈልጋሉ? ክፍያው ተመላሽ ተደርጎ በኪስ ቦርሳዎ ውስጥ እስኪገባ በአስተዳዳሪው ማረጋገጫ ያስፈልገዋል።'
                  : 'Are you sure you want to cancel this order? The refunded amount will be pending admin approval.'}
              </p>
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'የመሰረዣ ምክንያት' : 'Reason for Cancellation'}</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={lang === 'am' ? 'ምክንያትዎን እዚህ ያስገቡ...' : 'Enter reason here...'}
                  value={cancelReasonText}
                  onChange={e => setCancelReasonText(e.target.value)}
                  style={{ resize: 'none', padding: 12 }}
                  disabled={actionLoading}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCancelOrderId(null)} disabled={actionLoading}>{t.cancel}</button>
              <button className="btn btn-danger" onClick={handleConfirmCancel} disabled={actionLoading || !cancelReasonText.trim()}>
                {actionLoading ? (
                  <>
                    <span className="btn-spinner" /> {lang === 'am' ? 'በመሰረዝ ላይ...' : 'Cancelling...'}
                  </>
                ) : (
                  lang === 'am' ? 'ትዕዛዝ ሰርዝ' : 'Confirm Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Seller Modal */}
      {rateOrderId && (
        <div className="modal-overlay" onClick={() => setRateOrderId(null)}>
          <div className="modal scale-in" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{lang === 'am' ? 'ሻጭ ደረጃ ስጥ ⭐️' : 'Rate Seller'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setRateOrderId(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                {lang === 'am' ? 'ለዚህ ሻጭ ምን ያህል ኮከብ መስጠት ይፈልጋሉ?' : 'How would you rate this seller?'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
                      transform: ratingValue >= star ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.1s ease'
                    }}
                  >
                    <Star
                      size={36}
                      fill={ratingValue >= star ? 'var(--gold)' : 'none'}
                      color={ratingValue >= star ? 'var(--gold)' : 'var(--text-muted)'}
                    />
                  </button>
                ))}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gold)' }}>
                {ratingValue} / 5 {lang === 'am' ? 'ኮከቦች' : 'Stars'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRateOrderId(null)} disabled={actionLoading}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleConfirmRate} disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <span className="btn-spinner" /> {lang === 'am' ? 'በማስገባት ላይ...' : 'Submitting...'}
                  </>
                ) : (
                  lang === 'am' ? 'ደረጃ አስገባ' : 'Submit Rating'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Claim Modal */}
      {claimOrderId && (
        <div className="modal-overlay" onClick={() => setClaimOrderId(null)}>
          <div className="modal scale-in" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🛡️ {lang === 'am' ? 'የኢንሹራንስ ካሳ ጥያቄ ማቅረቢያ' : 'File Vet Insurance Claim'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setClaimOrderId(null)} disabled={actionLoading}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                {lang === 'am'
                  ? 'በእንስሳቱ ላይ የጤና ችግር ከተፈጠረ፣ እባክዎን ዝርዝር መረጃውን ከታች ይግለጹ። አስተዳዳሪዎቻችን ጉዳዩን መርምረው ካሳውን ይፈቅዳሉ።'
                  : 'If you experienced health issues with the livestock, describe the situation. Our team will review the claim.'}
              </p>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{lang === 'am' ? 'የትዕዛዝ ቁጥር' : 'Order ID'}</label>
                <input className="form-input" value={`#${claimOrderId.slice(-6)}`} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'የጉዳቱ/ችግሩ ዝርዝር መግለጫ' : 'Description of Issue'}</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder={lang === 'am' ? 'ችግሩን እዚህ በዝርዝር ይግለጹ...' : 'Describe the health or quality issues in detail...'}
                  value={claimMessage}
                  onChange={e => setClaimMessage(e.target.value)}
                  style={{ resize: 'none', padding: 12 }}
                  disabled={actionLoading}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setClaimOrderId(null)} disabled={actionLoading}>{t.cancel}</button>
              <button
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, var(--purple), hsla(270,70%,60%,0.85))', border: 'none' }}
                onClick={handleConfirmClaim}
                disabled={actionLoading || !claimMessage.trim()}
              >
                {actionLoading ? (
                  <>
                    <span className="btn-spinner" /> {lang === 'am' ? 'በማስገባት ላይ...' : 'Submitting...'}
                  </>
                ) : (
                  lang === 'am' ? 'ጥያቄ አስገባ' : 'Submit Claim'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
