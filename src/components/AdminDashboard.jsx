import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, TrendingUp, ShoppingBag, Bell, Calendar, CheckCircle,
  X, Ban, Plus, Send, BarChart3, AlertTriangle,
  Search, ToggleLeft, ToggleRight, DollarSign, Package,
  Download, FileText, MapPin, Clock, Shield, Eye, UserCheck, UserX,
  CreditCard, ArrowUpDown
} from 'lucide-react';
import {
  approveAnimal, rejectAnimal, broadcastNotification,
  addHoliday, toggleHoliday, processWithdrawal,
  toggleCustomerActive, updateCustomerRole,
  generateFinancialReport, addAnimalListing, updateDeliveryZone,
  formatETB, formatDate, formatDateTime,
  ANIMAL_EMOJIS, DELIVERY_ZONES, TRANSLATIONS,
  processPayout, processRefund,
  resolveSupportTicket, updateMarketPrice, deleteHoliday
} from '../db';
import {
  fetchAdminCustomers, fetchHolidays, fetchAnimals, fetchNotifications,
  fetchAdminWithdrawals, fetchAdminAuditLogs, fetchDeliveryZones,
  fetchPayouts, fetchRefunds, fetchTickets, fetchMarketPrices, fetchPriceHistory
} from '../api';

export default function AdminDashboard({ onRefresh, lang, showToast, user }) {
  const queryClient = useQueryClient();

  const { data: customersRaw = [] } = useQuery({ queryKey: ['admin-customers'], queryFn: fetchAdminCustomers });
  const customers = Array.isArray(customersRaw) ? customersRaw : (customersRaw?.customers || []);
  const { data: holidaysRaw = [] } = useQuery({ queryKey: ['holidays'], queryFn: fetchHolidays });
  const holidays = Array.isArray(holidaysRaw) ? holidaysRaw : (holidaysRaw?.holidays || []);
  const { data: animalsRaw = [] } = useQuery({ queryKey: ['animals-all'], queryFn: async () => { const { apiFetch } = await import('../db'); return apiFetch('/animals?approvedOnly=false'); } });
  const animals = Array.isArray(animalsRaw) ? animalsRaw : (animalsRaw?.animals || []);
  const { data: notificationsRaw = [] } = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications });
  const notifications = Array.isArray(notificationsRaw) ? notificationsRaw : (notificationsRaw?.notifications || []);
  const { data: withdrawalsRaw = [] } = useQuery({ queryKey: ['admin-withdrawals'], queryFn: fetchAdminWithdrawals });
  const withdrawals = Array.isArray(withdrawalsRaw) ? withdrawalsRaw : (withdrawalsRaw?.withdrawals || []);
  const { data: auditLogRaw = [] } = useQuery({ queryKey: ['admin-audit'], queryFn: fetchAdminAuditLogs });
  const auditLog = Array.isArray(auditLogRaw) ? auditLogRaw : (auditLogRaw?.auditLog || []);
  const { data: zonesRaw = [] } = useQuery({ queryKey: ['zones'], queryFn: fetchDeliveryZones });
  const zones = Array.isArray(zonesRaw) ? zonesRaw : (zonesRaw?.zones || []);

  const { data: payoutsRaw = [] } = useQuery({ queryKey: ['payouts'], queryFn: fetchPayouts });
  const payouts = Array.isArray(payoutsRaw) ? payoutsRaw : (payoutsRaw?.payouts || []);
  const { data: refundsRaw = [] } = useQuery({ queryKey: ['refunds'], queryFn: fetchRefunds });
  const refunds = Array.isArray(refundsRaw) ? refundsRaw : (refundsRaw?.refunds || []);
  const { data: ticketsRaw = [] } = useQuery({ queryKey: ['tickets'], queryFn: fetchTickets });
  const tickets = Array.isArray(ticketsRaw) ? ticketsRaw : (ticketsRaw?.tickets || []);
  const { data: marketPricesRaw = [] } = useQuery({ queryKey: ['market-prices'], queryFn: fetchMarketPrices });
  const marketPrices = Array.isArray(marketPricesRaw) ? marketPricesRaw : (marketPricesRaw?.marketPrices || []);
  const { data: priceHistoryRaw = [] } = useQuery({ queryKey: ['price-history'], queryFn: fetchPriceHistory });
  const priceHistory = Array.isArray(priceHistoryRaw) ? priceHistoryRaw : (priceHistoryRaw?.priceHistory || []);

  const [activeSection, setActiveSection] = useState(() => {
    return sessionStorage.getItem('adminDashboardActiveSection') || 'overview';
  });

  useEffect(() => {
    sessionStorage.setItem('adminDashboardActiveSection', activeSection);
  }, [activeSection]);

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState('system');
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayNameEn, setNewHolidayNameEn] = useState('');
  const [newHolidayDeadline, setNewHolidayDeadline] = useState('');
  const [newHolidayMinDeposit, setNewHolidayMinDeposit] = useState('');
  const [newHolidayIcon, setNewHolidayIcon] = useState('🎉');
  
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [newAnimal, setNewAnimal] = useState({
    type: 'sheep', breed: '', weight: '', price: '', age: '',
    locationArea: 'Megenagna', description: '', sellerName: 'Admin', sellerRating: 5.0, healthCertificate: true
  });
  const [editZone, setEditZone] = useState(null);

  const [searchCustomer, setSearchCustomer] = useState('');
  const [wrNotes, setWrNotes] = useState({});
  const [report, setReport] = useState(null);
  const [rfNotes, setRfNotes] = useState({});
  const [priceForm, setPriceForm] = useState({ animalType: 'SHEEP', breed: '', grade: 'Grade A', price: '' });

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const translateAnimal = (type) => {
    const map = {
      'sheep': lang === 'am' ? 'በግ' : 'Sheep',
      'goat': lang === 'am' ? 'ፍየል' : 'Goat',
      'cattle': lang === 'am' ? 'በሬ/ላም' : 'Cattle',
      'hen': lang === 'am' ? 'ዶሮ' : 'Hen',
      'kircha': lang === 'am' ? 'ኪርቻ' : 'Kircha',
    };
    return map[type] || type;
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
      'TELEBIRR': lang === 'am' ? 'ቴሌቢር' : 'Telebirr',
      'CBE_BIRR': lang === 'am' ? 'ሲቢኢ ብር' : 'CBE Birr',
      'BANK_TRANSFER': lang === 'am' ? 'ባንክ ማስተላለፍ' : 'Bank Transfer',
    };
    return map[m] || m;
  };

  const translateArea = (area) => {
    const map = {
      'Megenagna': lang === 'am' ? 'መገናኛ' : 'Megenagna',
      'Bole': lang === 'am' ? 'ቦሌ' : 'Bole',
      'Jerra': lang === 'am' ? 'ጄራ' : 'Jerra',
      'Adama': lang === 'am' ? 'አዳማ' : 'Adama',
      'Menz': lang === 'am' ? 'መንዝ' : 'Menz',
      'Debre Birhan': lang === 'am' ? 'ደብረ ብርሃን' : 'Debre Birhan',
      'Sululta': lang === 'am' ? 'ሱሉልታ' : 'Sululta',
      'Merkato': lang === 'am' ? 'መርካቶ' : 'Merkato',
    };
    return map[area] || area;
  };

  const translateNotificationTitle = (title) => {
    if (lang !== 'am') return title;
    if (title.startsWith('Deposit Confirmed')) return 'ተቀማጭ ተረጋግጧል ✓';
    if (title.includes('Eid al-Adha Reminder')) return 'የዒድ አል-አድሃ ማስታወሻ';
    if (title.includes('New Animals Listed')) return 'አዲስ እንስሳት ተመዝግበዋል';
    if (title.includes('Silver Tier Achieved')) return 'የብር ደረጃ ደርሰዋል! 🎉';
    if (title.includes('Gold Tier Achieved')) return 'የወርቅ ደረጃ ደርሰዋል! 🎉';
    if (title.includes('Holiday Season Discount')) return 'የበዓል ሰሞን ቅናሽ!';
    if (title.includes('Delivery Complete')) return 'ማድረስ ተጠናቋል';
    if (title.includes('Withdrawal Requested')) return 'ገንዘብ ማውጣት ተጠይቋል';
    if (title.includes('Withdrawal Approved')) return 'ገንዘብ ማውጣት ጽድቋል ✓';
    if (title.includes('Withdrawal Rejected')) return 'ገንዘብ ማውጣት ውድቅ ተደርጓል ✗';
    if (title.includes('Holiday Deposit')) return 'የበዓል ተቀማጭ ✓';
    if (title.includes('Order Placed')) return 'ትዕዛዝ ተቀምጧል! 🎉';
    return title;
  };

  const translateNotificationMessage = (msg) => {
    if (lang !== 'am') return msg;
    if (msg.includes('Your deposit of') && msg.includes('has been confirmed')) {
      const match = msg.match(/Your deposit of ([\d,]+) ETB via (\w+) has been confirmed/);
      if (match) {
        return `የእርስዎ ተቀማጭ ${match[1]} ብር በ${translateMethod(match[2])} በኩል ተረጋግጧል።`;
      }
      return 'የተቀማጭ ገንዘብዎ በተሳካ ሁኔታ ተረጋግጧል።';
    }
    if (msg.includes('Only') && msg.includes('days left until Eid')) {
      const match = msg.match(/Only (\d+) days left until Eid! You need ([\d,]+) ETB more/);
      if (match) {
        return `ለዒድ የቀረው ${match[1]} ቀናት ብቻ ነው! ግብዎ ላይ ለመድረስ ${match[2]} ብር ተጨማሪ ያስፈልግዎታል።`;
      }
      return 'ለዒድ ቀሪ ቀናትን እና ተጨማሪ ቁጠባዎችን ያረጋግጡ።';
    }
    if (msg.includes('new sheep have been listed in your area')) {
      const match = msg.match(/(\d+) new sheep/);
      return `${match ? match[1] : 'አዳዲስ'} በጎች በአቅራቢያዎ ገበያ ላይ ቀርበዋል። ገበያውን ይመልከቱ!`;
    }
    if (msg.includes('total deposits have crossed')) {
      return 'እንኳን ደስ አሎት! ጠቅላላ ተቀማጭዎ 10,000 ብር አልፏል። አሁን የብር ደረጃ አባል ነዎት።';
    }
    if (msg.includes('10% off delivery fees')) {
      return 'ከዒድ በፊት ለሚደረጉ ትዕዛዞች በሙሉ የማድረሻ ክፍያ ላይ የ 10% ቅናሽ ያግኙ። የማስተዋወቂያ ኮድ: EID2026';
    }
    if (msg.includes('Menz sheep has been delivered successfully')) {
      return 'የመንዝ በግዎ በተሳካ ሁኔታ ደርሷል። ይበዓል ቦርሳን ስለተጠቀሙ እናመሰግናለን!';
    }
    if (msg.includes('Your withdrawal request for') && msg.includes('is pending admin approval')) {
      const match = msg.match(/Your withdrawal request for ([\d,]+) ETB is pending/);
      return `የእርስዎ የ${match ? match[1] : ''} ብር የገንዘብ ማውጣት ጥያቄ የአስተዳዳሪ ማጽደቅን በመጠባበቅ ላይ ነው።`;
    }
    if (msg.includes('Your withdrawal of') && msg.includes('has been approved and processed')) {
      const match = msg.match(/Your withdrawal of ([\d,]+) ETB/);
      return `የእርስዎ የ${match ? match[1] : ''} ብር የገንዘብ ማውጣት ተፈቅዶ ተከናውኗል።`;
    }
    if (msg.includes('Your withdrawal request was rejected')) {
      return `የገንዘብ ማውጣት ጥያቄዎ ውድቅ ተደርጓል።`;
    }
    if (msg.includes('deposited towards')) {
      const match = msg.match(/([\d,]+) ETB deposited towards (.*)\./);
      if (match) {
        return `${match[1]} ብር ለ${match[2] === 'Eid' ? 'ዒድ' : match[2]} ቁጠባ ገቢ ተደርጓል።`;
      }
    }
    if (msg.includes('Your order for a') && msg.includes('has been placed')) {
      return msg.replace('Your order for a', 'ትዕዛዝዎ ለ')
                .replace('has been placed.', 'ተቀምጧል።')
                .replace('Delivery to', 'ማድረሻ ወደ')
                .replace('Ready for pickup.', 'ለመውሰድ ዝግጁ ነው።');
    }
    return msg;
  };

  const translateAction = (action) => {
    if (lang !== 'am') return action.replace(/_/g, ' ').toUpperCase();
    const map = {
      'approve_withdrawal': 'የገንዘብ ማውጣትን ማጽደቅ',
      'reject_withdrawal': 'የገንዘብ ማውጣትን ውድቅ ማድረግ',
      'broadcast_notification': 'ማሳወቂያ ማሰራጨት',
      'approve_animal': 'እንስሳ ማጽደቅ',
      'reject_animal': 'እንስሳ ውድቅ ማድረግ',
    };
    return map[action] || action.replace(/_/g, ' ').toUpperCase();
  };

  const translateAuditDetails = (details) => {
    if (!details) return '';
    if (lang !== 'am') return details;
    if (details.includes('Approved withdrawal of')) {
      return details.replace('Approved withdrawal of', 'የገንዘብ ማውጣት ተፈቅዷል:')
                    .replace('ETB', 'ብር');
    }
    if (details.includes('Rejected withdrawal of')) {
      return details.replace('Rejected withdrawal of', 'የገንዘብ ማውጣት ውድቅ ተደርጓል:')
                    .replace('ETB', 'ብር');
    }
    if (details.includes('Broadcast:')) {
      return details.replace('Broadcast:', 'የተሰራጨ መልዕክት:');
    }
    if (details.includes('Approved animal listing')) {
      return details.replace('Approved animal listing', 'እንስሳ ጸድቋል መለያ:');
    }
    if (details.includes('Rejected animal listing')) {
      return details.replace('Rejected animal listing', 'እንስሳ ውድቅ ተደርጓል መለያ:');
    }
    return details;
  };

  const refresh = async () => {
    await queryClient.invalidateQueries();
  };

  const totalDeposits = customers.reduce((s, c) => s + c.totalDeposits, 0);
  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);
  const activeListings = animals.filter(a => a.isActive && a.isApproved).length;
  const pendingApprovals = animals.filter(a => a.isActive && !a.isApproved).length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  const filteredCustomers = customers.filter(c => !searchCustomer || c.fullName.toLowerCase().includes(searchCustomer.toLowerCase()) || c.phone.includes(searchCustomer) || (c.faydaId && c.faydaId.toLowerCase().includes(searchCustomer.toLowerCase())));

  const handleApprove = async (id) => {
    try {
      await approveAnimal(id);
      if (showToast) {
        showToast(
          lang === 'am' ? 'እንስሳው በተሳካ ሁኔታ ጸድቋል! ✓' : 'Animal listing approved successfully! ✓',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to approve', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectAnimal(id);
      if (showToast) {
        showToast(
          lang === 'am' ? 'እንስሳው ውድቅ ተደርጓል።' : 'Animal listing rejected.',
          'warning'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to reject', 'error');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;
    try {
      await broadcastNotification(broadcastTitle.trim(), broadcastMsg.trim(), broadcastType);
      setBroadcastTitle(''); setBroadcastMsg('');
      setShowBroadcast(false);
      if (showToast) {
        showToast(
          lang === 'am' ? 'የማሳወቂያ መልእክት ተሰራጭቷል! 📢' : 'Notification broadcasted successfully! 📢',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to broadcast', 'error');
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayName.trim() || !newHolidayDeadline) return;
    try {
      await addHoliday({
        name: newHolidayName.trim(),
        nameEn: newHolidayNameEn.trim() || newHolidayName.trim(),
        deadline: newHolidayDeadline,
        minimumDeposit: parseFloat(newHolidayMinDeposit) || 2000,
        animalTypes: ['sheep', 'goat', 'hen', 'cattle'],
        color: 'enkutatash',
        icon: newHolidayIcon,
        description: ''
      });
      setShowAddHoliday(false); setNewHolidayName(''); setNewHolidayNameEn(''); setNewHolidayDeadline(''); setNewHolidayMinDeposit('');
      if (showToast) {
        showToast(
          lang === 'am' ? 'አዲስ የበዓል ቁጠባ በተሳካ ሁኔታ ተጨምሯል! 📅' : 'New holiday savings added successfully! 📅',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to add holiday', 'error');
    }
  };

  const handleProcessWR = async (wrId, approve) => {
    const note = wrNotes[wrId] || '';
    try {
      await processWithdrawal(wrId, approve, note);
      setWrNotes(prev => ({ ...prev, [wrId]: '' }));
      if (showToast) {
        showToast(
          approve 
            ? (lang === 'am' ? 'የገንዘብ ማውጫ ጥያቄው ጽድቋል! ✓' : 'Withdrawal request approved successfully! ✓')
            : (lang === 'am' ? 'የገንዘብ ማውጫ ጥያቄው ውድቅ ተደርጓል።' : 'Withdrawal request rejected.'),
          approve ? 'success' : 'warning'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to process withdrawal', 'error');
    }
  };

  const handleToggleCustomer = async (id) => {
    try {
      await toggleCustomerActive(id);
      if (showToast) {
        showToast(
          lang === 'am' ? 'የደንበኛ ሁኔታ ተቀይሯል።' : 'Customer status updated.',
          'info'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await updateCustomerRole(id, role);
      if (showToast) {
        showToast(
          lang === 'am' ? 'የደንበኛ ሚና በተሳካ ሁኔታ ተቀይሯል! ✓' : 'Customer role updated successfully! ✓',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to change role', 'error');
    }
  };

  const handleProcessPayout = async (sellerId) => {
    try {
      await processPayout(sellerId);
      if (showToast) {
        showToast(
          lang === 'am' ? 'ክፍያው በተሳካ ሁኔታ ተፈጽሟል! ✓' : 'Payout processed successfully! ✓',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to process payout', 'error');
    }
  };

  const handleProcessRefund = async (id, approve) => {
    const note = rfNotes[id] || '';
    try {
      await processRefund(id, approve, note);
      setRfNotes(prev => ({ ...prev, [id]: '' }));
      if (showToast) {
        showToast(
          approve 
            ? (lang === 'am' ? 'ተመላሹ በስኬት ጸድቋል! ✓' : 'Refund approved successfully! ✓')
            : (lang === 'am' ? 'ተመላሽ ጥያቄው ውድቅ ተደርጓል።' : 'Refund request rejected.'),
          approve ? 'success' : 'warning'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to process refund', 'error');
    }
  };

  const handleResolveTicket = async (id) => {
    try {
      await resolveSupportTicket(id);
      if (showToast) {
        showToast(
          lang === 'am' ? 'ቲኬቱ በተሳካ ሁኔታ ተፈትቷል! ✓' : 'Support ticket resolved successfully! ✓',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to resolve ticket', 'error');
    }
  };

  const handleUpdatePrice = async () => {
    if (!priceForm.breed || !priceForm.price) return;
    try {
      await updateMarketPrice(priceForm.animalType, priceForm.breed, priceForm.grade, parseFloat(priceForm.price));
      setPriceForm({ animalType: 'SHEEP', breed: '', grade: 'Grade A', price: '' });
      if (showToast) {
        showToast(
          lang === 'am' ? 'የገበያ ማጣቀሻ ዋጋ ተዘምኗል! ✓' : 'Market reference price updated! ✓',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update reference price', 'error');
    }
  };

  const handleGenReport = () => {
    try {
      const generated = generateFinancialReport();
      setReport(generated);
      if (showToast) {
        showToast(
          lang === 'am' ? 'የፋይናንስ ሪፖርት ተፈጥሯል!' : 'Financial report generated!',
          'success'
        );
      }
    } catch (err) {
      if (showToast) showToast('Failed to generate report', 'error');
    }
  };

  const handleAddAnimal = async () => {
    if (!newAnimal.breed || !newAnimal.price) return;
    try {
      await addAnimalListing({
        ...newAnimal,
        price: parseFloat(newAnimal.price),
        weight: parseFloat(newAnimal.weight),
        availableDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
        isApproved: true
      });
      setShowAddAnimal(false);
      setNewAnimal({ type: 'sheep', breed: '', weight: '', price: '', age: '', location: { area: 'Megenagna' }, description: '', sellerName: 'Admin', sellerRating: 5.0, healthCertificate: true });
      if (showToast) {
        showToast(
          lang === 'am' ? 'አዲስ እንስሳ በተሳካ ሁኔታ ተመዝግቧል! 🐑' : 'New animal listing added successfully! 🐑',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to add animal', 'error');
    }
  };

  const handleZoneUpdate = async () => {
    if (!editZone) return;
    try {
      await updateDeliveryZone(editZone.name, editZone.lat, editZone.lng);
      setEditZone(null);
      if (showToast) {
        showToast(
          lang === 'am' ? 'የማድረሻ ዞን መረጃ ተዘምኗል! ✓' : 'Delivery zone coordinates updated! ✓',
          'success'
        );
      }
      await refresh();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update zone', 'error');
    }
  };

  const exportReport = () => {
    if (!report) return;
    const text = `YEBEAL BORSA - Financial Report\nGenerated: ${formatDateTime(report.generatedAt)}\n${'='.repeat(60)}\n\nSUMMARY\nTotal Customers: ${report.summary.totalCustomers}\nActive Customers: ${report.summary.activeCustomers}\nTotal System Deposits: ${formatETB(report.summary.totalSystemDeposits)}\nTotal System Spent: ${formatETB(report.summary.totalSystemSpent)}\nActive Listings: ${report.summary.activeListings}\nPending Approvals: ${report.summary.pendingApprovals}\nTotal Orders: ${report.summary.totalOrders}\nPending Withdrawals: ${report.summary.pendingWithdrawals}\n\nTIER BREAKDOWN\nGold: ${report.tierBreakdown.gold}\nSilver: ${report.tierBreakdown.silver}\nBronze: ${report.tierBreakdown.bronze}\n\nHOLIDAYS\n${report.holidays.map(h => `${h.name} - Deadline: ${h.deadline} - Min Deposit: ${formatETB(h.minimumDeposit)} - ${h.isActive ? 'Active' : 'Inactive'}`).join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'yebeal_borsa_financial_report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    { key: 'overview', label: t.overview, icon: <BarChart3 size={16} /> },
    { key: 'customers', label: t.customers, icon: <Users size={16} /> },
    { key: 'holidays', label: t.holidays, icon: <Calendar size={16} /> },
    { key: 'animals', label: t.animals, icon: <Package size={16} />, badge: pendingApprovals },
    { key: 'withdrawals', label: t.withdrawals, icon: <DollarSign size={16} />, badge: pendingWithdrawals },
    { key: 'payouts', label: lang === 'am' ? 'ሻጭ ክፍያዎች' : 'Seller Payouts', icon: <CreditCard size={16} />, badge: payouts.length },
    { key: 'refunds', label: lang === 'am' ? 'ተመላሽ ጥያቄዎች' : 'Refund Requests', icon: <ArrowUpDown size={16} />, badge: refunds.length },
    { key: 'tickets', label: lang === 'am' ? 'ድጋፍ ቲኬቶች' : 'Support Tickets', icon: <FileText size={16} />, badge: tickets.filter(tk => tk.status === 'PENDING').length },
    { key: 'marketPrices', label: lang === 'am' ? 'የገበያ ዋጋዎች' : 'Market Prices', icon: <TrendingUp size={16} /> },
    { key: 'reports', label: t.reports, icon: <FileText size={16} /> },
    { key: 'notifications', label: t.notifications, icon: <Bell size={16} /> },
    { key: 'zones', label: t.deliveryZones, icon: <MapPin size={16} /> },
    { key: 'audit', label: t.auditLog, icon: <Shield size={16} /> },
  ];

  return (
    <div className="fade-in">
      <div className="page-header"><h2>{t.admin} {t.dashboard} ⚙️</h2><p>{t.manageSystemSettingsDesc}</p></div>

      <div className="tabs" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        {sections.map(s => (
          <button key={s.key} className={`tab ${activeSection === s.key ? 'active' : ''}`} onClick={() => setActiveSection(s.key)} style={{ fontSize: '0.78rem', padding: '8px 12px' }}>
            {s.icon}<span style={{ marginLeft: 4 }}>{s.label}</span>
            {s.badge > 0 && <span className="nav-badge" style={{ marginLeft: 4 }}>{s.badge}</span>}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeSection === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
            {/* Platform Metrics */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>{lang === 'am' ? 'የስርዓት መለኪያዎች (ያለፉት 30 ቀናት)' : 'PLATFORM METRICS (Last 30 Days)'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'am' ? 'ተጠቃሚዎች' : 'Users'}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{customers.length} <span style={{ fontSize: '0.65rem', color: 'var(--green-bright)' }}>+12%</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'am' ? 'ትዕዛዞች' : 'Transactions'}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{847} <span style={{ fontSize: '0.65rem', color: 'var(--green-bright)' }}>+8%</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'am' ? 'የገንዘብ መጠን' : 'Volume'}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatETB(totalDeposits + totalSpent)}</div>
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>{lang === 'am' ? 'የፋይናንስ አጠቃላይ እይታ' : 'FINANCIAL OVERVIEW'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'am' ? 'ተቀማጭ' : 'Deposits'}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--green-bright)' }}>{formatETB(totalDeposits)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'am' ? 'ማውጣት' : 'Withdrawals'}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)' }}>{formatETB(withdrawals.reduce((acc, w) => acc + w.amount, 0))}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'am' ? 'የስርዓት ክፍያ' : 'Platform Fee'}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--blue)' }}>{formatETB(totalSpent * 0.05)}</div>
                </div>
              </div>
            </div>

            {/* Marketplace Activity */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>{lang === 'am' ? 'የገበያ እንቅስቃሴ' : 'MARKETPLACE ACTIVITY'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                  <span>{ANIMAL_EMOJIS['sheep']} {lang === 'am' ? 'በግ' : 'Sheep'}</span>
                  <span>Listed: <strong style={{ color: 'var(--text-primary)' }}>{animals.filter(a => a.type === 'sheep').length}</strong> | Sold: <strong style={{ color: 'var(--green-bright)' }}>21</strong></span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                  <span>{ANIMAL_EMOJIS['goat']} {lang === 'am' ? 'ፍየል' : 'Goats'}</span>
                  <span>Listed: <strong style={{ color: 'var(--text-primary)' }}>{animals.filter(a => a.type === 'goat').length}</strong> | Sold: <strong style={{ color: 'var(--green-bright)' }}>12</strong></span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                  <span>{ANIMAL_EMOJIS['cattle']} {lang === 'am' ? 'በሬ/ላም' : 'Cattle'}</span>
                  <span>Listed: <strong style={{ color: 'var(--text-primary)' }}>{animals.filter(a => a.type === 'cattle').length}</strong> | Sold: <strong style={{ color: 'var(--green-bright)' }}>3</strong></span>
                </div>
              </div>
            </div>
          </div>

          {(pendingApprovals > 0 || pendingWithdrawals > 0) && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {pendingApprovals > 0 && (
                <div className="card" style={{ flex: 1, borderLeft: '4px solid var(--gold)', cursor: 'pointer' }} onClick={() => setActiveSection('animals')}>
                  <div className="flex items-center gap-3"><AlertTriangle size={20} color="var(--gold)" /><div><div style={{ fontWeight: 700 }}>{pendingApprovals} {t.pendingAnimalApprovals}</div><div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.clickToReview}</div></div></div>
                </div>
              )}
              {pendingWithdrawals > 0 && (
                <div className="card" style={{ flex: 1, borderLeft: '4px solid var(--red)', cursor: 'pointer' }} onClick={() => setActiveSection('withdrawals')}>
                  <div className="flex items-center gap-3"><AlertTriangle size={20} color="var(--red)" /><div><div style={{ fontWeight: 700 }}>{pendingWithdrawals} {t.pendingWithdrawals}</div><div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.clickToProcess}</div></div></div>
                </div>
              )}
            </div>
          )}

          <div className="grid-3" style={{ gap: 16 }}>
            <div className="card" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => setShowBroadcast(true)}><Bell size={28} color="var(--gold)" style={{ margin: '0 auto 12px' }} /><div style={{ fontWeight: 700 }}>{lang === 'am' ? 'ማሳወቂያ ማሰራጫ' : 'Broadcast Notification'}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{lang === 'am' ? 'ለመላው ስርዓት መልዕክት ይላኩ' : 'Send system-wide message'}</div></div>
            <div className="card" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => { setActiveSection('holidays'); setShowAddHoliday(true); }}><Calendar size={28} color="var(--green)" style={{ margin: '0 auto 12px' }} /><div style={{ fontWeight: 700 }}>{lang === 'am' ? 'በዓል ጨምር' : 'Add Holiday'}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{lang === 'am' ? 'አዲስ በዓል ያቅዱ' : 'Schedule new holiday'}</div></div>
            <div className="card" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => { setActiveSection('reports'); handleGenReport(); }}><BarChart3 size={28} color="var(--blue)" style={{ margin: '0 auto 12px' }} /><div style={{ fontWeight: 700 }}>{t.generateReport}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{lang === 'am' ? 'የፋይናንስ አጠቃላይ እይታ' : 'Financial overview'}</div></div>
          </div>
        </div>
      )}

      {/* CUSTOMERS */}
      {activeSection === 'customers' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left"><div className="search-bar" style={{ flex: 1, maxWidth: 360 }}><Search size={16} className="search-icon" /><input placeholder={t.searchSavers} value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} /></div></div>
            <div className="action-bar-right"><span className="badge badge-muted">{filteredCustomers.length} {lang === 'am' ? 'ደንበኞች' : 'customers'}</span></div>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>{lang === 'am' ? 'ደንበኛ' : 'Customer'}</th><th>{t.phone}</th><th>{t.faydaId}</th><th>{t.role}</th><th>{lang === 'am' ? 'ደረጃ' : 'Tier'}</th><th>{t.deposit}</th><th>{t.spent}</th><th>{t.status}</th><th>{t.actions}</th></tr></thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id} style={{ opacity: c.isActive === false ? 0.5 : 1 }}>
                    <td><div className="flex items-center gap-3"><div style={{ width: 34, height: 34, borderRadius: '50%', background: c.tier === 'gold' ? 'var(--gold-soft)' : c.tier === 'silver' ? 'hsla(0,0%,72%,0.12)' : 'hsla(30,60%,50%,0.12)', color: c.tier === 'gold' ? 'var(--gold)' : c.tier === 'silver' ? 'var(--tier-silver)' : 'var(--tier-bronze)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.72rem' }}>{c.avatar}</div><div><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.fullName}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.fullNameAmharic}</div></div></div></td>
                    <td style={{ fontSize: '0.8rem' }}>{c.phone}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{c.faydaId}</span></td>
                    <td>
                      <select className="form-input form-select" value={c.role || 'customer'} onChange={e => handleRoleChange(c.id, e.target.value)} style={{ padding: '4px 8px', fontSize: '0.75rem', width: 100 }}>
                        <option value="customer">{lang === 'am' ? 'ደንበኛ' : 'Customer'}</option>
                        <option value="seller">{lang === 'am' ? 'ሻጭ' : 'Seller'}</option>
                        <option value="admin">{lang === 'am' ? 'አስተዳዳሪ' : 'Admin'}</option>
                      </select>
                    </td>
                    <td><span className={`badge ${c.tier === 'gold' ? 'badge-tier-gold' : c.tier === 'silver' ? 'badge-silver' : 'badge-bronze'}`}>{c.tier === 'gold' ? '🥇' : c.tier === 'silver' ? '🥈' : '🥉'} {c.tier === 'gold' ? (lang === 'am' ? 'ወርቅ' : 'gold') : c.tier === 'silver' ? (lang === 'am' ? 'ብር' : 'silver') : (lang === 'am' ? 'ነሐስ' : 'bronze')}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--green-bright)', fontSize: '0.82rem' }}>{formatETB(c.totalDeposits)}</td>
                    <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{formatETB(c.totalSpent)}</td>
                    <td><span className={`badge ${c.isActive !== false ? 'badge-green' : 'badge-red'}`}>{c.isActive !== false ? (lang === 'am' ? 'ንቁ' : 'Active') : (lang === 'am' ? 'የተዘጋ' : 'Disabled')}</span></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => handleToggleCustomer(c.id)} title={c.isActive !== false ? (lang === 'am' ? 'አሰናክል' : 'Disable') : (lang === 'am' ? 'አንቃ' : 'Enable')}>{c.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HOLIDAYS */}
      {activeSection === 'holidays' && (
        <div>
          <div className="action-bar"><div className="action-bar-left"><Calendar size={18} color="var(--green)" /><span style={{ fontWeight: 600 }}>{t.holidays}</span></div><div className="action-bar-right"><button className="btn btn-primary btn-sm" onClick={() => setShowAddHoliday(true)}><Plus size={14} /> {lang === 'am' ? 'ጨምር' : 'Add'}</button></div></div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>{lang === 'am' ? 'በዓል' : 'Holiday'}</th><th>{lang === 'am' ? 'ቀነ-ገደብ' : 'Deadline'}</th><th>{lang === 'am' ? 'ዝቅተኛ ተቀማጭ' : 'Min. Deposit'}</th><th>{t.animals}</th><th>{t.status}</th><th>{lang === 'am' ? 'ተግባር' : 'Actions'}</th></tr></thead>
              <tbody>
                {holidays.map(h => (
                  <tr key={h.id}>
                    <td><div className="flex items-center gap-3"><span style={{ fontSize: '1.3rem' }}>{h.icon}</span><div><div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{lang === 'am' ? h.name : h.nameEn}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{lang === 'am' ? h.nameEn : h.name}</div></div></div></td>
                    <td style={{ fontWeight: 600 }}>{formatDate(h.deadline)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--gold)' }}>{formatETB(h.minimumDeposit)}</td>
                    <td><div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>{h.animalTypes.map(type => <span key={type} className="badge badge-muted" style={{ fontSize: '0.6rem' }}>{ANIMAL_EMOJIS[type]}</span>)}</div></td>
                    <td><span className={`badge ${h.isActive ? 'badge-green' : 'badge-red'}`}>{h.isActive ? (lang === 'am' ? '✓ ንቁ' : '✓ Active') : (lang === 'am' ? '✗ ጠፍቷል' : '✗ Off')}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { toggleHoliday(h.id); refresh(); }}>{h.isActive ? <ToggleRight size={18} color="var(--green)" /> : <ToggleLeft size={18} color="var(--text-muted)" />}</button>
                        <button className="btn btn-ghost btn-sm" onClick={async () => {
                          if (window.confirm(lang === 'am' ? 'ይህን በዓል በእርግጠኝነት ማጥፋት ይፈልጋሉ?' : 'Are you sure you want to delete this holiday?')) {
                            try {
                              await deleteHoliday(h.id);
                              alert(lang === 'am' ? 'በዓሉ ጠፍቷል!' : 'Holiday deleted!');
                              refresh();
                            } catch (err) {
                              alert(err.message);
                            }
                          }
                        }} title={lang === 'am' ? 'ማጥፋት' : 'Delete'} style={{ color: 'var(--red)', padding: 4 }}>
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ANIMALS */}
      {activeSection === 'animals' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left"><Package size={18} color="var(--gold)" /><span style={{ fontWeight: 600 }}>{t.marketplace}</span>{pendingApprovals > 0 && <span className="badge badge-gold">{pendingApprovals} {lang === 'am' ? 'በመጠባበቅ ላይ' : 'pending'}</span>}</div>
            <div className="action-bar-right"><button className="btn btn-primary btn-sm" onClick={() => setShowAddAnimal(true)}><Plus size={14} /> {t.addListing}</button></div>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>{t.animal}</th><th>{t.seller}</th><th>{lang === 'am' ? 'ክብደት' : 'Weight'}</th><th>{lang === 'am' ? 'ዋጋ' : 'Price'}</th><th>{lang === 'am' ? 'አካባቢ' : 'Location'}</th><th>{lang === 'am' ? 'ማረጋገጫ' : 'Cert.'}</th><th>{t.status}</th><th>{t.actions}</th></tr></thead>
              <tbody>
                {animals.filter(a => a.isActive).map(a => (
                  <tr key={a.id} style={{ background: !a.isApproved ? 'var(--gold-soft)' : undefined }}>
                    <td><div className="flex items-center gap-3"><span style={{ fontSize: '1.3rem' }}>{ANIMAL_EMOJIS[a.type]}</span><div><div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.breed}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{translateAnimal(a.type)}</div></div></div></td>
                    <td style={{ fontSize: '0.82rem' }}>{a.sellerName === 'Admin' && lang === 'am' ? 'አስተዳዳሪ' : a.sellerName}</td><td style={{ fontWeight: 600 }}>{a.weight}kg</td><td style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatETB(a.price)}</td><td style={{ fontSize: '0.82rem' }}>{translateArea(a.locationArea)}</td>
                    <td>{a.healthCertificate ? <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>✓</span> : <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>✗</span>}</td>
                    <td>{a.isApproved ? <span className="badge badge-green">{lang === 'am' ? 'ተቀባይነት አግኝቷል' : 'OK'}</span> : <span className="badge badge-gold">{lang === 'am' ? 'በመጠባበቅ ላይ' : 'Pending'}</span>}</td>
                    <td>{!a.isApproved ? <div className="flex gap-2"><button className="btn btn-success btn-sm" onClick={() => handleApprove(a.id)}><CheckCircle size={14} /></button><button className="btn btn-danger btn-sm" onClick={() => handleReject(a.id)}><Ban size={14} /></button></div> : <button className="btn btn-ghost btn-sm" onClick={() => handleReject(a.id)}><X size={14} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WITHDRAWALS */}
      {activeSection === 'withdrawals' && (
        <div>
          <div className="action-bar"><div className="action-bar-left"><DollarSign size={18} color="var(--gold)" /><span style={{ fontWeight: 600 }}>{t.withdrawals}</span>{pendingWithdrawals > 0 && <span className="badge badge-gold">{pendingWithdrawals} {lang === 'am' ? 'በመጠባበቅ ላይ' : 'pending'}</span>}</div></div>
          {withdrawals.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🏦</div><h3>{lang === 'am' ? 'ምንም የገንዘብ ማውጫ ጥያቄዎች የሉም' : 'No Withdrawal Requests'}</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {withdrawals.sort((a, b) => (a.status === 'pending' ? -1 : 1)).map(wr => (
                <div key={wr.id} className="card" style={{ borderLeft: `4px solid ${wr.status === 'pending' ? 'var(--gold)' : wr.status === 'approved' ? 'var(--green)' : 'var(--red)'}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: wr.status === 'pending' ? 'var(--gold-soft)' : wr.status === 'approved' ? 'var(--green-soft)' : 'var(--red-soft)', color: wr.status === 'pending' ? 'var(--gold)' : wr.status === 'approved' ? 'var(--green)' : 'var(--red)' }}>
                        {wr.status === 'pending' ? <Clock size={20} /> : wr.status === 'approved' ? <CheckCircle size={20} /> : <X size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatETB(wr.amount)}</span>
                          {wr.withdrawalMethod && (
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: wr.withdrawalMethod === 'TELEBIRR' ? 'hsla(210,100%,50%,0.1)' : wr.withdrawalMethod === 'CBE_BIRR' ? 'hsla(120,100%,25%,0.1)' : 'hsla(30,100%,40%,0.1)',
                              color: wr.withdrawalMethod === 'TELEBIRR' ? '#0066cc' : wr.withdrawalMethod === 'CBE_BIRR' ? '#008000' : '#cc6600',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              {wr.withdrawalMethod === 'TELEBIRR' ? '📱' : wr.withdrawalMethod === 'CBE_BIRR' ? '🏦' : '🏧'} {translateMethod(wr.withdrawalMethod)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {lang === 'am' ? 'ተጠቃሚ' : 'User'}: <strong>{wr.userId}</strong>
                          {wr.reason && ` · ${lang === 'am' && wr.reason === 'Emergency medical expense' ? 'የአደጋ ጊዜ የህክምና ወጪ' : wr.reason}`}
                        </div>
                        {wr.accountNumber && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                            {t.accountNumber}: <code style={{ fontSize: '0.75rem', background: 'hsla(0,0%,50%,0.08)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>{wr.accountNumber}</code>
                            {wr.accountName && <span style={{ marginLeft: 8, fontWeight: 500 }}>({wr.accountName})</span>}
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatDateTime(wr.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${wr.status === 'PENDING' ? 'badge-gold' : wr.status === 'APPROVED' ? 'badge-green' : 'badge-red'}`}>
                        {wr.status === 'PENDING' ? (lang === 'am' ? '⏳ በመጠባበቅ ላይ' : '⏳ Pending') : wr.status === 'APPROVED' ? (lang === 'am' ? '✓ የጸደቀ' : '✓ Approved') : (lang === 'am' ? '✗ ውድቅ የተደረገ' : '✗ Rejected')}
                      </span>
                      {wr.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <input type="text" className="form-input" placeholder={t.adminNote} value={wrNotes[wr.id] || ''} onChange={e => setWrNotes({ ...wrNotes, [wr.id]: e.target.value })} style={{ padding: '4px 8px', fontSize: '0.75rem', width: 140 }} />
                          <button className="btn btn-success btn-sm" onClick={() => handleProcessWR(wr.id, true)}>{t.approve}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleProcessWR(wr.id, false)}>{t.reject}</button>
                        </div>
                      )}
                      {wr.adminNote && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{t.adminNoteLabel}: {wr.adminNote}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SELLER PAYOUTS */}
      {activeSection === 'payouts' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left">
              <CreditCard size={18} color="var(--green)" />
              <span style={{ fontWeight: 600 }}>{lang === 'am' ? 'ሻጭ ክፍያዎች' : 'Seller Payouts Escrow'}</span>
              <span className="badge badge-muted">{payouts.length} {lang === 'am' ? 'በመጠባበቅ ላይ' : 'pending'}</span>
            </div>
          </div>
          {payouts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <h3>{lang === 'am' ? 'ምንም ያልተከፈሉ ሻጮች የሉም' : 'No Pending Seller Payouts'}</h3>
              <p>{lang === 'am' ? 'ሁሉም የተጠናቀቁ ትዕዛዞች ክፍያዎች ተፈጽመዋል።' : 'All delivered order funds have been processed or paid.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {payouts.map(p => (
                <div key={p.sellerId} className="card" style={{ borderLeft: '4px solid var(--green)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 12, marginBottom: 12 }}>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{p.sellerName}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>ID: <code>{p.sellerId}</code></span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--green-bright)' }}>{formatETB(p.totalAmount)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {lang === 'am' ? 'የኮሚሽን ተቀናሽ (5%):' : 'Platform Comm. (5%):'} {formatETB(p.totalCommission)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                      {lang === 'am' ? 'ያልተከፈሉ ሽያጮች:' : 'Orders to Pay:'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {p.orders.map(o => (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                          <span>{ANIMAL_EMOJIS[o.animalType.toLowerCase()]} {o.animalBreed} ({translateAnimal(o.animalType.toLowerCase())})</span>
                          <span style={{ color: 'var(--text-muted)' }}>ID: #{o.id.slice(-6)}</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{formatETB(o.payoutAmount)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="btn btn-success btn-sm" onClick={() => handleProcessPayout(p.sellerId)}>
                      💸 {lang === 'am' ? 'ክፍያውን ፈጽም' : 'Disburse Escrow Payout'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REFUND REQUESTS */}
      {activeSection === 'refunds' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left">
              <ArrowUpDown size={18} color="var(--gold)" />
              <span style={{ fontWeight: 600 }}>{lang === 'am' ? 'የተመላሽ ገንዘብ ጥያቄዎች' : 'Pending Refund Requests'}</span>
              <span className="badge badge-muted">{refunds.length} {lang === 'am' ? 'በመጠባበቅ ላይ' : 'pending'}</span>
            </div>
          </div>
          {refunds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔄</div>
              <h3>{lang === 'am' ? 'ምንም የተመላሽ ጥያቄዎች የሉም' : 'No Pending Refunds'}</h3>
              <p>{lang === 'am' ? 'ሁሉም የተሰረዙ ትዕዛዞች ተመላሽ ተካሂዷል።' : 'All cancelled order refund requests have been resolved.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {refunds.map(r => (
                <div key={r.id} className="card" style={{ borderLeft: '4px solid var(--gold)' }}>
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{formatETB(r.amount)}</span>
                        <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>PENDING</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {lang === 'am' ? 'ደንበኛ:' : 'Customer:'} <strong>{r.user.fullName}</strong> ({r.user.phone})
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {lang === 'am' ? 'ትዕዛዝ መለያ:' : 'Order ID:'} #{r.orderId.slice(-8)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {lang === 'am' ? 'ምክንያት:' : 'Reason:'} <span style={{ fontStyle: 'italic' }}>{r.reason}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>{formatDateTime(r.createdAt)}</div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder={t.adminNote} 
                        value={rfNotes[r.id] || ''} 
                        onChange={e => setRfNotes({ ...rfNotes, [r.id]: e.target.value })} 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', width: 160 }} 
                      />
                      <div className="flex gap-2 justify-end">
                        <button className="btn btn-success btn-sm" onClick={() => handleProcessRefund(r.id, true)}>
                          {lang === 'am' ? 'ፍቀድ' : 'Approve'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleProcessRefund(r.id, false)}>
                          {lang === 'am' ? 'ውድቅ አድርግ' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUPPORT TICKETS */}
      {activeSection === 'tickets' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left">
              <FileText size={18} color="var(--blue)" />
              <span style={{ fontWeight: 600 }}>{lang === 'am' ? 'የድጋፍ ጥያቄዎችና የኢንሹራንስ ጥያቄዎች' : 'Customer Support & Insurance Claims'}</span>
              <span className="badge badge-muted">{tickets.length} {lang === 'am' ? 'ጠቅላላ ቲኬቶች' : 'total tickets'}</span>
            </div>
          </div>
          {tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎫</div>
              <h3>{lang === 'am' ? 'ምንም የድጋፍ ቲኬቶች የሉም' : 'No Support Tickets'}</h3>
              <p>{lang === 'am' ? 'የእርስዎ ደንበኞች ሙሉ በሙሉ ደስተኞች ናቸው!' : 'No support tickets or insurance claims filed yet.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tickets.map(tk => (
                <div key={tk.id} className="card" style={{ borderLeft: `4px solid ${tk.status === 'RESOLVED' ? 'var(--green)' : 'var(--blue)'}`, opacity: tk.status === 'RESOLVED' ? 0.75 : 1 }}>
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{tk.title}</h4>
                        <span className={`badge ${tk.category === 'INSURANCE_CLAIM' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.62rem' }}>
                          {tk.category === 'INSURANCE_CLAIM' ? (lang === 'am' ? '🚨 ኢንሹራንስ' : '🚨 INSURANCE CLAIM') : (lang === 'am' ? '💬 ድጋፍ' : '💬 CUSTOMER SUPPORT')}
                        </span>
                        <span className={`badge ${tk.status === 'RESOLVED' ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.62rem' }}>
                          {tk.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', marginTop: 8, background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {tk.message}
                      </p>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                        {lang === 'am' ? 'ከ:' : 'From:'} <strong>{tk.user.fullName}</strong> ({tk.user.phone})
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatDateTime(tk.createdAt)}</div>
                    </div>

                    {tk.status !== 'RESOLVED' && (
                      <div>
                        <button className="btn btn-success btn-sm" onClick={() => handleResolveTicket(tk.id)}>
                          ✓ {lang === 'am' ? 'ፈታሁት' : 'Mark Resolved'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MARKET PRICES */}
      {activeSection === 'marketPrices' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left">
              <TrendingUp size={18} color="var(--gold)" />
              <span style={{ fontWeight: 600 }}>{lang === 'am' ? 'የገበያ ማጣቀሻ ዋጋዎች' : 'Market Reference Price Management'}</span>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 20 }}>
            {/* Price update form */}
            <div className="card">
              <div className="card-header" style={{ paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>📈 {lang === 'am' ? 'ዋጋ አዘምን' : 'Update Reference Price'}</h3>
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'የእንስሳ ዓይነት' : 'Animal Type'}</label>
                <select 
                  className="form-input form-select" 
                  value={priceForm.animalType} 
                  onChange={e => setPriceForm({ ...priceForm, animalType: e.target.value })}
                >
                  <option value="SHEEP">{lang === 'am' ? 'በግ' : 'Sheep'}</option>
                  <option value="GOAT">{lang === 'am' ? 'ፍየል' : 'Goat'}</option>
                  <option value="CATTLE">{lang === 'am' ? 'በሬ/ላም' : 'Cattle'}</option>
                  <option value="HEN">{lang === 'am' ? 'ዶሮ' : 'Hen'}</option>
                  <option value="KIRCHA">{lang === 'am' ? 'ኪርቻ' : 'Kircha (Group)'}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'ዝርያ' : 'Breed'}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={lang === 'am' ? 'ለምሳሌ፡ Menz, Borena...' : 'e.g., Menz, Borena...'} 
                  value={priceForm.breed} 
                  onChange={e => setPriceForm({ ...priceForm, breed: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'ደረጃ (ከተፈለገ)' : 'Grade (Optional)'}</label>
                <select 
                  className="form-input form-select" 
                  value={priceForm.grade} 
                  onChange={e => setPriceForm({ ...priceForm, grade: e.target.value })}
                >
                  <option value="Grade A">Grade A (Premium)</option>
                  <option value="Grade B">Grade B (Medium)</option>
                  <option value="Grade C">Grade C (Standard)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'am' ? 'ማጣቀሻ ዋጋ (ብር)' : 'Reference Price (ETB)'}</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="e.g., 9500" 
                  value={priceForm.price} 
                  onChange={e => setPriceForm({ ...priceForm, price: e.target.value })} 
                  min="1"
                />
              </div>
              <button className="btn btn-primary" onClick={handleUpdatePrice} style={{ width: '100%', marginTop: 12 }}>
                <Plus size={16} /> {lang === 'am' ? 'የገበያ ዋጋን መዝግብ' : 'Publish Reference Price'}
              </button>
            </div>

            {/* Reference Price table */}
            <div className="card">
              <div className="card-header" style={{ paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>📊 {lang === 'am' ? 'ንቁ የማጣቀሻ ዋጋዎች' : 'Active Reference Prices'}</h3>
              </div>
              {marketPrices.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                  {lang === 'am' ? 'ምንም ንቁ የገበያ ዋጋዎች የሉም።' : 'No reference prices published yet.'}
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 380, overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{lang === 'am' ? 'ዓይነት' : 'Type'}</th>
                        <th>{lang === 'am' ? 'ዝርያ' : 'Breed'}</th>
                        <th>{lang === 'am' ? 'ደረጃ' : 'Grade'}</th>
                        <th style={{ textAlign: 'right' }}>{lang === 'am' ? 'ዋጋ' : 'Price'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketPrices.map(mp => (
                        <tr key={mp.id}>
                          <td><strong>{ANIMAL_EMOJIS[mp.animalType.toLowerCase()]} {translateAnimal(mp.animalType.toLowerCase())}</strong></td>
                          <td>{mp.breed}</td>
                          <td><span className="badge badge-muted" style={{ fontSize: '0.62rem' }}>{mp.grade || 'Grade A'}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>{formatETB(mp.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Price History Timeline */}
          {priceHistory.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header" style={{ paddingBottom: 10, marginBottom: 14 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>📜 {lang === 'am' ? 'የዋጋ ማሻሻያ ታሪክ' : 'Historical Reference Price Updates'}</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {priceHistory.map(ph => (
                  <div key={ph.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <span><strong>{ANIMAL_EMOJIS[ph.animalType.toLowerCase()]} {ph.breed}</strong></span>
                      <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>
                        {lang === 'am' ? 'አዲስ ማጣቀሻ ዋጋ ተመዝግቧል:' : 'New reference price established:'} <strong>{formatETB(ph.price)}</strong>
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      ⏱ {formatDateTime(ph.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORTS */}
      {activeSection === 'reports' && (
        <div>
          <div className="action-bar">
            <div className="action-bar-left"><FileText size={18} color="var(--blue)" /><span style={{ fontWeight: 600 }}>{t.reports}</span></div>
            <div className="action-bar-right">
              <button className="btn btn-primary btn-sm" onClick={handleGenReport}><BarChart3 size={14} /> {t.generateReport}</button>
              {report && <button className="btn btn-secondary btn-sm" onClick={exportReport}><Download size={14} /> {lang === 'am' ? 'ሪፖርት ላክ' : 'Export'}</button>}
            </div>
          </div>
          {!report ? (
            <div className="empty-state"><div className="empty-state-icon">📊</div><h3>{lang === 'am' ? 'ምንም ሪፖርት አልተፈጠረም' : 'No Report Generated'}</h3><p>{t.clickGenReport}</p></div>
          ) : (
            <div>
              <div className="stats-grid">
                <div className="stat-card gold"><div className="stat-icon"><Users size={20} /></div><div className="stat-value">{report.summary.totalCustomers}</div><div className="stat-label">{lang === 'am' ? 'ጠቅላላ ደንበኞች' : 'Total Customers'}</div></div>
                <div className="stat-card green"><div className="stat-icon"><DollarSign size={20} /></div><div className="stat-value">{formatETB(report.summary.totalSystemDeposits)}</div><div className="stat-label">{lang === 'am' ? 'የስርዓት ተቀማጭ' : 'System Deposits'}</div></div>
                <div className="stat-card blue"><div className="stat-icon"><ShoppingBag size={20} /></div><div className="stat-value">{report.summary.totalOrders}</div><div className="stat-label">{lang === 'am' ? 'ጠቅላላ ትዕዛዞች' : 'Total Orders'}</div></div>
                <div className="stat-card red"><div className="stat-icon"><TrendingUp size={20} /></div><div className="stat-value">{formatETB(report.summary.totalSystemSpent)}</div><div className="stat-label">{lang === 'am' ? 'የስርዓት ወጪ' : 'System Spent'}</div></div>
              </div>
              <div className="grid-2" style={{ gap: 16 }}>
                <div className="card"><div className="card-header"><h3>{lang === 'am' ? '📊 የደረጃዎች ስርጭት' : '📊 Tier Distribution'}</h3></div>
                  {Object.entries(report.tierBreakdown).map(([tier, count]) => (
                    <div key={tier} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <span className={`badge ${tier === 'gold' ? 'badge-tier-gold' : tier === 'silver' ? 'badge-silver' : 'badge-bronze'}`}>{tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉'} {tier === 'gold' ? (lang === 'am' ? 'ወርቅ' : 'gold') : tier === 'silver' ? (lang === 'am' ? 'ብር' : 'silver') : (lang === 'am' ? 'ነሐስ' : 'bronze')}</span>
                      <span style={{ fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
                </div>
                <div className="card"><div className="card-header"><h3>{lang === 'am' ? '📅 የበዓላት ሁኔታ' : '📅 Holiday Status'}</h3></div>
                  {report.holidays.map((h, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                      <span>{lang === 'am' ? h.name : h.nameEn}</span>
                      <span className={`badge ${h.isActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>{h.isActive ? (lang === 'am' ? 'ንቁ' : 'Active') : (lang === 'am' ? 'ጠፍቷል' : 'Off')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'am' ? 'ሪፖርቱ የተፈጠረው በ:' : 'Report generated:'} {formatDateTime(report.generatedAt)}</div>
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS */}
      {activeSection === 'notifications' && (
        <div>
          <div className="action-bar"><div className="action-bar-left"><Bell size={18} color="var(--gold)" /><span style={{ fontWeight: 600 }}>{t.notifications}</span></div><div className="action-bar-right"><button className="btn btn-primary btn-sm" onClick={() => setShowBroadcast(true)}><Send size={14} /> {t.broadcast}</button></div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.slice(0, 20).map(n => (
              <div key={n.id} className="card flex items-center gap-3" style={{ padding: '12px 18px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: n.type === 'deposit' ? 'var(--green-soft)' : n.type === 'promotion' ? 'var(--purple-glow)' : 'var(--blue-soft)', color: n.type === 'deposit' ? 'var(--green)' : n.type === 'promotion' ? 'var(--purple)' : 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={14} /></div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{translateNotificationTitle(n.title)}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{translateNotificationMessage(n.message)}</div></div>
                <div style={{ textAlign: 'right' }}><span className={`badge ${n.type === 'deposit' ? 'badge-green' : n.type === 'promotion' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>{n.type === 'deposit' ? (lang === 'am' ? 'ተቀማጭ' : 'deposit') : n.type === 'promotion' ? (lang === 'am' ? 'ማስተዋወቂያ' : 'promotion') : (lang === 'am' ? 'ስርዓት' : n.type)}</span><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{formatDateTime(n.createdAt)}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DELIVERY ZONES */}
      {activeSection === 'zones' && (
        <div>
          <div className="action-bar"><div className="action-bar-left"><MapPin size={18} color="var(--green)" /><span style={{ fontWeight: 600 }}>{t.deliveryZones}</span></div></div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>{lang === 'am' ? 'የዞን ስም' : 'Zone Name'}</th><th>{lang === 'am' ? 'ላትቲቱድ' : 'Latitude'}</th><th>{lang === 'am' ? 'ሎንጊቱድ' : 'Longitude'}</th><th>{lang === 'am' ? 'በአቅራቢያ ያሉ እንስሳት' : 'Animals Nearby'}</th><th>{t.actions}</th></tr></thead>
              <tbody>
                {Object.entries(zones).map(([name, coords]) => (
                  <tr key={name}>
                    <td style={{ fontWeight: 600 }}><MapPin size={14} color="var(--green)" style={{ verticalAlign: -2, marginRight: 6 }} />{translateArea(name)}</td>
                    {editZone?.name === name ? (
                      <>
                        <td><input type="number" className="form-input" style={{ width: 100, padding: 4 }} value={editZone.lat} onChange={e => setEditZone({ ...editZone, lat: e.target.value })} /></td>
                        <td><input type="number" className="form-input" style={{ width: 100, padding: 4 }} value={editZone.lng} onChange={e => setEditZone({ ...editZone, lng: e.target.value })} /></td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{coords.lat.toFixed(4)}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{coords.lng.toFixed(4)}</td>
                      </>
                    )}
                    <td><span className="badge badge-muted">{animals.filter(a => a.isActive && a.isApproved && a.locationArea === name).length} {lang === 'am' ? 'እንስሳት' : 'listings'}</span></td>
                    <td>
                      {editZone?.name === name ? (
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm" onClick={handleZoneUpdate}>{lang === 'am' ? 'አስቀምጥ' : 'Save'}</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditZone(null)}>{t.cancel}</button>
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditZone({ name, lat: coords.lat, lng: coords.lng })}>{lang === 'am' ? 'አርትዕ' : 'Edit'}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT LOG */}
      {activeSection === 'audit' && (
        <div>
          <div className="action-bar"><div className="action-bar-left"><Shield size={18} color="var(--blue)" /><span style={{ fontWeight: 600 }}>{t.auditLog}</span><span className="badge badge-muted">{auditLog.length} {lang === 'am' ? 'መዝገቦች' : 'entries'}</span></div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {auditLog.map(entry => (
              <div key={entry.id} className="card flex items-center gap-3" style={{ padding: '12px 18px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={14} /></div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{translateAction(entry.action)}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{translateAuditDetails(entry.details)}</div></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(entry.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="modal-overlay" onClick={() => setShowBroadcast(false)}><div className="modal scale-in" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><h3>📢 {t.broadcast}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowBroadcast(false)}><X size={18} /></button></div>
          <div className="modal-body">
            <div className="form-group"><label className="form-label">{lang === 'am' ? 'ርዕስ' : 'Title'}</label><input type="text" className="form-input" placeholder={lang === 'am' ? 'ለምሳሌ፡ የበዓል ሰሞን ልዩ ቅናሽ!' : 'e.g., Holiday Season Special!'} value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} id="broadcast-title" /></div>
            <div className="form-group"><label className="form-label">{lang === 'am' ? 'መልዕክት' : 'Message'}</label><textarea className="form-input" rows={4} placeholder={lang === 'am' ? 'መልዕክትዎን እዚህ ያስገቡ...' : 'Enter your message...'} value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} style={{ resize: 'vertical' }} id="broadcast-message" /></div>
            <div className="form-group"><label className="form-label">{lang === 'am' ? 'ዓይነት' : 'Type'}</label><select className="form-input form-select" value={broadcastType} onChange={e => setBroadcastType(e.target.value)}><option value="system">{lang === 'am' ? 'የስርዓት ማስታወቂያ' : 'System Announcement'}</option><option value="promotion">{lang === 'am' ? 'የማስተዋወቂያ አቅርቦት' : 'Promotional Offer'}</option><option value="holiday">{lang === 'am' ? 'የበዓል ማስታወሻ' : 'Holiday Reminder'}</option></select></div>
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowBroadcast(false)}>{t.cancel}</button><button className="btn btn-primary" onClick={handleBroadcast}><Send size={16} /> {lang === 'am' ? 'ለሁሉም ላክ' : 'Send to All'}</button></div>
        </div></div>
      )}

      {/* Add Holiday Modal */}
      {showAddHoliday && (
        <div className="modal-overlay" onClick={() => setShowAddHoliday(false)}><div className="modal scale-in" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><h3>📅 {lang === 'am' ? 'አዲስ በዓል ጨምር' : 'Add New Holiday'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowAddHoliday(false)}><X size={18} /></button></div>
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'የበዓል ስም (አማርኛ)' : 'Holiday Name (Amharic)'}</label><input type="text" className="form-input" placeholder="ፋሲካ" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'የበዓል ስም (እንግሊዝኛ)' : 'Holiday Name (English)'}</label><input type="text" className="form-input" placeholder="Fasika / Easter" value={newHolidayNameEn} onChange={e => setNewHolidayNameEn(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'ቀነ ገደብ' : 'Deadline'}</label><input type="date" className="form-input" value={newHolidayDeadline} onChange={e => setNewHolidayDeadline(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'ዝቅተኛ ተቀማጭ (ብር)' : 'Min. Deposit (ETB)'}</label><input type="number" className="form-input" placeholder="2000" value={newHolidayMinDeposit} onChange={e => setNewHolidayMinDeposit(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'አዶ (Emoji)' : 'Icon (Emoji)'}</label><input type="text" className="form-input" placeholder="🎉" value={newHolidayIcon} onChange={e => setNewHolidayIcon(e.target.value)} /></div>
            </div>
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowAddHoliday(false)}>{t.cancel}</button><button className="btn btn-primary" onClick={handleAddHoliday}><Plus size={16} /> {lang === 'am' ? 'ጨምር' : 'Add Holiday'}</button></div>
        </div></div>
      )}

      {/* Add Animal Modal */}
      {showAddAnimal && (
        <div className="modal-overlay" onClick={() => setShowAddAnimal(false)}><div className="modal scale-in" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><h3>📦 {lang === 'am' ? 'የእንስሳ ዝርዝር ጨምር' : 'Add Animal Listing'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowAddAnimal(false)}><X size={18} /></button></div>
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'ዓይነት' : 'Type'}</label><select className="form-input form-select" value={newAnimal.type} onChange={e => setNewAnimal({ ...newAnimal, type: e.target.value })}><option value="sheep">{lang === 'am' ? 'በግ' : 'Sheep'}</option><option value="goat">{lang === 'am' ? 'ፍየል' : 'Goat'}</option><option value="cattle">{lang === 'am' ? 'በሬ/ላም' : 'Cattle'}</option><option value="hen">{lang === 'am' ? 'ዶሮ' : 'Hen'}</option><option value="kircha">{lang === 'am' ? 'ኪርቻ (የጋራ)' : 'Kircha (Group)'}</option></select></div>
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'ዝርያ' : 'Breed'}</label><input type="text" className="form-input" placeholder={lang === 'am' ? 'ለምሳሌ፡ ሐረር' : 'e.g., Harar'} value={newAnimal.breed} onChange={e => setNewAnimal({ ...newAnimal, breed: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'ክብደት (ኪ.ግ)' : 'Weight (kg)'}</label><input type="number" className="form-input" placeholder="30" value={newAnimal.weight} onChange={e => setNewAnimal({ ...newAnimal, weight: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'ዋጋ (ብር)' : 'Price (ETB)'}</label><input type="number" className="form-input" placeholder="12000" value={newAnimal.price} onChange={e => setNewAnimal({ ...newAnimal, price: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'ዕድሜ' : 'Age'}</label><input type="text" className="form-input" placeholder={lang === 'am' ? 'ለምሳሌ፡ 2 ዓመት' : 'e.g., 2 years'} value={newAnimal.age} onChange={e => setNewAnimal({ ...newAnimal, age: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">{lang === 'am' ? 'አካባቢ (ዞን)' : 'Location (Zone)'}</label><select className="form-input form-select" value={newAnimal.locationArea} onChange={e => setNewAnimal({ ...newAnimal, locationArea: e.target.value })}>{Object.keys(zones).map(z => <option key={z} value={z}>{translateArea(z)}</option>)}</select></div>
            </div>
            <div className="form-group"><label className="form-label">{lang === 'am' ? 'መግለጫ' : 'Description'}</label><textarea className="form-input" rows={2} placeholder={lang === 'am' ? 'ጤናማ፣ ሳር የበላ...' : 'Healthy, grass-fed...'} value={newAnimal.description} onChange={e => setNewAnimal({ ...newAnimal, description: e.target.value })} style={{ resize: 'vertical' }} /></div>
            <div className="form-group"><label className="form-label">{lang === 'am' ? 'የጤና ማረጋገጫ' : 'Health Certificate'}</label><select className="form-input form-select" value={newAnimal.healthCertificate} onChange={e => setNewAnimal({ ...newAnimal, healthCertificate: e.target.value === 'true' })}><option value="true">{t.yes}</option><option value="false">{t.no}</option></select></div>
          </div>
          <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowAddAnimal(false)}>{t.cancel}</button><button className="btn btn-primary" onClick={handleAddAnimal}><Plus size={16} /> {t.addListing}</button></div>
        </div></div>
      )}
    </div>
  );
}
