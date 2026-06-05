import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, DollarSign, Award, Star, Plus, PlusCircle,
  CheckCircle, Clock, XCircle, ShoppingBag, Truck, CreditCard,
  ChevronRight, ArrowUpRight, ArrowDownRight, ShieldAlert, FileText, MapPin, Calendar, Users
} from 'lucide-react';
import {
  addAnimalListing, editAnimalListing, deleteAnimalListing, requestWithdrawal,
  formatETB, formatDate, ANIMAL_EMOJIS, TRANSLATIONS, getKirchaPool, uploadImage
} from '../db';
import { fetchSellerOrders, fetchSellerAnimals, fetchWallets, fetchTransactions } from '../api';

export default function SellerDashboard({ onRefresh, lang, showToast, user }) {
  const queryClient = useQueryClient();

  const { data: walletDataRaw = [] } = useQuery({ queryKey: ['wallets'], queryFn: fetchWallets });
  const walletData = Array.isArray(walletDataRaw) ? walletDataRaw : (walletDataRaw?.wallets || []);
  const { data: transactionsRaw = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const transactionsData = Array.isArray(transactionsRaw) ? transactionsRaw : (transactionsRaw?.transactions || []);
  const { data: ordersRaw = [] } = useQuery({ queryKey: ['seller-orders'], queryFn: fetchSellerOrders });
  const orders = Array.isArray(ordersRaw) ? ordersRaw : (ordersRaw?.orders || []);
  const { data: sellerAnimalsData = { animals: [] } } = useQuery({ queryKey: ['seller-animals'], queryFn: fetchSellerAnimals });
  
  const listings = Array.isArray(sellerAnimalsData) ? sellerAnimalsData : (sellerAnimalsData?.animals || []);
  const wallet = walletData.find(w => !w.isFamily) || null;
  const transactions = wallet ? transactionsData.filter(t => t.walletId === wallet.id) : [];

  const [activeTab, setActiveTab] = useState('overview');
  const [kirchaPools, setKirchaPools] = useState({});
  
  // Modals/Forms State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnimalId, setEditingAnimalId] = useState(null);
  
  const [imageFiles, setImageFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // New Listing Form State
  const [newAnimal, setNewAnimal] = useState({
    type: 'sheep',
    breed: '',
    weight: '',
    price: '',
    age: '',
    locationArea: 'Bole',
    description: '',
    healthCertificate: true,
    gender: 'Male',
    healthStatus: 'Excellent',
    vaccinationStatus: false
  });

  // Edit Listing Form State
  const [editAnimalForm, setEditAnimalForm] = useState({
    type: 'sheep',
    breed: '',
    weight: '',
    price: '',
    age: '',
    locationArea: 'Bole',
    description: '',
    healthCertificate: true,
    gender: 'Male',
    healthStatus: 'Excellent',
    vaccinationStatus: false
  });
  
  // Payout Form State
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutReason, setPayoutReason] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('TELEBIRR');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  useEffect(() => {
    const loadPools = async () => {
      const pools = {};
      for (const l of listings) {
        if (l.type === 'kircha') {
          try {
            const pool = await getKirchaPool(l.id);
            pools[l.id] = pool;
          } catch (err) {
            console.error(err);
          }
        }
      }
      setKirchaPools(pools);
    };
    if (listings.length > 0) loadPools();
  }, [listings]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();

  };

  // Submit new animal listing
  const handleAddAnimal = async (e) => {
    e.preventDefault();
    if (!newAnimal.breed || !newAnimal.price || !newAnimal.weight) {
      showToast(lang === 'am' ? 'እባክዎ ሁሉንም አስፈላጊ መረጃዎች ያስገቡ' : 'Please fill out all required fields', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const imageUrls = [];
      for (const file of imageFiles) {
        try {
          const url = await uploadImage(file);
          imageUrls.push(url);
        } catch (uploadErr) {
          showToast(`Failed to upload image: ${file.name}`, 'error');
          setIsUploading(false);
          return;
        }
      }

      await addAnimalListing({
        ...newAnimal,
        price: parseFloat(newAnimal.price),
        weight: parseFloat(newAnimal.weight),
        description: newAnimal.description || 'Grass-fed, healthy livestock',
        images: imageUrls
      });
      
      showToast(
        lang === 'am' 
          ? 'እንስሳ በተሳካ ሁኔታ ተመዝግቧል። በአስተዳዳሪው ሲረጋገጥ ይፋ ይሆናል!' 
          : 'Livestock listed successfully. It will go live after admin approval!', 
        'success'
      );
      
      setShowAddModal(false);
      setImageFiles([]);
      setIsUploading(false);
      setNewAnimal({
        type: 'sheep',
        breed: '',
        weight: '',
        price: '',
        age: '',
        locationArea: 'Bole',
        description: '',
        healthCertificate: true,
        gender: 'Male',
        healthStatus: 'Excellent',
        vaccinationStatus: false
      });
      handleRefresh();
    } catch (err) {
      setIsUploading(false);
      showToast(err.message || 'Failed to list animal', 'error');
    }
  };

  const openEditModal = (animal) => {
    setEditingAnimalId(animal.id);
    setEditAnimalForm({
      type: animal.type.toLowerCase(),
      breed: animal.breed,
      weight: animal.weight.toString(),
      price: animal.price.toString(),
      age: animal.age || '',
      locationArea: animal.locationArea || 'Bole',
      description: animal.description || '',
      healthCertificate: animal.healthCertificate || false,
      gender: animal.gender || 'Male',
      healthStatus: animal.healthStatus || 'Excellent',
      vaccinationStatus: animal.vaccinationStatus || false
    });
    setShowEditModal(true);
  };

  const handleEditAnimalSubmit = async (e) => {
    e.preventDefault();
    if (!editAnimalForm.breed || !editAnimalForm.price || !editAnimalForm.weight) {
      showToast(lang === 'am' ? 'እባክዎ ሁሉንም አስፈላጊ መረጃዎች ያስገቡ' : 'Please fill out all required fields', 'error');
      return;
    }
    try {
      await editAnimalListing(editingAnimalId, {
        ...editAnimalForm,
        price: parseFloat(editAnimalForm.price),
        weight: parseFloat(editAnimalForm.weight)
      });
      showToast(lang === 'am' ? 'ዝርዝሩ በተሳካ ሁኔታ ተስተካክሏል!' : 'Listing updated successfully!', 'success');
      setShowEditModal(false);
      handleRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to update listing', 'error');
    }
  };

  const handleDeleteListing = async (id) => {
    const confirmMsg = lang === 'am' 
      ? 'ይህን ዝርዝር በእርግጠኝነት ማጥፋት ይፈልጋሉ?' 
      : 'Are you sure you want to deactivate/delete this listing?';
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteAnimalListing(id);
      showToast(lang === 'am' ? 'ዝርዝሩ በተሳካ ሁኔታ ተሰርዟል!' : 'Listing deleted successfully!', 'success');
      handleRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to delete listing', 'error');
    }
  };

  // Submit payout request
  const handleRequestPayout = async (e) => {
    e.preventDefault();
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      showToast(lang === 'am' ? 'ትክክለኛ የክፍያ መጠን ያስገቡ' : 'Please enter a valid payout amount', 'error');
      return;
    }

    if (wallet && wallet.balance < parseFloat(payoutAmount)) {
      showToast(lang === 'am' ? 'በቂ የኪስ ባላንስ የለም' : 'Insufficient wallet balance', 'error');
      return;
    }

    if (!accountNumber) {
      showToast(lang === 'am' ? 'የአካውንት/ስልክ ቁጥር ያስገቡ' : 'Please enter an account/phone number', 'error');
      return;
    }

    if (withdrawalMethod === 'BANK_TRANSFER' && !accountName) {
      showToast(lang === 'am' ? 'የአካውንት ስም ያስገቡ' : 'Please enter account holder name', 'error');
      return;
    }

    try {
      await requestWithdrawal(
        wallet.id, 
        parseFloat(payoutAmount), 
        payoutReason || 'Seller payout',
        withdrawalMethod,
        accountNumber,
        accountName
      );
      showToast(
        lang === 'am'
          ? 'የክፍያ ጥያቄ በተሳካ ሁኔታ ተልኳል! አስተዳዳሪው በቅርቡ ያረጋግጥለታል።'
          : 'Payout requested successfully! Admin will process it shortly.',
        'success'
      );
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutReason('');
      setAccountNumber('');
      setAccountName('');
      handleRefresh();
    } catch (err) {
      showToast(err.message || 'Failed to request payout', 'error');
    }
  };

  // Stats calculation
  const totalEarnings = orders
    .filter(o => o.deliveryStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const pendingListings = listings.filter(l => !l.isApproved).length;
  const approvedListings = listings.filter(l => l.isApproved).length;

  const translateAnimal = (type) => {
    return lang === 'am' 
      ? { sheep: 'በግ', goat: 'ፍየል', cattle: 'ከብት', hen: 'ዶሮ', kircha: 'ኪርቻ' }[type] || type 
      : type;
  };

  const sellerRating = 4.8; // Default mock rating

  return (
    <div className="dashboard-container">
      {/* Top Banner */}
      <div className="welcome-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>{lang === 'am' ? `እንኳን ደህና መጡ፣ ${user.fullName} 👋` : `Welcome back, ${user.fullName} 👋`}</h2>
          <p>{lang === 'am' ? 'የእንስሳት ሽያጭ እና ማድረሻ አስተዳደር ዳሽቦርድ' : 'Manage your livestock sales, orders, and earnings.'}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-gold flex items-center gap-2" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> {lang === 'am' ? 'አዲስ እንስሳ መዝግብ' : 'Add New Listing'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card glass flex items-center justify-between">
          <div>
            <span className="stat-label">{lang === 'am' ? 'ጠቅላላ ገቢ' : 'Total Sales Earnings'}</span>
            <h3 className="stat-val text-green" style={{ color: 'var(--green)' }}>{formatETB(totalEarnings)}</h3>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="stat-card glass flex items-center justify-between">
          <div>
            <span className="stat-label">{lang === 'am' ? 'ኪስ ባላንስ (ለመውጣት ዝግጁ)' : 'Wallet Balance (Ready)'}</span>
            <h3 className="stat-val" style={{ color: 'var(--gold)' }}>{wallet ? formatETB(wallet.balance) : '0.00 ብር'}</h3>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>
            <DollarSign size={22} />
          </div>
        </div>

        <div className="stat-card glass flex items-center justify-between">
          <div>
            <span className="stat-label">{lang === 'am' ? 'ያሉ እንስሳት (የጸደቁ / በመጠባበቅ)' : 'My Listings (Live / Pending)'}</span>
            <h3 className="stat-val">{approvedListings} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {pendingListings}</span></h3>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
            <Award size={22} />
          </div>
        </div>

        <div className="stat-card glass flex items-center justify-between">
          <div>
            <span className="stat-label">{lang === 'am' ? 'የሻጭ ደረጃ' : 'Seller Reputation'}</span>
            <h3 className="stat-val flex items-center gap-1">
              {sellerRating} <Star size={16} fill="var(--gold)" color="var(--gold)" />
            </h3>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'var(--purple-glow)', color: 'var(--purple)' }}>
            <Star size={22} />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="tab-menu" style={{ marginBottom: 24, borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 16 }}>
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          style={{ paddingBottom: 12, fontWeight: activeTab === 'overview' ? 700 : 500 }}
        >
          {lang === 'am' ? 'አጠቃላይ እይታ' : 'Overview'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('listings')}
          style={{ paddingBottom: 12, fontWeight: activeTab === 'listings' ? 700 : 500 }}
        >
          {lang === 'am' ? 'የኔ እንስሳት' : 'My Listings'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
          style={{ paddingBottom: 12, fontWeight: activeTab === 'orders' ? 700 : 500 }}
        >
          {lang === 'am' ? 'የሽያጭ ትዕዛዞች' : 'Received Orders'}
          {orders.filter(o => o.deliveryStatus === 'processing').length > 0 && (
            <span className="badge badge-red" style={{ marginLeft: 6 }}>
              {orders.filter(o => o.deliveryStatus === 'processing').length}
            </span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallet')}
          style={{ paddingBottom: 12, fontWeight: activeTab === 'wallet' ? 700 : 500 }}
        >
          {lang === 'am' ? 'ኪስ እና ክፍያዎች' : 'Wallet & Payouts'}
        </button>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          {/* Recent Orders Queue */}
          <div className="card glass" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16, fontWeight: 700 }}>🛒 {lang === 'am' ? 'የቅርብ ጊዜ ሽያጮች' : 'Recent Sales Activity'}</h3>
            {orders.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 10px' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🐏</div>
                <h4>{lang === 'am' ? 'እስካሁን ምንም ሽያጭ የለም' : 'No sales orders yet'}</h4>
                <p>{lang === 'am' ? 'እንስሳትዎን ይዘርዝሩ እና ገዢዎችን ይጠብቁ!' : 'List your animals and wait for buyers!'}</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{lang === 'am' ? 'እንስሳ' : 'Animal'}</th>
                      <th>{lang === 'am' ? 'ገዢ' : 'Buyer'}</th>
                      <th>{lang === 'am' ? 'ዋጋ' : 'Price'}</th>
                      <th>{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                      <th>{lang === 'am' ? 'ቀን' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ marginRight: 6 }}>{ANIMAL_EMOJIS[o.animalType] || '🐾'}</span>
                          {o.animalBreed} {translateAnimal(o.animalType)}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <div style={{ fontWeight: 600 }}>{o.customerName || 'Customer'}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{o.customerPhone}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatETB(o.totalPrice)}</td>
                        <td>
                          <span className={`badge ${
                            o.deliveryStatus === 'delivered' ? 'badge-green' : 
                            o.deliveryStatus === 'cancelled' ? 'badge-red' : 'badge-gold'
                          }`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            {o.deliveryStatus}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card glass" style={{ padding: 20 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12 }}>⚡ {lang === 'am' ? 'ፈጣን ተግባራት' : 'Quick Controls'}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-gold w-full text-center" style={{ justifyContent: 'center' }} onClick={() => setShowAddModal(true)}>
                  <Plus size={16} style={{ marginRight: 6 }} /> {lang === 'am' ? 'አዲስ እንስሳ መዝግብ' : 'Add New Listing'}
                </button>
                {wallet && wallet.balance > 0 && (
                  <button className="btn btn-ghost w-full text-center" style={{ justifyContent: 'center', border: '1px solid var(--border-light)' }} onClick={() => setShowPayoutModal(true)}>
                    <DollarSign size={16} style={{ marginRight: 6 }} /> {lang === 'am' ? 'ገንዘብ ማውጣት ጠይቅ' : 'Request Wallet Withdrawal'}
                  </button>
                )}
                <button className="btn btn-ghost w-full text-center" style={{ justifyContent: 'center' }} onClick={handleRefresh}>
                  {lang === 'am' ? 'ዳሽቦርድ አድስ' : 'Refresh System Data'}
                </button>
              </div>
            </div>

            {/* Platform Policy Tip */}
            <div className="card glass" style={{ padding: 20, borderLeft: '4px solid var(--gold)', background: 'var(--gold-soft)' }}>
              <h4 className="flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: 8 }}>
                <ShieldAlert size={16} /> {lang === 'am' ? 'የሻጭ መመሪያዎች' : 'Platform Seller Notice'}
              </h4>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                {lang === 'am'
                  ? 'የሸማቾችን እምነት ለመጠበቅ እባክዎ ለሁሉም እንስሳትዎ የጤና የምስክር ወረቀት መያዙን ያረጋግጡ። ማናቸውም የውሸት መግለጫዎች የሻጭ መብትዎን እንዲያጡ ሊያደርጉ ይችላሉ።'
                  : 'To protect customer trust, ensure all listed animals are checked by local vets. Accurate weight and health certificates guarantee faster admin approvals and gold tiers.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MY LISTINGS */}
      {activeTab === 'listings' && (
        <div className="card glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700 }}>📋 {lang === 'am' ? 'የእኔ እንስሳት ዝርዝር' : 'Listed Livestock Portfolio'}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {lang === 'am' ? `በጠቅላላ፡ ${listings.length} እንስሳት` : `Total Listings: ${listings.length}`}
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>🐑</div>
              <h3>{lang === 'am' ? 'የተመዘገበ እንስሳ የለም' : 'No listings registered'}</h3>
              <p style={{ marginBottom: 20 }}>{lang === 'am' ? 'የመጀመሪያውን እንስሳዎን በመመዝገብ መሸጥ ይጀምሩ!' : 'Start selling by posting your very first livestock item!'}</p>
              <button className="btn btn-gold" onClick={() => setShowAddModal(true)}><Plus size={16} /> {lang === 'am' ? 'አዲስ እንስሳ መዝግብ' : 'Add New Listing'}</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>{lang === 'am' ? 'እንስሳ' : 'Animal'}</th>
                    <th>{lang === 'am' ? 'ክብደት' : 'Weight'}</th>
                    <th>{lang === 'am' ? 'ዕድሜ' : 'Age'}</th>
                    <th>{lang === 'am' ? 'ዋጋ' : 'Price'}</th>
                    <th>{lang === 'am' ? 'የጤና ማረጋገጫ' : 'Health Cert'}</th>
                    <th>{lang === 'am' ? 'አካባቢ' : 'Location'}</th>
                    <th>{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                    <th>{lang === 'am' ? 'ተግባር' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ marginRight: 6, fontSize: '1.2rem' }}>{ANIMAL_EMOJIS[l.type] || '🐾'}</span>
                        {l.breed} {translateAnimal(l.type)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.weight} kg</td>
                      <td>{l.age || '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatETB(l.price)}</td>
                      <td>
                        {l.healthCertificate ? (
                          <span className="badge badge-green flex items-center gap-1" style={{ fontSize: '0.68rem', width: 'fit-content' }}>
                            <CheckCircle size={10} /> {lang === 'am' ? 'የጸደቀ' : 'Yes'}
                          </span>
                        ) : (
                          <span className="badge badge-red flex items-center gap-1" style={{ fontSize: '0.68rem', width: 'fit-content' }}>
                            <XCircle size={10} /> {lang === 'am' ? 'የሌለው' : 'No'}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{l.locationArea}</td>
                      <td>
                        {l.type === 'kircha' && l.isApproved ? (
                          (() => {
                            const pool = kirchaPools[l.id];
                            const booked = pool ? pool.bookedShares : 0;
                            const total = pool ? pool.totalShares : 5;
                            const pct = Math.round((booked / total) * 100);
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span className="badge badge-purple flex items-center gap-1" style={{ width: 'fit-content', fontSize: '0.7rem' }}>
                                  <Users size={12} /> {lang === 'am' ? `ኪርቻ፡ ${booked}/${total} ድርሻ` : `Kircha: ${booked}/${total} shares`}
                                </span>
                                <div className="progress-bar" style={{ height: 6, width: 80, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div className="progress-fill purple" style={{ width: `${pct}%`, height: '100%', background: 'var(--purple)' }} />
                                </div>
                              </div>
                            );
                          })()
                        ) : l.isApproved ? (
                          <span className="badge badge-green flex items-center gap-1" style={{ width: 'fit-content', fontSize: '0.7rem' }}>
                            <CheckCircle size={12} /> {lang === 'am' ? 'ቀጥታ ስርጭት' : 'Live / Approved'}
                          </span>
                        ) : (
                          <span className="badge badge-gold flex items-center gap-1" style={{ width: 'fit-content', fontSize: '0.7rem' }}>
                            <Clock size={12} /> {lang === 'am' ? 'በመጠባበቅ ላይ' : 'Pending Approval'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => openEditModal(l)}
                            style={{ padding: '4px 8px', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}
                          >
                            ✏️ {lang === 'am' ? 'ማስተካከል' : 'Edit'}
                          </button>
                          <button
                            className="btn btn-sm btn-red"
                            onClick={() => handleDeleteListing(l.id)}
                            style={{ padding: '4px 8px', background: 'var(--red-soft)', color: 'var(--red)', border: 'none', borderRadius: 8, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}
                          >
                            🗑️ {lang === 'am' ? 'ማጥፋት' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: RECEIVED ORDERS */}
      {activeTab === 'orders' && (
        <div className="card glass" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📦 {lang === 'am' ? 'የተቀበሏቸው ትዕዛዞች' : 'Customer Received Purchases'}</h3>
          {orders.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>🛒</div>
              <h3>{lang === 'am' ? 'ምንም ትዕዛዝ አልደረሰም' : 'No received orders'}</h3>
              <p>{lang === 'am' ? 'ትዕዛዞች ደንበኞች የእርስዎን እንስሳት ሲገዙ እዚህ ይታያሉ።' : 'When customers purchase your listed animals, orders will appear here for processing.'}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>{lang === 'am' ? 'ትዕዛዝ ቁጥር' : 'Order ID'}</th>
                    <th>{lang === 'am' ? 'እንስሳ' : 'Livestock item'}</th>
                    <th>{lang === 'am' ? 'ገዢ / ስልክ' : 'Customer Phone'}</th>
                    <th>{lang === 'am' ? 'ማድረሻ ምርጫ' : 'Delivery Choice'}</th>
                    <th>{lang === 'am' ? 'ክፍያ' : 'Payout Net'}</th>
                    <th>{lang === 'am' ? 'የማድረስ ሁኔታ' : 'Tracking State'}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{o.id.slice(-8).toUpperCase()}</td>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ marginRight: 6 }}>{ANIMAL_EMOJIS[o.animalType] || '🐾'}</span>
                        {o.animalBreed} {translateAnimal(o.animalType)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{o.customerName || 'Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📞 {o.customerPhone}</div>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {o.deliveryOption === 'delivery' ? (
                          <span>🚚 {lang === 'am' ? 'ማድረሻ ወደ' : 'Delivery to'} <strong>{o.deliveryZone}</strong></span>
                        ) : (
                          <span>🏪 {lang === 'am' ? 'በራስ መውሰድ (ከቦታው)' : 'Pickup Area'}</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--green)' }}>
                        <div>{formatETB(o.totalPrice)}</div>
                        <div style={{ marginTop: 4 }}>
                          {o.isPaidToSeller ? (
                            <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '2px 6px', fontWeight: 600 }}>
                              ✅ {lang === 'am' ? 'ክፍያ የተፈጸመ' : 'Paid to Wallet'}
                            </span>
                          ) : o.deliveryStatus === 'cancelled' ? (
                            <span className="badge badge-red" style={{ fontSize: '0.65rem', padding: '2px 6px', fontWeight: 600 }}>
                              ❌ {lang === 'am' ? 'የተሰረዘ' : 'Cancelled'}
                            </span>
                          ) : (
                            <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '2px 6px', fontWeight: 600 }}>
                              ⏳ {lang === 'am' ? 'በዕምነት የተቀመጠ' : 'Held in Escrow'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          o.deliveryStatus === 'delivered' ? 'badge-green' : 
                          o.deliveryStatus === 'cancelled' ? 'badge-red' : 'badge-gold'
                        }`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                          {o.deliveryStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: WALLET & PAYOUTS */}
      {activeTab === 'wallet' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          {/* Wallet Balance Card */}
          <div className="card glass flex flex-column justify-between" style={{ padding: 24, height: 'fit-content' }}>
            <div>
              <h4 style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>💼 {lang === 'am' ? 'የሻጭ ዲጂታል ቦርሳ' : 'Seller Virtual Wallet'}</h4>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                {wallet ? formatETB(wallet.balance) : '0.00 ብር'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {lang === 'am' ? 'ከተሳካ የእንስሳት ሽያጭ ያገኙት ገንዘብ እዚህ ይቀመጣል።' : 'All proceeds from completed animal checkouts credit directly to this secure wallet.'}
              </p>
            </div>
            
            <div style={{ marginTop: 24 }}>
              <button
                className="btn btn-gold w-full text-center"
                style={{ justifyContent: 'center' }}
                onClick={() => setShowPayoutModal(true)}
                disabled={!wallet || wallet.balance <= 0}
              >
                <ArrowUpRight size={16} style={{ marginRight: 6 }} /> {lang === 'am' ? 'ገንዘብ ማውጣት ጠይቅ (Payout)' : 'Request Withdrawal payout'}
              </button>
            </div>
          </div>

          {/* Wallet Payout logs */}
          <div className="card glass" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📋 {lang === 'am' ? 'የገንዘብ እንቅስቃሴ ታሪክ' : 'Earnings & Withdrawal Transaction Ledger'}</h3>
            {transactions.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 10px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📁</div>
                <h4>{lang === 'am' ? 'ምንም ግብይት የለም' : 'No transactions logged'}</h4>
                <p>{lang === 'am' ? 'ሽያጮች ወይም የክፍያ ጥያቄዎች ሲኖሩ እዚህ ይመዘገባሉ።' : 'Deposits and withdrawal logs will populate as your marketplace inventory is purchased.'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {transactions.map(t => {
                  const isPositive = t.amount > 0;
                  return (
                    <div key={t.id} className="flex items-center justify-between" style={{
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'var(--card-bg-light)',
                      border: '1px solid var(--border-light)'
                    }}>
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: isPositive ? 'var(--green-soft)' : 'var(--red-soft)',
                          color: isPositive ? 'var(--green)' : 'var(--red)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isPositive ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.description || 'Virtual Transfer'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.method} · {formatDate(t.createdAt)}</div>
                        </div>
                      </div>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: isPositive ? 'var(--green)' : 'var(--red)'
                      }}>
                        {isPositive ? '+' : ''}{formatETB(t.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE FLOATING ACTION BUTTON */}
      <button className="fab" onClick={() => setShowAddModal(true)} aria-label="Add Listing">
        <Plus size={24} />
      </button>

      {/* MODAL 1: ADD ANIMAL LISTING */}
      {showAddModal && (
        <>
          <div className="bottom-sheet-overlay" onClick={() => setShowAddModal(false)} />
          <div className="bottom-sheet">
            <div className="bottom-sheet-handle" />
            <div className="bottom-sheet-header">
              <h3 style={{ fontWeight: 800, fontSize: '1rem' }}>➕ {lang === 'am' ? 'አዲስ እንስሳ መዝግብ' : 'Add New Livestock Listing'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ padding: 4 }}>✕</button>
            </div>
            <div className="bottom-sheet-body">
            
            <form onSubmit={handleAddAnimal} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ዓይነት' : 'Livestock Type'}</label>
                  <select
                    className="form-input form-select"
                    value={newAnimal.type}
                    onChange={e => setNewAnimal({ ...newAnimal, type: e.target.value })}
                  >
                    <option value="sheep">{lang === 'am' ? 'በግ' : 'Sheep'}</option>
                    <option value="goat">{lang === 'am' ? 'ፍየል' : 'Goat'}</option>
                    <option value="cattle">{lang === 'am' ? 'በሬ/ላም' : 'Cattle'}</option>
                    <option value="hen">{lang === 'am' ? 'ዶሮ' : 'Hen'}</option>
                    <option value="kircha">{lang === 'am' ? 'ኪርቻ (የጋራ)' : 'Kircha (Share Group)'}</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ዝርያ' : 'Breed Name'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Harar, Menz, Gondar"
                    value={newAnimal.breed}
                    onChange={e => setNewAnimal({ ...newAnimal, breed: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ክብደት (ኪሎግራም)' : 'Weight (kg)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="e.g. 45"
                    value={newAnimal.weight}
                    onChange={e => setNewAnimal({ ...newAnimal, weight: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ዕድሜ (አማራጭ)' : 'Age / Teeth count'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 1.5 Years, 2 Teeth"
                    value={newAnimal.age}
                    onChange={e => setNewAnimal({ ...newAnimal, age: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ዋጋ (ብር)' : 'Asking Price (ETB)'}</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 15000"
                    value={newAnimal.price}
                    onChange={e => setNewAnimal({ ...newAnimal, price: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'የጤና ማረጋገጫ' : 'Health Certificate'}</label>
                  <select
                    className="form-input form-select"
                    value={newAnimal.healthCertificate.toString()}
                    onChange={e => setNewAnimal({ ...newAnimal, healthCertificate: e.target.value === 'true' })}
                  >
                    <option value="true">{lang === 'am' ? 'አለው' : 'Yes (Checked)'}</option>
                    <option value="false">{lang === 'am' ? 'የለውም' : 'No (Not checked)'}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'አካባቢ (የእንስሳው መገኛ)' : 'Location Area'}</label>
                <select
                  className="form-input form-select"
                  value={newAnimal.locationArea}
                  onChange={e => setNewAnimal({ ...newAnimal, locationArea: e.target.value })}
                >
                  <option value="Bole">Bole (ቦሌ)</option>
                  <option value="Merkato">Merkato (መርካቶ)</option>
                  <option value="Kera">Kera (ቄራ)</option>
                  <option value="CMC">CMC (ሲኤምሲ)</option>
                  <option value="Lebu">Lebu (ለቡ)</option>
                  <option value="Megenagna">Megenagna (መገናኛ)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ጾታ' : 'Gender'}</label>
                  <select
                    className="form-input form-select"
                    value={newAnimal.gender}
                    onChange={e => setNewAnimal({ ...newAnimal, gender: e.target.value })}
                  >
                    <option value="Male">{lang === 'am' ? 'ተባዕት (ወንድ)' : 'Male'}</option>
                    <option value="Female">{lang === 'am' ? 'አንስት (ሴት)' : 'Female'}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'የጤና ሁኔታ' : 'Health Status'}</label>
                  <select
                    className="form-input form-select"
                    value={newAnimal.healthStatus}
                    onChange={e => setNewAnimal({ ...newAnimal, healthStatus: e.target.value })}
                  >
                    <option value="Excellent">{lang === 'am' ? 'በጣም ጥሩ' : 'Excellent'}</option>
                    <option value="Good">{lang === 'am' ? 'ጥሩ' : 'Good'}</option>
                    <option value="Fair">{lang === 'am' ? 'መካከለኛ' : 'Fair'}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ክትባት' : 'Vaccination'}</label>
                  <select
                    className="form-input form-select"
                    value={newAnimal.vaccinationStatus.toString()}
                    onChange={e => setNewAnimal({ ...newAnimal, vaccinationStatus: e.target.value === 'true' })}
                  >
                    <option value="true">{lang === 'am' ? 'የተከተበ' : 'Vaccinated'}</option>
                    <option value="false">{lang === 'am' ? 'ያልተከተበ' : 'Not Vaccinated'}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'መግለጫ (አማራጭ)' : 'Description (Details)'}</label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="e.g. Grass-fed, healthy Menz sheep, ready for Ethiopian holiday celebrations."
                  value={newAnimal.description}
                  onChange={e => setNewAnimal({ ...newAnimal, description: e.target.value })}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'ምስሎች (እስከ 4 ምስሎች)' : 'Images (Up to 4)'}</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  {imageFiles.map((file, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                      <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' }} />
                      <button type="button" onClick={() => setImageFiles(files => files.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  {imageFiles.length < 4 && (
                    <label style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', border: '2px dashed var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 24 }}>
                      +
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/jpg" multiple onChange={e => {
                        const newFiles = Array.from(e.target.files);
                        setImageFiles(prev => [...prev, ...newFiles].slice(0, 4));
                      }} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-gold w-full text-center" style={{ justifyContent: 'center', marginTop: 12 }} disabled={isUploading}>
                {isUploading ? <><span className="btn-spinner" style={{ marginRight: 8 }} /> {lang === 'am' ? 'በመጫን ላይ...' : 'Uploading...'}</> : (lang === 'am' ? 'እንስሳውን መዝግብ' : 'Add Listing to Queue')}
              </button>
            </form>
            </div>{/* end bottom-sheet-body */}
          </div>{/* end bottom-sheet */}
        </>
      )}

      {/* MODAL 2: REQUEST PAYOUT */}
      {showPayoutModal && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifycontent: 'center', zIndex: 1000 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(3px)' }} onClick={() => setShowPayoutModal(false)} />
          <div className="card glass flex flex-column" style={{
            position: 'relative', width: '95%', maxWidth: 440,
            padding: 24, zIndex: 1001, borderRadius: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease-out', margin: 'auto'
          }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800 }}>💵 {lang === 'am' ? 'ገንዘብ ማውጣት ጠይቅ' : 'Request Payout Withdrawal'}</h3>
              <button className="btn btn-ghost" onClick={() => {
                setShowPayoutModal(false);
                setAccountNumber('');
                setAccountName('');
              }} style={{ padding: 4 }}>✕</button>
            </div>
            
            <form onSubmit={handleRequestPayout} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'የገንዘብ መጠን (ብር)' : 'Payout Amount (ETB)'}</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="e.g. 5000"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  max={wallet ? wallet.balance : 0}
                  required
                />
                <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  {lang === 'am' 
                    ? `ከፍተኛው ማውጣት የሚችሉት፡ ${wallet ? formatETB(wallet.balance) : '0.00 ብር'}` 
                    : `Maximum available for withdrawal: ${wallet ? formatETB(wallet.balance) : '0.00 ETB'}`}
                </small>
              </div>

              {/* Payout method cards */}
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'የመክፈያ ዘዴ ይምረጡ' : 'Select Method'}</label>
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
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Number or Phone Input */}
              <div className="form-group">
                <label className="form-label">
                  {withdrawalMethod === 'BANK_TRANSFER' ? (lang === 'am' ? 'የባንክ አካውንት ቁጥር' : 'Bank Account Number') : (lang === 'am' ? 'የስልክ ቁጥር' : 'Phone Number')}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    withdrawalMethod === 'BANK_TRANSFER'
                      ? 'e.g. 1000123456789'
                      : 'e.g. 0911234567'
                  }
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  required
                />
              </div>

              {/* Account Name (Only for Bank) */}
              {withdrawalMethod === 'BANK_TRANSFER' && (
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'የአካውንት ስም' : 'Account Holder Name'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Abebe Kebede"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'የማውጫ ምክንያት' : 'Reason for Withdrawal'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Telebirr Transfer, CBE Bank Transfer"
                  value={payoutReason}
                  onChange={e => setPayoutReason(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-gold w-full text-center" style={{ justifyContent: 'center', marginTop: 8 }}>
                {lang === 'am' ? 'የክፍያ ጥያቄ ላክ' : 'Submit Payout Request'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: EDIT ANIMAL LISTING */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(3px)' }} onClick={() => setShowEditModal(false)} />
          <div className="card glass flex flex-column" style={{
            position: 'relative', width: '90%', maxWidth: 540,
            padding: 24, zIndex: 1001, borderRadius: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800 }}>✏️ {lang === 'am' ? 'ዝርዝር አስተካክል' : 'Edit Livestock Listing'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)} style={{ padding: 4 }}>✕</button>
            </div>
            
            <form onSubmit={handleEditAnimalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ዓይነት' : 'Livestock Type'}</label>
                  <select
                    className="form-input form-select"
                    value={editAnimalForm.type}
                    onChange={e => setEditAnimalForm({ ...editAnimalForm, type: e.target.value })}
                  >
                    <option value="sheep">{lang === 'am' ? 'በግ' : 'Sheep'}</option>
                    <option value="goat">{lang === 'am' ? 'ፍየል' : 'Goat'}</option>
                    <option value="cattle">{lang === 'am' ? 'በሬ/ላም' : 'Cattle'}</option>
                    <option value="hen">{lang === 'am' ? 'ዶሮ' : 'Hen'}</option>
                    <option value="kircha">{lang === 'am' ? 'ኪርቻ (የጋራ)' : 'Kircha (Share Group)'}</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ዝርያ' : 'Breed Name'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Harar, Menz, Gondar"
                    value={editAnimalForm.breed}
                    onChange={e => setEditAnimalForm({ ...editAnimalForm, breed: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ክብደት (ኪሎግራም)' : 'Weight (kg)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="e.g. 45"
                    value={editAnimalForm.weight}
                    onChange={e => setEditAnimalForm({ ...editAnimalForm, weight: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ዕድሜ (አማራጭ)' : 'Age / Teeth count'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 1.5 Years, 2 Teeth"
                    value={editAnimalForm.age}
                    onChange={e => setEditAnimalForm({ ...editAnimalForm, age: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ዋጋ (ብር)' : 'Asking Price (ETB)'}</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 15000"
                    value={editAnimalForm.price}
                    onChange={e => setEditAnimalForm({ ...editAnimalForm, price: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'የጤና ማረጋገጫ' : 'Health Certificate'}</label>
                  <select
                    className="form-input form-select"
                    value={editAnimalForm.healthCertificate.toString()}
                    onChange={e => setEditAnimalForm({ ...editAnimalForm, healthCertificate: e.target.value === 'true' })}
                  >
                    <option value="true">{lang === 'am' ? 'አለው' : 'Yes (Checked)'}</option>
                    <option value="false">{lang === 'am' ? 'የለውም' : 'No (Not checked)'}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'አካባቢ (የእንስሳው መገኛ)' : 'Location Area'}</label>
                <select
                  className="form-input form-select"
                  value={editAnimalForm.locationArea}
                  onChange={e => setEditAnimalForm({ ...editAnimalForm, locationArea: e.target.value })}
                >
                  <option value="Bole">Bole (ቦሌ)</option>
                  <option value="Merkato">Merkato (መርካቶ)</option>
                  <option value="Kera">Kera (ቄራ)</option>
                  <option value="CMC">CMC (ሲኤምሲ)</option>
                  <option value="Lebu">Lebu (ለቡ)</option>
                  <option value="Megenagna">Megenagna (መገናኛ)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ጾታ' : 'Gender'}</label>
                  <select
                    className="form-input form-select"
                    value={editAnimalForm.gender}
                    onChange={e => setEditAnimalForm({ ...editAnimalForm, gender: e.target.value })}
                  >
                    <option value="Male">{lang === 'am' ? 'ተባዕት (ወንድ)' : 'Male'}</option>
                    <option value="Female">{lang === 'am' ? 'አንስት (ሴት)' : 'Female'}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'የጤና ሁኔታ' : 'Health Status'}</label>
                  <select
                    className="form-input form-select"
                    value={editAnimalForm.healthStatus}
                    onChange={e => setEditAnimalForm({ ...editAnimalForm, healthStatus: e.target.value })}
                  >
                    <option value="Excellent">{lang === 'am' ? 'በጣም ጥሩ' : 'Excellent'}</option>
                    <option value="Good">{lang === 'am' ? 'ጥሩ' : 'Good'}</option>
                    <option value="Fair">{lang === 'am' ? 'መካከለኛ' : 'Fair'}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{lang === 'am' ? 'ክትባት' : 'Vaccination'}</label>
                  <select
                    className="form-input form-select"
                    value={editAnimalForm.vaccinationStatus.toString()}
                    onChange={e => setEditAnimalForm({ ...editAnimalForm, vaccinationStatus: e.target.value === 'true' })}
                  >
                    <option value="true">{lang === 'am' ? 'የተከተበ' : 'Vaccinated'}</option>
                    <option value="false">{lang === 'am' ? 'ያልተከተበ' : 'Not Vaccinated'}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'መግለጫ (አማራጭ)' : 'Description (Details)'}</label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="e.g. Grass-fed, healthy Menz sheep, ready for Ethiopian holiday celebrations."
                  value={editAnimalForm.description}
                  onChange={e => setEditAnimalForm({ ...editAnimalForm, description: e.target.value })}
                  style={{ resize: 'none' }}
                />
              </div>

              <button type="submit" className="btn btn-gold w-full text-center" style={{ justifyContent: 'center', marginTop: 12 }}>
                {lang === 'am' ? 'ለውጦቹን አስቀምጥ' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
