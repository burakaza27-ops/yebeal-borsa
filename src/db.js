/* ============================================
   YEBEAL BORSA — LocalStorage Database Engine
   Complete, robust, production-grade
   ============================================ */

const DB_KEY = 'yebeal_borsa_db';
const DB_VERSION = 2;

// ---- Seed Data ----

const SEED_HOLIDAYS = [
  {
    id: 'h1', name: 'Genna (ገና)', nameEn: 'Ethiopian Christmas',
    deadline: '2027-01-07', minimumDeposit: 3000,
    animalTypes: ['sheep', 'goat', 'hen', 'cattle'],
    isActive: true, color: 'genna', icon: '⛪',
    description: 'Ethiopian Christmas celebrated on January 7th'
  },
  {
    id: 'h2', name: 'Eid al-Adha (ዒድ አል አድሃ)', nameEn: 'Feast of Sacrifice',
    deadline: '2026-06-17', minimumDeposit: 5000,
    animalTypes: ['sheep', 'goat', 'cattle'],
    isActive: true, color: 'eid', icon: '🕌',
    description: 'Islamic feast of sacrifice'
  },
  {
    id: 'h3', name: 'Enkutatash (እንቁጣጣሽ)', nameEn: 'Ethiopian New Year',
    deadline: '2026-09-11', minimumDeposit: 2000,
    animalTypes: ['hen', 'sheep', 'goat'],
    isActive: true, color: 'enkutatash', icon: '🌸',
    description: 'Ethiopian New Year celebrated on September 11'
  },
  {
    id: 'h4', name: 'Fasika (ፋሲካ)', nameEn: 'Ethiopian Easter',
    deadline: '2027-04-20', minimumDeposit: 4000,
    animalTypes: ['sheep', 'goat', 'hen', 'cattle'],
    isActive: true, color: 'fasika', icon: '✝️',
    description: 'Ethiopian Orthodox Easter celebration'
  },
  {
    id: 'h5', name: 'Timkat (ጥምቀት)', nameEn: 'Epiphany',
    deadline: '2027-01-19', minimumDeposit: 2500,
    animalTypes: ['hen', 'sheep', 'goat'],
    isActive: true, color: 'enkutatash', icon: '🕯️',
    description: 'Ethiopian Orthodox Epiphany celebration'
  }
];

const SEED_ANIMALS = [
  {
    id: 'a1', type: 'sheep', breed: 'Menz', weight: 42, age: '2 years',
    price: 8500, location: { area: 'Bole', lat: 9.0054, lng: 38.7636 },
    sellerId: 'seller1', sellerName: 'Abebe Kebede', sellerRating: 4.8,
    description: 'Healthy Menz breed sheep, well-fed and ready for holiday. Vaccinated and certified.',
    healthCertificate: true, availableDate: '2026-06-01', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a2', type: 'goat', breed: 'Arsi-Bale', weight: 38, age: '1.5 years',
    price: 7200, location: { area: 'Merkato', lat: 9.0345, lng: 38.7468 },
    sellerId: 'seller2', sellerName: 'Fatuma Ali', sellerRating: 4.6,
    description: 'Premium Arsi-Bale goat. Excellent health condition. Perfect for Eid celebrations.',
    healthCertificate: true, availableDate: '2026-06-05', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a3', type: 'cattle', breed: 'Borena', weight: 280, age: '3 years',
    price: 45000, location: { area: 'Kera', lat: 9.0000, lng: 38.7333 },
    sellerId: 'seller3', sellerName: 'Tadesse Mulugeta', sellerRating: 4.9,
    description: 'Large Borena breed cattle. Ideal for Kircha (group purchase). Premium quality meat.',
    healthCertificate: true, availableDate: '2026-06-10', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a4', type: 'hen', breed: 'Local', weight: 3, age: '8 months',
    price: 1200, location: { area: 'CMC', lat: 9.0287, lng: 38.8157 },
    sellerId: 'seller1', sellerName: 'Abebe Kebede', sellerRating: 4.8,
    description: 'Organic free-range hen. Great for traditional Doro Wot.',
    healthCertificate: false, availableDate: '2026-05-28', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a5', type: 'sheep', breed: 'Horro', weight: 48, age: '2.5 years',
    price: 9800, location: { area: 'Lebu', lat: 8.9500, lng: 38.7000 },
    sellerId: 'seller4', sellerName: 'Dawit Haile', sellerRating: 4.7,
    description: 'Premium Horro sheep. Well-fed on natural pasture. Ideal weight for family celebration.',
    healthCertificate: true, availableDate: '2026-06-08', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a6', type: 'goat', breed: 'Somali', weight: 35, age: '1 year',
    price: 6500, location: { area: 'Bole', lat: 9.0100, lng: 38.7800 },
    sellerId: 'seller2', sellerName: 'Fatuma Ali', sellerRating: 4.6,
    description: 'Somali breed goat with excellent meat quality. Health checked.',
    healthCertificate: true, availableDate: '2026-06-12', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a7', type: 'cattle', breed: 'Horro', weight: 320, age: '4 years',
    price: 52000, location: { area: 'Merkato', lat: 9.0345, lng: 38.7468 },
    sellerId: 'seller3', sellerName: 'Tadesse Mulugeta', sellerRating: 4.9,
    description: 'Massive Horro cattle. Perfect for large gatherings or Kircha sharing.',
    healthCertificate: true, availableDate: '2026-06-15', isActive: true, isApproved: false, images: []
  },
  {
    id: 'a8', type: 'hen', breed: 'Fayoumi', weight: 2.5, age: '6 months',
    price: 950, location: { area: 'Ayat', lat: 9.0400, lng: 38.8500 },
    sellerId: 'seller5', sellerName: 'Sara Tesfaye', sellerRating: 4.5,
    description: 'Fayoumi laying hen. Great for eggs and traditional dishes.',
    healthCertificate: false, availableDate: '2026-05-30', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a9', type: 'kircha', breed: 'Borena (Shared)', weight: 350, age: '4 years',
    price: 55000, location: { area: 'Kera', lat: 9.0000, lng: 38.7333 },
    sellerId: 'seller3', sellerName: 'Tadesse Mulugeta', sellerRating: 4.9,
    description: 'Premium Borena cattle available for Kircha (group purchase). Split cost among up to 7 families. Includes butchering service.',
    healthCertificate: true, availableDate: '2026-06-14', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a10', type: 'sheep', breed: 'Afar', weight: 40, age: '2 years',
    price: 7800, location: { area: 'Piassa', lat: 9.0300, lng: 38.7480 },
    sellerId: 'seller4', sellerName: 'Dawit Haile', sellerRating: 4.7,
    description: 'Afar breed sheep, lean and tender. Excellent for Kitfo and Tibs.',
    healthCertificate: true, availableDate: '2026-06-03', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a11', type: 'hen', breed: 'Koekoek', weight: 3.5, age: '10 months',
    price: 1500, location: { area: 'Sarbet', lat: 8.9800, lng: 38.7600 },
    sellerId: 'seller5', sellerName: 'Sara Tesfaye', sellerRating: 4.5,
    description: 'Koekoek dual-purpose hen. Great for both eggs and meat. Healthy and active.',
    healthCertificate: true, availableDate: '2026-06-02', isActive: true, isApproved: true, images: []
  },
  {
    id: 'a12', type: 'goat', breed: 'Woyto-Guji', weight: 30, age: '1 year',
    price: 5800, location: { area: 'Megenagna', lat: 9.0200, lng: 38.7900 },
    sellerId: 'seller6', sellerName: 'Hana Girma', sellerRating: 4.4,
    description: 'Young Woyto-Guji goat. Tender meat, perfect for small family gatherings.',
    healthCertificate: false, availableDate: '2026-06-18', isActive: true, isApproved: true, images: []
  }
];

const SEED_USER = {
  id: 'user1',
  faydaId: 'FID-2024-893421',
  phone: '+251911234567',
  fullName: 'Yohannes Berhe',
  fullNameAmharic: 'ዮሃንስ በርሀ',
  email: 'yohannes@email.com',
  gender: 'Male',
  region: 'Addis Ababa',
  address: 'Bole Sub-City, Woreda 03',
  tier: 'silver',
  totalDeposits: 34500,
  totalSpent: 12000,
  createdAt: '2025-08-15',
  avatar: 'YB',
  notifPreferences: { deposits: true, holidays: true, delivery: true, system: true, promotions: true },
  language: 'en'
};

const SEED_WALLETS = [
  {
    id: 'w1', userId: 'user1', label: 'Primary Wallet',
    balance: 18000, isFamily: false, familyMemberName: null,
    spendingLimit: null, lockedBalance: 4000, platformCredits: 500,
    lockedUntil: '2026-09-11', holidayId: 'h3', createdAt: '2025-08-15'
  },
  {
    id: 'w2', userId: 'user1', label: 'Family - Meron',
    balance: 5400, isFamily: true, familyMemberName: 'Meron Yohannes',
    spendingLimit: 3000, lockedBalance: 0, platformCredits: 0,
    lockedUntil: null, holidayId: null, createdAt: '2025-10-01'
  }
];

const SEED_CUSTOMER_HOLIDAYS = [
  { id: 'ch1', userId: 'user1', holidayId: 'h2', targetAmount: 9000, currentAmount: 5400, animalPreference: 'sheep', status: 'active' },
  { id: 'ch2', userId: 'user1', holidayId: 'h3', targetAmount: 4000, currentAmount: 1200, animalPreference: 'hen', status: 'active' },
  { id: 'ch3', userId: 'user1', holidayId: 'h1', targetAmount: 12000, currentAmount: 3000, animalPreference: 'goat', status: 'active' }
];

const SEED_TRANSACTIONS = [
  { id: 't1', walletId: 'w1', amount: 2000, type: 'deposit', description: 'Monthly savings deposit', method: 'Telebirr', createdAt: '2026-05-20T10:30:00' },
  { id: 't2', walletId: 'w1', amount: 1500, type: 'deposit', description: 'Extra deposit for Eid', method: 'CBE Birr', createdAt: '2026-05-15T14:20:00' },
  { id: 't3', walletId: 'w1', amount: -8500, type: 'purchase', description: 'Purchased Menz sheep from marketplace', method: 'Wallet', createdAt: '2026-04-28T09:15:00' },
  { id: 't4', walletId: 'w2', amount: 1000, type: 'deposit', description: 'Family deposit - Meron', method: 'Transfer', createdAt: '2026-05-10T11:45:00' },
  { id: 't5', walletId: 'w1', amount: 3000, type: 'deposit', description: 'Savings for Genna', method: 'Telebirr', createdAt: '2026-05-01T08:30:00' },
  { id: 't6', walletId: 'w1', amount: -3500, type: 'purchase', description: 'Purchased 3 hens for Fasika', method: 'Wallet', createdAt: '2026-03-15T16:00:00' },
  { id: 't7', walletId: 'w1', amount: 5000, type: 'deposit', description: 'Bulk deposit', method: 'Bank Transfer', createdAt: '2026-02-20T12:00:00' },
  { id: 't8', walletId: 'w1', amount: 4000, type: 'deposit', description: 'Holiday savings', method: 'Telebirr', createdAt: '2026-01-15T09:00:00' },
  { id: 't9', walletId: 'w1', amount: 2500, type: 'deposit', description: 'Weekly savings', method: 'CBE Birr', createdAt: '2025-12-20T11:30:00' },
  { id: 't10', walletId: 'w2', amount: 2000, type: 'deposit', description: 'Family deposit - Meron birthday', method: 'Transfer', createdAt: '2025-12-01T14:00:00' },
];

const SEED_NOTIFICATIONS = [
  { id: 'n1', userId: 'user1', title: 'Deposit Confirmed', message: 'Your deposit of 2,000 ETB via Telebirr has been confirmed.', type: 'deposit', read: false, createdAt: '2026-05-20T10:31:00' },
  { id: 'n2', userId: 'user1', title: 'Eid al-Adha Reminder', message: 'Only 28 days left until Eid! You need 3,600 ETB more to reach your goal.', type: 'holiday', read: false, createdAt: '2026-05-19T09:00:00' },
  { id: 'n3', userId: 'user1', title: 'New Animals Listed', message: '5 new sheep have been listed in your area. Check the marketplace!', type: 'marketplace', read: true, createdAt: '2026-05-18T15:30:00' },
  { id: 'n4', userId: 'user1', title: 'Silver Tier Achieved! 🎉', message: 'Congratulations! Your total deposits have crossed 10,000 ETB. You are now a Silver member.', type: 'system', read: true, createdAt: '2026-04-01T10:00:00' },
  { id: 'n5', userId: 'user1', title: 'Holiday Season Discount!', message: 'Get 10% off delivery fees for all orders placed before Eid. Use code: EID2026', type: 'promotion', read: true, createdAt: '2026-05-10T08:00:00' },
  { id: 'n6', userId: 'user1', title: 'Delivery Complete', message: 'Your Menz sheep has been delivered successfully. Thank you for using Yebeal Borsa!', type: 'delivery', read: true, createdAt: '2026-04-29T11:35:00' },
];

const SEED_ORDERS = [
  {
    id: 'o1', userId: 'user1', animalId: 'a1', animalType: 'sheep', animalBreed: 'Menz',
    totalPrice: 10500, deliveryOption: 'delivery', deliveryZone: 'Megenagna',
    deliveryTimeWindow: 'Morning (8AM-12PM)', paymentMethod: 'wallet',
    deliveryStatus: 'delivered',
    deliverySteps: [
      { label: 'Order Placed', done: true, time: '2026-04-28 09:15' },
      { label: 'Vet Inspection', done: true, time: '2026-04-28 14:00' },
      { label: 'In Transit', done: true, time: '2026-04-29 08:00' },
      { label: 'Delivered', done: true, time: '2026-04-29 11:30' }
    ],
    createdAt: '2026-04-28T09:15:00'
  }
];

const SEED_WITHDRAWAL_REQUESTS = [
  {
    id: 'wr1', userId: 'user1', walletId: 'w1', amount: 5000,
    reason: 'Emergency medical expense',
    withdrawalMethod: 'TELEBIRR',
    accountNumber: '+251911234567',
    accountName: null,
    status: 'approved', // pending, approved, rejected
    adminNote: 'Approved - valid emergency',
    createdAt: '2026-03-10T09:00:00',
    processedAt: '2026-03-10T14:30:00'
  }
];

const SEED_ALL_CUSTOMERS = [
  { id: 'user1', faydaId: 'FID-2024-893421', phone: '+251911234567', fullName: 'Yohannes Berhe', fullNameAmharic: 'ዮሃንስ በርሀ', email: 'yohannes@email.com', tier: 'silver', totalDeposits: 34500, totalSpent: 12000, createdAt: '2025-08-15', avatar: 'YB', role: 'customer', isActive: true },
  { id: 'user2', faydaId: 'FID-2024-112233', phone: '+251922345678', fullName: 'Almaz Desta', fullNameAmharic: 'አልማዝ ደስታ', email: 'almaz@email.com', tier: 'bronze', totalDeposits: 8200, totalSpent: 3000, createdAt: '2025-09-20', avatar: 'AD', role: 'customer', isActive: true },
  { id: 'user3', faydaId: 'FID-2024-445566', phone: '+251933456789', fullName: 'Mohammed Ahmed', fullNameAmharic: 'ሞሐመድ አህመድ', email: 'mohammed@email.com', tier: 'gold', totalDeposits: 78000, totalSpent: 45000, createdAt: '2025-06-10', avatar: 'MA', role: 'customer', isActive: true },
  { id: 'user4', faydaId: 'FID-2024-778899', phone: '+251944567890', fullName: 'Tigist Hailu', fullNameAmharic: 'ትግስት ሀይሉ', email: 'tigist@email.com', tier: 'silver', totalDeposits: 22000, totalSpent: 9500, createdAt: '2025-11-05', avatar: 'TH', role: 'customer', isActive: true },
  { id: 'user5', faydaId: 'FID-2024-334455', phone: '+251955678901', fullName: 'Kebede Worku', fullNameAmharic: 'ከበደ ወርቁ', email: 'kebede@email.com', tier: 'bronze', totalDeposits: 4500, totalSpent: 1200, createdAt: '2026-01-15', avatar: 'KW', role: 'customer', isActive: true },
  { id: 'user6', faydaId: 'FID-2024-667788', phone: '+251966789012', fullName: 'Hana Girma', fullNameAmharic: 'ሐና ግርማ', email: 'hana@email.com', tier: 'bronze', totalDeposits: 6000, totalSpent: 2000, createdAt: '2026-02-28', avatar: 'HG', role: 'seller', isActive: true },
];

const SEED_AUDIT_LOG = [
  { id: 'al1', adminId: 'admin1', action: 'approve_animal', target: 'a1', details: 'Approved Menz sheep listing', createdAt: '2026-04-25T10:00:00' },
  { id: 'al2', adminId: 'admin1', action: 'broadcast_notification', target: 'all', details: 'Sent system-wide Eid reminder', createdAt: '2026-05-19T09:00:00' },
  { id: 'al3', adminId: 'admin1', action: 'approve_withdrawal', target: 'wr1', details: 'Approved withdrawal of 5,000 ETB for user1', createdAt: '2026-03-10T14:30:00' },
];

// ---- Delivery Zones ----
export const DELIVERY_ZONES = {
  'Bole': { lat: 9.0054, lng: 38.7636 },
  'Merkato': { lat: 9.0345, lng: 38.7468 },
  'Kera': { lat: 9.0000, lng: 38.7333 },
  'CMC': { lat: 9.0287, lng: 38.8157 },
  'Lebu': { lat: 8.9500, lng: 38.7000 },
  'Ayat': { lat: 9.0400, lng: 38.8500 },
  'Megenagna': { lat: 9.0200, lng: 38.7900 },
  'Piassa': { lat: 9.0300, lng: 38.7480 },
  'Sarbet': { lat: 8.9800, lng: 38.7600 },
  '4 Kilo': { lat: 9.0350, lng: 38.7630 },
  'Kaliti': { lat: 8.9400, lng: 38.7400 },
  'Summit': { lat: 9.0150, lng: 38.8050 },
};

export const DELIVERY_TIME_WINDOWS = [
  'Morning (8AM-12PM)',
  'Afternoon (12PM-4PM)',
  'Evening (4PM-7PM)',
  'Full Day (8AM-7PM)'
];

export const PAYMENT_METHODS_ORDER = [
  { key: 'wallet', label: 'Pay from Wallet', icon: '💳' },
];

export const ANIMAL_EMOJIS = {
  sheep: '🐑', goat: '🐐', cattle: '🐄', hen: '🐔', kircha: '🐂'
};

export const ANIMAL_TYPES = ['hen', 'sheep', 'goat', 'cattle', 'kircha'];

export const NOTIFICATION_TYPES = ['deposit', 'holiday', 'marketplace', 'delivery', 'system', 'promotion', 'order'];

// ---- Amharic translations ----
export const TRANSLATIONS = {
  en: {
    dashboard: 'Dashboard', holidayPlanner: 'Holiday Planner', walletHub: 'Wallet Hub',
    marketplace: 'Marketplace', settings: 'Settings', notifications: 'Notifications',
    signOut: 'Sign Out', welcomeBack: 'Welcome back',
    currentBalance: 'Current Balance', totalDeposits: 'Total Deposits',
    activeGoals: 'Active Holiday Goals', nextHoliday: 'Next Holiday In',
    quickDeposit: 'Quick Deposit', deposit: 'Deposit', recentTransactions: 'Recent Transactions',
    viewAll: 'View All', amount: 'Amount', paymentMethod: 'Payment Method', paymentMethods: 'Payment Methods',
    confirmDeposit: 'Confirm Deposit', cancel: 'Cancel', noActiveGoals: 'No Active Goals',
    setUpFirstGoal: 'Set up your first holiday savings goal', customerStatus: 'Customer Status',
    browse: 'Browse', myOrders: 'My Orders', searchPlaceholder: 'Search by type, breed, or location...',
    buyNow: 'Buy Now', details: 'Details', placeOrder: 'Place Order',
    homeDelivery: 'Home Delivery', selfPickup: 'Self Pickup',
    confirmPurchase: 'Confirm Purchase', priceBreakdown: 'Price Breakdown',
    savedMoney: 'Saved Money', totalSpent: 'Total Spent', wallets: 'Wallets', family: 'Family',
    fullHistory: 'Full History', addFamily: 'Add Family', transfer: 'Transfer',
    exportCSV: 'Export CSV', exportPDF: 'Export PDF', withdrawalRequest: 'Withdrawal Request',
    spendingLimit: 'Spending Limit', profile: 'Profile', language: 'Language',
    notifPreferences: 'Notification Preferences', resetData: 'Reset All Data',
    admin: 'Gas Admin', overview: 'Overview', customers: 'Customers',
    holidays: 'Holidays', animals: 'Animals', reports: 'Reports',
    withdrawals: 'Withdrawals', deliveryZones: 'Delivery Zones', auditLog: 'Audit Log',
    approve: 'Approve', reject: 'Reject', broadcast: 'Broadcast', generateReport: 'Generate Report',
    signInTitle: 'Sign in to Yebeal Borsa', signUpTitle: 'Sign up for an account',
    phoneNumber: 'Phone Number', password: 'Password', continueWithMobile: 'Continue with Mobile',
    faydaNationalId: 'Fayda National ID', signInWithFayda: 'Sign in with Fayda ID',
    dontHaveAccount: 'Don\'t have an account?', createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?', signIn: 'Sign In', forgotPassword: 'Forgot Password?',
    faydaAuthSim: 'Fayda Authentication', scanningFingerprint: 'Scanning Fingerprint...',
    verifyingIdentity: 'Verifying Identity...', authSuccess: 'Authentication Successful',
    sortBy: 'Sort By', priceLowHigh: 'Price: Low to High', priceHighLow: 'Price: High to Low',
    weightLowHigh: 'Weight: Low to High', weightHighLow: 'Weight: High to Low',
    highestRating: 'Highest Rating', newest: 'Newest Listings', filters: 'Filters',
    priceRange: 'Price Range', animalType: 'Animal Type', favorites: 'Favorites',
    noFavorites: 'No favorites yet', saveSomeAnimals: 'Save some animals to your wishlist!',
    splitCost: 'Split Cost', familiesSharing: 'Families sharing', perFamily: 'per family',
    deliveryLocation: 'Delivery Location', subtotal: 'Subtotal', deliveryFee: 'Delivery Fee',
    total: 'Total', orderSuccess: 'Order Successful!', checkout: 'Checkout',
    healthCertified: 'Health Certified', notCertified: 'Not Certified',
    targetAmount: 'Target Amount', currentAmount: 'Current Amount', remaining: 'Remaining',
    goalReached: 'Goal Reached!', congratsGoal: 'Congratulations! You reached your savings goal for',
    timeToBuy: 'Time to head to the marketplace.', goToMarket: 'Go to Marketplace',
    daysLeft: 'days left', cancelGoal: 'Cancel Goal', securitySettings: 'Security Settings',
    changePassword: 'Change Password', updatePassword: 'Update your account password',
    biometricAuth: 'Biometric Authentication', enableFingerprint: 'Enable fingerprint / face unlock',
    mobileOnly: 'Mobile Only', twoFactorAuth: 'Two-Factor Authentication',
    addExtraLayer: 'Add an extra layer of security via SMS OTP', activeSessions: 'Active Sessions',
    currentlySignedIn: 'Currently signed in on this device', dangerZone: 'Danger Zone',
    resetAppDesc: 'Reset the application to its default state. This will clear all your data.',
    confirmReset: 'Confirm Reset', addListing: 'Add Listing',
    fullName: 'Full Name',
    enterFullName: 'Enter your full name',
    sendOtp: 'Send OTP Verification',
    enterOtp: 'Enter OTP Code',
    digitCode: '6-digit code',
    otpSentMsg: '✓ OTP sent to your phone number',
    createPassword: 'Create Password',
    minCharacters: 'Minimum 8 characters',
    or: 'or',
    orContinueWith: 'or continue with',
    nationalId: 'National ID',
    dob: 'Date of Birth',
    faydaId: 'Fayda ID',
    enterFaydaId: 'Enter your Fayda ID Number',
    ethiopiaDigitalId: 'Federal Democratic Republic of Ethiopia · Digital Identity',
    docScanning: 'Document Scanning',
    idVerified: 'National ID card verified',
    photoMatched: '✓ Photo Matched',
    dataVerified: '✓ Data Verified',
    gender: 'Gender',
    region: 'Region',
    status: 'Status',
    active: 'Active',
    male: 'Male',
    addisAbaba: 'Addis Ababa',
    continueToApp: 'Continue to App',
    next: 'Next',
    passwordRecovery: 'Password Recovery',
    otpSentRecovery: 'An OTP code has been sent to your phone number.',
    newPassword: 'New Password',
    resetPassword: 'Reset Password',
    enterPassword: 'Enter your password',
    savingsOverview: "Here's your savings overview for today",
    tierMember: 'Member',
    away: 'away',
    quickDepositNote: 'Quick deposit',
    telebirr: 'Telebirr',
    cbeBirr: 'CBE Birr',
    bank: 'Bank',
    transaction: 'Transaction',
    date: 'Date',
    current: 'Current',
    enterAmount: 'Enter amount',
    noteOptional: 'Note (Optional)',
    monthlySavings: 'e.g., Monthly savings',
    afterDeposit: 'After Deposit',
    depositConfirmed: 'Deposit Confirmed!',
    depositedVia: 'deposited via',
    bankTransfer: 'Bank Transfer',
    cashAgent: 'Cash (Agent)',
    setGoal: 'Set Goal',
    months: 'Months',
    weeks: 'Weeks',
    days: 'Days',
    availableAnimals: 'Available Animals',
    savingsProgress: 'Savings Progress',
    goalReachedCelebration: '🎉 Goal Reached! Ready to purchase!',
    setSavingsGoal: 'Set Savings Goal',
    targetAmountEtb: 'Target Amount (ETB)',
    minimum: 'Minimum',
    animalPreference: 'Animal Preference',
    deposited: 'Deposited!',
    addedTo: 'added to',
    saved: 'saved',
    walletBalance: 'Wallet balance',
    cancelGoalQuestion: '⚠️ Cancel Goal?',
    cancelGoalDesc: 'Are you sure you want to cancel this savings goal? Your deposited money stays in your wallet, but progress tracking will stop.',
    removeGoal: 'Remove Goal',
    manageWalletsDesc: 'Manage your wallets, family members, transfers, and withdrawals',
    accountHolder: 'Account Holder',
    withdraw: 'Withdraw',
    addMember: 'Add Member',
    addFamilyMember: 'Add Family Member',
    noFamilyMembersYet: 'No Family Members Yet',
    addFamilyDesc: 'Add family members to create shared savings wallets',
    yourWallets: 'Your Wallets',
    mainAccount: 'Main account',
    primary: 'Primary',
    removeFamilyConfirm: 'Remove this family wallet? Any remaining balance will be lost.',
    transactionReport: 'Transaction Report',
    generated: 'Generated',
    account: 'Account',
    netSaved: 'Net Saved',
    transactions: 'Transactions',
    allWallets: 'All Wallets',
    records: 'records',
    newRequest: 'New Request',
    noWithdrawalRequests: 'No Withdrawal Requests',
    withdrawRequestDesc: 'Request a withdrawal from your wallet. It requires admin approval.',
    withdrawTo: 'Withdraw To',
    selectMethod: 'Select Payout Method',
    accountNumber: 'Account / Phone Number',
    accountHolderName: 'Account Holder Name',
    enterPhoneNumber: 'Enter mobile number (e.g., 09xxxxxxxx)',
    enterAccountNumber: 'Enter bank account number',
    enterAccountName: 'Enter account holder name',
    bankName: 'Bank Name',
    approvedStatus: 'Approved',
    rejectedStatus: 'Rejected',
    pendingStatus: 'Pending',
    adminNoteLabel: 'Note',
    memberName: 'Member Name',
    leaveEmptyForNoLimit: 'Leave empty for no limit',
    transferFunds: 'Transfer Funds',
    fromWallet: 'From Wallet',
    toWallet: 'To Wallet',
    selectWallet: 'Select wallet',
    withdrawRequireApproval: 'Withdrawals require admin approval. You will be notified once your request is processed.',
    reason: 'Reason',
    whyWithdrawing: 'Why are you requesting a withdrawal?',
    submitRequest: 'Submit Request',
    monthlyLimit: 'Monthly Limit (ETB)',
    saveLimit: 'Save Limit',
    enterLimitOrCreateEmpty: 'Enter limit or leave empty',
    manageProfileDesc: 'Manage your profile, preferences, and account settings',
    settingsSaved: 'Settings saved successfully!',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    edit: 'Edit',
    save: 'Save',
    chooseNotifsToReceive: 'Choose which notifications you want to receive.',
    depositConfirmations: 'Deposit Confirmations',
    notifDepositDesc: 'Get notified when deposits are confirmed',
    holidayReminders: 'Holiday Reminders',
    notifHolidayDesc: 'Countdown alerts and goal progress updates',
    deliveryUpdates: 'Delivery Updates',
    notifDeliveryDesc: 'Track your livestock delivery status',
    systemAnnouncements: 'System Announcements',
    notifSystemDesc: 'Important system updates and tier changes',
    promotionalOffers: 'Promotional Offers',
    notifPromotionsDesc: 'Special deals and seasonal discounts',
    selectLanguageDesc: 'Select your preferred language for the application interface.',
    security: 'Security',
    changePasswordDesc: 'Update your account password',
    biometricAuthDesc: 'Enable fingerprint / face unlock',
    twoFactorAuthDesc: 'Add an extra layer of security via SMS OTP',
    activeSessionsDesc: 'Currently signed in on this device',
    activeCount: '1 Active',
    resetAppDescLong: 'Reset the application to its default state. This will clear all your data including deposits, orders, and settings.',
    resetAllDataQuestion: '⚠️ Reset All Data?',
    resetAllDataDesc: 'This action cannot be undone. All your savings, transactions, orders, and settings will be permanently deleted and reset to demo defaults.',
    currentPassword: 'Current Password',
    enterCurrentPassword: 'Enter current password',
    confirmNewPassword: 'Confirm New Password',
    reenterNewPassword: 'Re-enter new password',
    passwordMustBe8Char: 'Password must be at least 8 characters',
    strongPassword: '✓ Strong password',
    passwordsDoNotMatch: 'Passwords do not match',
    passwordsMatch: '✓ Passwords match',
    updatePasswordLabel: 'Update Password',
    passwordChangedTitle: 'Password Changed!',
    passwordChangedDesc: 'Your password has been updated successfully.',
    enable2faTitle: '🛡️ Enable Two-Factor Authentication',
    enable2faDesc: 'We will send a one-time verification code to your registered phone number.',
    sendVerificationCode: 'Send Verification Code',
    otpSentTo: '✓ OTP sent to your phone number',
    enter6DigitCode: 'Enter 6-digit Code',
    verifyEnable2fa: 'Verify & Enable 2FA',
    anyPrice: 'Any Price',
    under5000: 'Under 5,000 ETB',
    between5000And15000: '5,000 – 15,000 ETB',
    above15000: 'Above 15,000 ETB',
    allLocations: 'All Locations',
    anyRating: 'Any Rating',
    stars45: '4.5+ Stars',
    stars47: '4.7+ Stars',
    availableBefore: 'Available Before',
    certifiedOnly: 'Certified Only',
    showing: 'Showing',
    animalsText: 'animals',
    sortedBy: 'Sorted by',
    noFavoritesYet: 'No Favorites Yet',
    noAnimalsFound: 'No Animals Found',
    tapHeartToSave: 'Tap the heart icon on any listing to save it here.',
    adjustFilters: 'Try adjusting your filters or search terms.',
    group: 'Group',
    groupPurchase: 'Group Purchase',
    kirchaDesc: 'Kircha is a traditional Ethiopian group purchase where multiple families share the cost of a large animal. Includes butchering and equal meat distribution.',
    yourShare: 'Your share',
    verifiedSeller: 'Verified Seller',
    totalPrice: 'Total Price',
    orderPlaced: 'Order Placed!',
    deliveringTo: 'Delivering to',
    readyForPickup: 'Ready for pickup at',
    splitBetweenFamilies: 'Split between how many families?',
    deliveryOption: 'Delivery Option',
    deliveryTimeWindow: 'Delivery Time Window',
    payCashOnDelivery: '💡 Pay cash when delivered.',
    animalPrice: 'Animal Price',
    transport: 'Transport',
    labor: 'Labor',
    insurance: 'Insurance',
    manageSystemSettingsDesc: 'Manage customers, holidays, marketplace, withdrawals, reports, and system settings',
    activeSavers: 'Active Savers',
    pendingAnimalApprovals: 'Pending Animal Approvals',
    pendingWithdrawals: 'Pending Withdrawals',
    clickToReview: 'Click to review',
    clickToProcess: 'Click to process',
    searchSavers: 'Search by name, phone, or Fayda ID...',
    phone: 'Phone',
    role: 'Role',
    spent: 'Spent',
    status: 'Status',
    actions: 'Actions',
    disabled: 'Disabled',
    animal: 'Animal',
    seller: 'Seller',
    ok: 'OK',
    adminNote: 'Admin note...',
    noReportGenerated: 'No Report Generated',
    clickGenReport: 'Click "Generate Report" to create a financial overview',
    tierDistribution: 'Tier Distribution',
    holidayStatus: 'Holiday Status',
    reportGenerated: 'Report generated',
    title: 'Title',
    message: 'Message',
    sendToAll: 'Send to All',
    systemAnnouncement: 'System Announcement',
    promotionalOffer: 'Promotional Offer',
    holidayReminder: 'Holiday Reminder',
    breed: 'Breed',
    weightKg: 'Weight (kg)',
    priceEtb: 'Price (ETB)',
    locationZone: 'Location (Zone)',
    yes: 'Yes',
    no: 'No',
    email: 'Email',
    address: 'Address',
    addressPlaceholder: 'e.g., Bole Sub-City, Woreda 03',
    notSet: 'Not set',
    administration: 'Administration',
    mainMenu: 'Main Menu',
    quickActions: 'Quick Actions',
    noNotifications: 'No Notifications',
    allCaughtUp: "You're all caught up!",
    faydaVerification: 'Fayda Verification',
    faydaScanning: 'Scanning Fingerprint...',
    faydaVerifying: 'Verifying Identity...',
    faydaSuccess: 'Authentication Successful',
    faydaEnterNumber: 'Enter your Fayda ID Number',
    faydaDob: 'Date of Birth',
    genderMale: 'Male',
    genderFemale: 'Female',
    faydaRegion: 'Addis Ababa',
    faydaStatusActive: '✓ Active',
    faydaTitle: 'Fayda National ID',
    faydaSignIn: 'Sign in with Fayda ID',
    dontHaveAccount: "Don't have an account?",
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign In',
    forgotPassword: 'Forgot Password?',
    recoveredPasswordTitle: 'Password Recovery',
    recoveredPasswordDesc: 'An OTP code has been sent to your phone number.',
    recoveryNewPassword: 'New Password',
    recoveryResetPassword: 'Reset Password',
    recovEnterCode: 'Enter OTP Code',
    otpCodePlaceholder: '6-digit code',
    orContinue: 'or continue with',
    livestockSavingsMarket: 'Livestock Savings & Marketplace'
  },
  am: {
    dashboard: 'ዳሽቦርድ', holidayPlanner: 'የበዓል ዕቅድ', walletHub: 'የኪስ ቦርሳ',
    marketplace: 'ገበያ', settings: 'ቅንብሮች', notifications: 'ማሳወቂያዎች',
    signOut: 'ውጣ', welcomeBack: 'እንኳን ደህና መጡ',
    currentBalance: 'ወቅታዊ ቀሪ ሂሳብ', totalDeposits: 'ጠቅላላ ተቀማጭ ገንዘብ',
    activeGoals: 'ንቁ የበዓል ግቦች', nextHoliday: 'ቀጣይ በዓል በ',
    quickDeposit: 'ፈጣን ተቀማጭ', deposit: 'ተቀማጭ', recentTransactions: 'የቅርብ ግብይቶች',
    viewAll: 'ሁሉንም ይመልከቱ', amount: 'መጠን', paymentMethod: 'የክፍያ ዘዴ', paymentMethods: 'የክፍያ ዘዴዎች',
    confirmDeposit: 'ተቀማጭ ያረጋግጡ', cancel: 'ሰርዝ', noActiveGoals: 'ምንም ንቁ ግቦች የሉም',
    setUpFirstGoal: 'የመጀመሪያዎን የበዓል ቁጠባ ግብ ያዘጋጁ', customerStatus: 'የደንበኛ ደረጃ',
    browse: 'አስስ', myOrders: 'ትዕዛዞቼ', searchPlaceholder: 'በዓይነት, ዝርያ, ወይም ቦታ ይፈልጉ...',
    buyNow: 'አሁን ይግዙ', details: 'ዝርዝር', placeOrder: 'ትዕዛዝ ያስገቡ',
    homeDelivery: 'የቤት ድረስ ማድረስ', selfPickup: 'ራስ ማንሳት',
    confirmPurchase: 'ግዢን ያረጋግጡ', priceBreakdown: 'የዋጋ ዝርዝር',
    savedMoney: 'የተቆጠበ ገንዘብ', totalSpent: 'ጠቅላላ ወጪ', wallets: 'ኪስ ቦርሳዎች', family: 'ቤተሰብ',
    fullHistory: 'ሙሉ ታሪክ', addFamily: 'ቤተሰብ ጨምር', transfer: 'ማስተላለፍ',
    exportCSV: 'CSV ላክ', exportPDF: 'PDF ላክ', withdrawalRequest: 'የማውጣት ጥያቄ',
    spendingLimit: 'የወጪ ገደብ', profile: 'መገለጫ', language: 'ቋንቋ',
    notifPreferences: 'የማሳወቂያ ምርጫዎች', resetData: 'ሁሉንም ዳታ ዳግም አስጀምር',
    admin: 'የአስተዳዳሪ', overview: 'አጠቃላይ እይታ', customers: 'ደንበኞች',
    holidays: 'በዓላት', animals: 'እንስሳት', reports: 'ሪፖርቶች',
    withdrawals: 'ወጪዎች', deliveryZones: 'የማድረሻ ዞኖች', auditLog: 'የኦዲት ምዝግብ ማስታወሻ',
    approve: 'አጽድቅ', reject: 'አትቀበል', broadcast: 'ያሰራጩ', generateReport: 'ሪፖርት ይፍጠሩ',
    signInTitle: 'ወደ ይበዓል ቦርሳ ይግቡ', signUpTitle: 'ለአካውንት ይመዝገቡ',
    phoneNumber: 'ስልክ ቁጥር', password: 'የይለፍ ቃል', continueWithMobile: 'በሞባይል ይቀጥሉ',
    faydaNationalId: 'ፋይዳ ብሔራዊ መታወቂያ', signInWithFayda: 'በፋይዳ መታወቂያ ይግቡ',
    dontHaveAccount: 'አካውንት የለዎትም?', createAccount: 'አካውንት ይፍጠሩ',
    alreadyHaveAccount: 'ቀድሞውኑ አካውንት አለዎት?', signIn: 'ይግቡ', forgotPassword: 'የይለፍ ቃል ረሱ?',
    faydaAuthSim: 'ፋይዳ ማረጋገጫ', scanningFingerprint: 'የጣት አሻራ በመቃኘት ላይ...',
    verifyingIdentity: 'ማንነትን በማረጋገጥ ላይ...', authSuccess: 'ማረጋገጫ ተሳክቷል',
    sortBy: 'ቅደም ተከተል', priceLowHigh: 'ዋጋ: ከዝቅተኛ ወደ ከፍተኛ', priceHighLow: 'ዋጋ: ከከፍተኛ ወደ ዝቅተኛ',
    weightLowHigh: 'ክብደት: ከዝቅተኛ ወደ ከፍተኛ', weightHighLow: 'ክብደት: ከከፍተኛ ወደ ዝቅተኛ',
    highestRating: 'ከፍተኛ ደረጃ የተሰጠው', newest: 'አዲስ የተጨመሩ', filters: 'ማጣሪያዎች',
    priceRange: 'የዋጋ ክልል', animalType: 'የእንስሳት ዓይነት', favorites: 'ተወዳጆች',
    noFavorites: 'ምንም ተወዳጆች የሉም', saveSomeAnimals: 'አንዳንድ እንስሳትን ወደ ምኞት ዝርዝርዎ ያስቀምጡ!',
    splitCost: 'ዋጋ ያካፍሉ', familiesSharing: 'የሚጋሩ ቤተሰቦች', perFamily: 'በአንድ ቤተሰብ',
    deliveryLocation: 'የማድረሻ ቦታ', subtotal: 'ንዑስ ድምር', deliveryFee: 'የማድረሻ ክፍያ',
    total: 'ድምር', orderSuccess: 'ትዕዛዝ ተሳክቷል!', checkout: 'ክፍያ',
    healthCertified: 'የጤና ማረጋገጫ ያለው', notCertified: 'ማረጋገጫ የሌለው',
    targetAmount: 'የታቀደው መጠን', currentAmount: 'ያለው መጠን', remaining: 'ቀሪ',
    goalReached: 'ግብ ተመትቷል!', congratsGoal: 'እንኳን ደስ አሎት! የቁጠባ ግብዎን አሳክተዋል ለ',
    timeToBuy: 'ወደ ገበያ ለመሄድ ጊዜው አሁን ነው።', goToMarket: 'ወደ ገበያ ይሂዱ',
    daysLeft: 'ቀናት ቀርተዋል', cancelGoal: 'ግብ ሰርዝ', securitySettings: 'የደህንነት ቅንብሮች',
    changePassword: 'የይለፍ ቃል ቀይር', updatePassword: 'የአካውንትዎን የይለፍ ቃል ያዘምኑ',
    biometricAuth: 'ባዮሜትሪክ ማረጋገጫ', enableFingerprint: 'የጣት አሻራ / የፊት መክፈቻን አንቃ',
    mobileOnly: 'ለሞባይል ብቻ', twoFactorAuth: 'የሁለት-ደረጃ ማረጋገጫ',
    addExtraLayer: 'በ SMS OTP ተጨማሪ የደህንነት ንብርብር ያክሉ', activeSessions: 'ንቁ ክፍለ ጊዜዎች',
    currentlySignedIn: 'በአሁኑ ጊዜ በዚህ መሣሪያ ላይ ገብተዋል', dangerZone: 'አደገኛ ዞን',
    resetAppDesc: 'መተግበሪያውን ወደ ነባሪ ሁኔታው ይመልሱት። ይህ ሁሉንም መረጃዎን ያጠፋል።',
    confirmReset: 'ዳግም ማስጀመርን ያረጋግጡ', addListing: 'ዝርዝር ጨምር',
    fullName: 'ሙሉ ስም',
    enterFullName: 'ሙሉ ስምዎን ያስገቡ',
    sendOtp: 'የ OTP ማረጋገጫ ላክ',
    enterOtp: 'የ OTP ኮድ ያስገቡ',
    digitCode: 'ባለ 6-አሃዝ ኮድ',
    otpSentMsg: '✓ OTP ወደ ስልክ ቁጥርዎ ተልኳል',
    createPassword: 'የይለፍ ቃል ፍጠር',
    minCharacters: 'ቢያንስ 8 ቁምፊዎች',
    or: 'ወይም',
    orContinueWith: 'ወይም በዚህ ይቀጥሉ',
    nationalId: 'ብሔራዊ መታወቂያ',
    dob: 'የትውልድ ቀን',
    faydaId: 'ፋይዳ መታወቂያ',
    enterFaydaId: 'የፋይዳ መታወቂያ ቁጥርዎን ያስገቡ',
    ethiopiaDigitalId: 'የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ · ዲጂታል መታወቂያ',
    docScanning: 'የሰነድ ቅኝት',
    idVerified: 'የብሔራዊ መታወቂያ ካርድ ተረጋግጧል',
    photoMatched: '✓ ፎቶ ተዛምዷል',
    dataVerified: '✓ ዳታ ተረጋግጧል',
    gender: 'ጾታ',
    region: 'ክልል',
    status: 'ሁኔታ',
    active: 'ንቁ',
    male: 'ወንድ',
    addisAbaba: 'አዲስ አበባ',
    continueToApp: 'ወደ መተግበሪያው ቀጥል',
    next: 'ቀጣይ',
    passwordRecovery: 'የይለፍ ቃል መልሶ ማግኛ',
    otpSentRecovery: 'የ OTP ኮድ ወደ ስልክ ቁጥርዎ ተልኳል።',
    newPassword: 'አዲስ የይለፍ ቃል',
    resetPassword: 'የይለፍ ቃል መልሰው ያዋቅሩ',
    enterPassword: 'የይለፍ ቃልዎን ያስገቡ',
    savingsOverview: 'የዛሬው የቁጠባ አጠቃላይ እይታዎ እዚህ አለ',
    tierMember: 'አባል',
    away: 'ይቀረዋል',
    quickDepositNote: 'ፈጣን ተቀማጭ',
    telebirr: 'ቴሌቢር',
    cbeBirr: 'ሲቢኢ ብር',
    bank: 'ባንክ',
    transaction: 'ግብይት',
    date: 'ቀን',
    current: 'የአሁኑ',
    enterAmount: 'መጠን ያስገቡ',
    noteOptional: 'ማስታወሻ (አማራጭ)',
    monthlySavings: 'ለምሳሌ፡ የወር ቁጠባ',
    afterDeposit: 'ከተቀማጭ በኋላ',
    depositConfirmed: 'ተቀማጭ ተረጋግጧል!',
    depositedVia: 'በዚህ በኩል ገቢ ተደርጓል',
    bankTransfer: 'ባንክ ማስተላለፍ',
    cashAgent: 'ጥሬ ገንዘብ (ወኪል)',
    setGoal: 'ግብ አዘጋጅ',
    months: 'ወራት',
    weeks: 'ሳምንታት',
    days: 'ቀናት',
    availableAnimals: 'የሚገኙ እንስሳት',
    savingsProgress: 'የቁጠባ ሂደት',
    goalReachedCelebration: '🎉 ግብ ተመትቷል! ለመግዛት ዝግጁ ነዎት!',
    setSavingsGoal: 'የቁጠባ ግብ ያዘጋጁ',
    targetAmountEtb: 'የታለመው መጠን (ብር)',
    minimum: 'ቢያንስ',
    animalPreference: 'የእንስሳ ምርጫ',
    deposited: 'ተቀማጭ ተደርጓል!',
    addedTo: 'ተጨምሯል ወደ',
    saved: 'የተቆጠበ',
    walletBalance: 'የኪስ ቦርሳ ቀሪ ሂሳብ',
    cancelGoalQuestion: '⚠️ ግብ ይሰረዝ?',
    cancelGoalDesc: 'እርግጠኛ ነዎት ይህንን የቁጠባ ግብ መሰረዝ ይፈልጋሉ? የቆጠቡት ገንዘብ በኪስ ቦርሳዎ ውስጥ ይቆያል፣ ነገር ግን ግስጋሴውን መከታተል ይቆማል።',
    removeGoal: 'ግብን አስወግድ',
    manageWalletsDesc: 'የኪስ ቦርሳዎን፣ የቤተሰብ አባላትን፣ ዝውውሮችን እና ወጪዎችን ያስተዳድሩ',
    accountHolder: 'የሂሳብ ባለቤት',
    withdraw: 'ገንዘብ ማውጣት',
    addMember: 'አባል ጨምር',
    addFamilyMember: 'የቤተሰብ አባል ጨምር',
    noFamilyMembersYet: 'ምንም የቤተሰብ አባላት አልተጨመሩም',
    addFamilyDesc: 'የጋራ ቁጠባ ለመጀመር የቤተሰብ አባላትን እዚህ ይጨምሩ',
    yourWallets: 'የእርስዎ የኪስ ቦርሳዎች',
    mainAccount: 'ዋና ሂሳብ',
    primary: 'ዋና',
    removeFamilyConfirm: 'ይህንን የቤተሰብ ኪስ ቦርሳ ማጥፋት ይፈልጋሉ? ማንኛውም የቀረው ገንዘብ ይጠፋል።',
    transactionReport: 'የግብይት ሪፖርት',
    generated: 'የተፈጠረበት',
    account: 'መለያ',
    netSaved: 'የተጣራ ቁጠባ',
    transactions: 'ግብይቶች',
    allWallets: 'ሁሉም የኪስ ቦርሳዎች',
    records: 'መዝገቦች',
    newRequest: 'አዲስ ጥያቄ',
    noWithdrawalRequests: 'ምንም የገንዘብ ማውጫ ጥያቄዎች የሉም',
    withdrawRequestDesc: 'ከኪስ ቦርሳዎ ገንዘብ ማውጣትን ይጠይቁ። የአስተዳዳሪ ማጽደቅ ያስፈልገዋል።',
    withdrawTo: 'ገንዘብ ማስተላለፊያ (ማውጫ)',
    selectMethod: 'የማውጫ ዘዴ ይምረጡ',
    accountNumber: 'የአካውንት ወይም የስልክ ቁጥር',
    accountHolderName: 'የአካውንቱ ባለቤት ስም',
    enterPhoneNumber: 'የሞባይል ስልክ ቁጥር ያስገቡ (ለምሳሌ 09xxxxxxxx)',
    enterAccountNumber: 'የባንክ አካውንት ቁጥር ያስገቡ',
    enterAccountName: 'የአካውንት ባለቤት ስም ያስገቡ',
    bankName: 'የባንክ ስም',
    approvedStatus: 'የጸደቀ',
    rejectedStatus: 'ውድቅ የተደረገ',
    pendingStatus: 'በመጠባበቅ ላይ',
    adminNoteLabel: 'ማስታወሻ',
    memberName: 'የአባል ስም',
    leaveEmptyForNoLimit: 'ያለገደብ ለመተው ባዶ ያድርጉት',
    transferFunds: 'ገንዘብ ማስተላለፍ',
    fromWallet: 'ከኪስ ቦርሳ',
    toWallet: 'ወደ ኪስ ቦርሳ',
    selectWallet: 'የኪስ ቦርሳ ይምረጡ',
    withdrawRequireApproval: 'ገንዘብ ማውጣት የአስተዳዳሪ ማጽደቅን ይፈልጋል። ጥያቄዎ ሲስተናገድ ማሳወቂያ ይደርስዎታል።',
    reason: 'ምክንያት',
    whyWithdrawing: 'ገንዘብ ማውጣት ለምን አስፈለገዎት?',
    submitRequest: 'ጥያቄ አቅርብ',
    monthlyLimit: 'የወር ገደብ (ብር)',
    saveLimit: 'ገደብ አስቀምጥ',
    enterLimitOrCreateEmpty: 'ገደብ ያስገቡ ወይም ባዶ ያድርጉት',
    manageProfileDesc: 'መገለጫዎን፣ ምርጫዎችዎን እና የመለያ ቅንበሮችዎን ያስተዳድሩ',
    settingsSaved: 'ቅንብሮች በተሳካ ሁኔታ ተቀምጠዋል!',
    memberSince: 'አባል የሆኑበት ቀን',
    editProfile: 'መገለጫ አርትዕ',
    edit: 'አርትዕ',
    save: 'አስቀምጥ',
    chooseNotifsToReceive: 'ሊደርሱዎት የሚፈልጓቸውን ማሳወቂያዎች ይምረጡ።',
    depositConfirmations: 'የተቀማጭ ገንዘብ ማረጋገጫዎች',
    notifDepositDesc: 'ተቀማጭ ገንዘብ ሲረጋገጥ ማሳወቂያ ይድረሰኝ',
    holidayReminders: 'የበዓል ማሳወቂያዎች',
    notifHolidayDesc: 'የቀናት ቆጠራ እና የግስጋሴ ማሳወቂያዎች',
    deliveryUpdates: 'የማድረሻ ማሳወቂያዎች',
    notifDeliveryDesc: 'የእንስሳትዎን የማድረሻ ሁኔታ ይከታተሉ',
    systemAnnouncements: 'የስርዓት ማስታወቂያዎች',
    notifSystemDesc: 'አስፈላጊ የስርዓት ዝመናዎች እና የደረጃ ለውጦች',
    promotionalOffers: 'የማስተዋወቂያ ቅናሾች',
    notifPromotionsDesc: 'ልዩ ቅናሾች እና የበዓል ማስተዋወቂያዎች',
    selectLanguageDesc: 'ለመተግበሪያው የሚመርጡትን ቋንቋ ይምረጡ።',
    security: 'ደህንነት',
    changePasswordDesc: 'የመለያዎን የይለፍ ቃል ያዘምኑ',
    biometricAuthDesc: 'የጣት አሻራ ወይም የፊት መክፈቻን ያንቁ',
    twoFactorAuthDesc: 'በኤስኤምኤስ OTP ተጨማሪ የደህንነት ደረጃ ያክሉ',
    activeSessionsDesc: 'በአሁኑ ጊዜ በዚህ መሣሪያ ላይ ገብተዋል',
    activeCount: '1 ንቁ',
    resetAppDescLong: 'መተግበሪያውን ወደ መጀመሪያ ሁኔታው ይመልሱት። ይህ የተቀማጭ ገንዘብ፣ ትዕዛዞች እና ቅንብሮችን ጨምሮ ሁሉንም ውሂብዎን ያጠፋል።',
    resetAllDataQuestion: '⚠️ reset all data?',
    resetAllDataDesc: 'ይህ ተግባር ሊመለስ አይችልም። ሁሉም ቁጠባዎችዎ፣ ግብይቶችዎ፣ ትዕዛዞችዎ እና ቅንብሮችዎ በቋሚነት ይጠፋሉ እና ወደ ማሳያ ነባሪዎች ይመለሳሉ።',
    currentPassword: 'የአሁኑ የይለፍ ቃል',
    enterCurrentPassword: 'የአሁኑን የይለፍ ቃል ያስገቡ',
    confirmNewPassword: 'አዲሱን የይለፍ ቃል ያረጋግጡ',
    reenterNewPassword: 'አዲሱን የይለፍ ቃል እንደገና ያስገቡ',
    passwordMustBe8Char: 'የይለፍ ቃል ቢያንስ 8 ቁምፊዎች መሆን አለበት',
    strongPassword: '✓ ጠንካራ የይለፍ ቃል',
    passwordsDoNotMatch: 'የይለፍ ቃላቱ አይዛመዱም',
    passwordsMatch: '✓ የይለፍ ቃላቱ ይዛመዳሉ',
    updatePasswordLabel: 'የይለፍ ቃል አዘምን',
    passwordChangedTitle: 'የይለፍ ቃል ተቀይሯል!',
    passwordChangedDesc: 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተዘምኗል።',
    enable2faTitle: '🛡️ የሁለት-ደረጃ ማረጋገጫን ያንቁ',
    enable2faDesc: 'በተመዘገበው ስልክ ቁጥርዎ ላይ የአንድ ጊዜ ማረጋገጫ ኮድ እንልካለን።',
    sendVerificationCode: 'የማረጋገጫ ኮድ ላክ',
    otpSentTo: '✓ OTP ወደ ስልክ ቁጥርዎ ተልኳል',
    enter6DigitCode: 'ባለ 6-አሃዝ ኮድ ያስገቡ',
    verifyEnable2fa: 'ያረጋግጡ እና 2FA ያንቁ',
    anyPrice: 'ማንኛውም ዋጋ',
    under5000: 'ከ 5,000 ብር በታች',
    between5000And15000: '5,000 – 15,000 ብር',
    above15000: 'ከ 15,000 ብር በላይ',
    allLocations: 'ሁሉም አካባቢዎች',
    anyRating: 'ማንኛውም ደረጃ',
    stars45: '4.5+ ኮከቦች',
    stars47: '4.7+ ኮከቦች',
    availableBefore: 'ከዚህ ቀን በፊት የሚገኝ',
    certifiedOnly: 'የተረጋገጠ ብቻ',
    showing: 'በማሳየት ላይ',
    animalsText: 'እንስሳት',
    sortedBy: 'በዚህ ተደርድሯል',
    noFavoritesYet: 'ምንም ተወዳጆች የሉም',
    noAnimalsFound: 'ምንም እንስሳት አልተገኙም',
    tapHeartToSave: 'እንስሳትን እዚህ ለማስቀመጥ በምስላቸው ላይ ያለውን የልብ ምልክት ይጫኑ።',
    adjustFilters: 'እባክዎን ማጣሪያዎችን ወይም መፈለጊያ ቃላትን ያስተካክሉ።',
    group: 'ቡድን',
    groupPurchase: 'የቡድን ግዢ (ኪርቻ)',
    kirchaDesc: 'ኪርቻ ባህላዊ የቡድን ግዢ ሲሆን ብዙ ቤተሰቦች ትልቅ እንስሳ በጋራ የሚገዙበት ነው። ይህም የታረደ ስጋን በእኩል መካፈልን ያካትታል።',
    yourShare: 'የእርስዎ ድርሻ',
    verifiedSeller: 'የተረጋገጠ ሻጭ',
    totalPrice: 'ጠቅላላ ዋጋ',
    orderPlaced: 'ትዕዛዝ ተቀምጧል!',
    deliveringTo: 'በማድረስ ላይ ወደ',
    readyForPickup: 'ለመውሰድ ዝግጁ በ',
    splitBetweenFamilies: 'ዋጋውን በስንት ቤተሰብ ይከፍላሉ?',
    deliveryOption: 'የማድረሻ አማራጭ',
    deliveryTimeWindow: 'የማድረሻ ሰዓት',
    payCashOnDelivery: '💡 ሲረከቡ በጥሬ ገንዘብ ይክፈሉ።',
    animalPrice: 'የእንስሳው ዋጋ',
    transport: 'ትራንስፖርት',
    labor: 'የጉልበት ሥራ',
    insurance: 'መድን',
    manageSystemSettingsDesc: 'ደንበኞችን፣ በዓላትን፣ ገበያን፣ ወጪዎችን፣ ሪፖርቶችን እና የስርዓት ቅንብሮችን ያስተዳድሩ',
    activeSavers: 'ንቁ ቆጣቢዎች',
    pendingAnimalApprovals: 'ማጽደቅ የሚጠብቁ እንስሳት',
    pendingWithdrawals: 'ወጪ የሚጠብቁ ጥያቄዎች',
    clickToReview: 'ለመገምገም ይጫኑ',
    clickToProcess: 'ለማስኬድ ይጫኑ',
    searchSavers: 'በስም፣ ስልክ ወይም ፋይዳ መታወቂያ ይፈልጉ...',
    phone: 'ስልክ',
    role: 'ሚና',
    spent: 'ወጪ የተደረገ',
    status: 'ሁኔታ',
    actions: 'ተግባራት',
    disabled: 'የተዘጋ',
    animal: 'እንስሳ',
    seller: 'ሻጭ',
    ok: 'ትክክል',
    adminNote: 'የአስተዳዳሪ ማስታወሻ...',
    noReportGenerated: 'ምንም ሪፖርት አልተፈጠረም',
    clickGenReport: 'የፋይናንስ አጠቃላይ እይታን ለመፍጠር "ሪፖርት ፍጠር" የሚለውን ይጫኑ',
    tierDistribution: 'የደረጃዎች ስርጭት',
    holidayStatus: 'የበዓላት ሁኔታ',
    reportGenerated: 'ሪፖርቱ የተፈጠረበት ቀን',
    title: 'ርዕስ',
    message: 'መልዕክት',
    sendToAll: 'ለሁሉም ላክ',
    systemAnnouncement: 'የስርዓት ማስታወቂያ',
    promotionalOffer: 'የማስተዋወቂያ አቅርቦት',
    holidayReminder: 'የበዓል ማስታወሻ',
    breed: 'ዝርያ',
    weightKg: 'ክብደት (ኪ.ግ)',
    priceEtb: 'ዋጋ (ብር)',
    locationZone: 'ቦታ (ዞን)',
    yes: 'አዎ',
    no: 'አይደለም',
    email: 'ኢሜይል',
    address: 'አድራሻ',
    addressPlaceholder: 'ለምሳሌ፡ ቦሌ ክፍለ ከተማ፣ ወረዳ 03',
    notSet: 'አልተዋቀረም',
    administration: 'አስተዳደር',
    mainMenu: 'ዋና ምናሌ',
    quickActions: 'ፈጣን ተግባራት',
    noNotifications: 'ምንም ማሳወቂያዎች የሉም',
    allCaughtUp: 'ሁሉንም አይተዋል!',
    faydaVerification: 'የፋይዳ ማረጋገጫ',
    faydaScanning: 'የጣት አሻራ በመቃኘት ላይ...',
    faydaVerifying: 'ማንነትን በማረጋገጥ ላይ...',
    faydaSuccess: 'ማረጋገጫ ተሳክቷል!',
    faydaEnterNumber: 'የፋይዳ መታወቂያ ቁጥርዎን ያስገቡ',
    faydaDob: 'የትውልድ ቀን',
    genderMale: 'ወንድ',
    genderFemale: 'ሴት',
    faydaRegion: 'አዲስ አበባ',
    faydaStatusActive: '✓ ንቁ',
    faydaTitle: 'ፋይዳ ብሔራዊ መታወቂያ',
    faydaSignIn: 'በፋይዳ መታወቂያ ይግቡ',
    dontHaveAccount: 'አካውንት የለዎትም?',
    createAccount: 'አካውንት ይፍጠሩ',
    alreadyHaveAccount: 'ቀድሞውኑ አካውንት አለዎት?',
    signIn: 'ይግቡ',
    forgotPassword: 'የይለፍ ቃል ረሱ?',
    recoveredPasswordTitle: 'የይለፍ ቃል መልሶ ማግኛ',
    recoveredPasswordDesc: 'የ OTP ኮድ ወደ ስልክ ቁጥርዎ ተልኳል።',
    recoveryNewPassword: 'አዲስ የይለፍ ቃል',
    recoveryResetPassword: 'የይለፍ ቃል መልሰው ያዋቅሩ',
    recovEnterCode: 'የ OTP ኮድ ያስገቡ',
    otpCodePlaceholder: 'ባለ 6-አሃዝ ኮድ',
    orContinue: 'ወይም በዚህ ይቀጥሉ',
    livestockSavingsMarket: 'የእንስሳት ቁጠባ እና ገበያ'
  }
};

// ---- DB Engine ----

// ---- DB Engine ----

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.origin.includes('localhost') ? 'http://localhost:3001/api' : '/api');

async function apiFetch(path, method = 'GET', body = null) {
  const token = localStorage.getItem('yebeal_borsa_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const config = {
    method,
    headers,
    credentials: 'include', // Ensure HttpOnly cookies are sent on every request
  };
  if (body) {
    config.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, config);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Network request failed');
    }
    return data;
  } catch (err) {
    console.error(`API Fetch Error [${method} ${path}]:`, err);
    throw err;
  }
}

export async function syncWithBackend() {
  const token = localStorage.getItem('yebeal_borsa_token');
  const isLoggedInHint = localStorage.getItem('yebeal_borsa_is_logged_in') === 'true';
  if (!token && !isLoggedInHint) return readDB();

  // Helper: safely extract a fulfilled value or return a fallback
  const settled = (result, fallback) =>
    result.status === 'fulfilled' ? result.value : fallback;

  try {
    // Step 1: Fetch user profile first (needed to determine role for conditional endpoints)
    const meRes = await apiFetch('/auth/me');
    const user = meRes.user;

    // Step 2: Fire ALL data requests in parallel
    const coreRequests = Promise.allSettled([
      apiFetch('/wallets'),        // 0
      apiFetch('/holidays'),       // 1
      apiFetch('/animals'),        // 2
      apiFetch('/transactions'),   // 3
      apiFetch('/notifications'),  // 4
      apiFetch('/orders'),         // 5
      apiFetch('/withdrawals'),    // 6
      apiFetch('/animals/favorites/list'), // 7
    ]);

    // Conditionally add role-specific requests in the SAME parallel batch
    const adminRequests = user.role === 'ADMIN'
      ? Promise.allSettled([
          apiFetch('/admin/customers'),          // 0
          apiFetch('/admin/audit-logs'),          // 1
          apiFetch('/admin/withdrawals/pending'), // 2
          apiFetch('/admin/animals/pending'),     // 3
        ])
      : Promise.resolve([]);

    const sellerRequests = (user.role === 'SELLER' || user.role === 'FATTENER' || user.role === 'TRADER')
      ? Promise.allSettled([
          apiFetch('/orders/seller'), // 0
        ])
      : Promise.resolve([]);

    // Wait for all three groups to finish simultaneously
    const [coreResults, adminResults, sellerResults] = await Promise.all([
      coreRequests,
      adminRequests,
      sellerRequests,
    ]);

    // Step 3: Extract results with safe fallbacks for any failed request
    const wallets       = settled(coreResults[0], []);
    const holidays      = settled(coreResults[1], []);
    const animals       = settled(coreResults[2], { animals: [] });
    const transactions  = settled(coreResults[3], { transactions: [] });
    const notifications = settled(coreResults[4], []);
    const orders        = settled(coreResults[5], []);
    const withdrawals   = settled(coreResults[6], []);
    const favorites     = settled(coreResults[7], []);

    const allCustomers      = adminResults.length > 0 ? settled(adminResults[0], []) : [];
    const auditLog          = adminResults.length > 0 ? settled(adminResults[1], []) : [];
    const pendingWithdrawals = adminResults.length > 0 ? settled(adminResults[2], []) : [];
    const pendingAnimals    = adminResults.length > 0 ? settled(adminResults[3], []) : [];

    const sellerOrders = sellerResults.length > 0 ? settled(sellerResults[0], []) : [];

    // Log any partial failures for debugging (non-blocking)
    [...coreResults, ...(adminResults || []), ...(sellerResults || [])].forEach((r, i) => {
      if (r && r.status === 'rejected') {
        console.warn(`[syncWithBackend] Request #${i} failed:`, r.reason?.message || r.reason);
      }
    });

    const updatedDB = updateDB({
      user: {
        id: user.id,
        faydaId: user.faydaId,
        phone: user.phone,
        fullName: user.fullName,
        fullNameAmharic: user.fullNameAmharic,
        email: user.email,
        gender: user.gender,
        region: user.region,
        address: user.address,
        role: user.role.toLowerCase(), // frontend expects lowercase
        tier: user.tier.toLowerCase(), // frontend expects lowercase
        totalDeposits: user.totalDeposits,
        totalSpent: user.totalSpent,
        avatar: user.avatar,
        language: user.language,
        notifPreferences: {
          deposits: user.notifDeposits,
          holidays: user.notifHolidays,
          delivery: user.notifDelivery,
          system: user.notifSystem,
          promotions: user.notifPromotions,
        }
      },
      wallets: wallets.map(w => ({
        id: w.id,
        userId: w.userId,
        label: w.label,
        balance: w.balance,
        isFamily: w.isFamily,
        familyMemberName: w.familyMemberName,
        spendingLimit: w.spendingLimit,
        lockedBalance: w.lockedBalance || 0,
        platformCredits: w.platformCredits || 0,
        lockedUntil: w.lockedUntil || null,
        holidayId: w.holidayId || null,
        createdAt: w.createdAt,
      })),
      holidays: holidays.map(h => ({
        id: h.id,
        name: h.name,
        nameEn: h.nameEn,
        deadline: h.deadline,
        minimumDeposit: h.minimumDeposit,
        animalTypes: h.animalTypes,
        isActive: h.isActive,
        color: h.color,
        icon: h.icon,
        description: h.description,
      })),
      customerHolidays: user.customerHolidays || [],
      animals: (animals?.animals || []).map(a => ({
        id: a.id,
        type: a.type.toLowerCase(), // frontend expects lowercase
        breed: a.breed,
        weight: a.weight,
        age: a.age,
        price: a.price,
        location: { area: a.locationArea, lat: a.locationLat, lng: a.locationLng },
        sellerId: a.sellerId,
        sellerName: a.sellerName,
        sellerRating: a.sellerRating,
        description: a.description,
        healthCertificate: a.healthCertificate,
        availableDate: a.availableDate,
        isActive: a.isActive,
        isApproved: a.isApproved,
        images: a.images,
        gender: a.gender || null,
        healthStatus: a.healthStatus || null,
        vaccinationStatus: a.vaccinationStatus || false,
        insuranceEligible: a.insuranceEligible || false,
        insurancePremium: a.insurancePremium || 0,
        reservedUntil: a.reservedUntil || null,
        reservedBy: a.reservedBy || null,
      })),
      transactions: (transactions?.transactions || []).map(t => ({
        id: t.id,
        walletId: t.walletId,
        amount: t.amount,
        type: t.type.toLowerCase(),
        description: t.description,
        method: t.method,
        createdAt: t.createdAt,
      })),
      notifications: notifications.map(n => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type.toLowerCase(),
        read: n.read,
        createdAt: n.createdAt,
      })),
      orders: orders.map(o => ({
        id: o.id,
        userId: o.userId,
        animalId: o.animalId,
        animalType: o.animalType.toLowerCase(),
        animalBreed: o.animalBreed,
        totalPrice: o.totalPrice,
        deliveryOption: o.deliveryOption,
        deliveryZone: o.deliveryZone,
        deliveryTimeWindow: o.deliveryTimeWindow,
        paymentMethod: o.paymentMethod,
        deliveryStatus: o.deliveryStatus.toLowerCase(),
        deliverySteps: o.deliverySteps || [],
        createdAt: o.createdAt,
        deliveryDate: o.deliveryDate || null,
        deliveryAddress: o.deliveryAddress || null,
        insuranceAdded: o.insuranceAdded || false,
        insurancePremium: o.insurancePremium || 0,
        deliveryFee: o.deliveryFee || 0,
        animalPrice: o.animalPrice || o.totalPrice,
        cancelledAt: o.cancelledAt || null,
        cancelReason: o.cancelReason || null,
        isPaidToSeller: o.isPaidToSeller || false,
      })),
      withdrawalRequests: withdrawals.map(wr => ({
        id: wr.id,
        userId: wr.userId,
        walletId: wr.walletId,
        amount: wr.amount,
        reason: wr.reason,
        status: wr.status.toLowerCase(),
        adminNote: wr.adminNote,
        createdAt: wr.createdAt,
        processedAt: wr.processedAt,
      })),
      allCustomers: allCustomers.map(c => ({
        id: c.id,
        faydaId: c.faydaId,
        phone: c.phone,
        fullName: c.fullName,
        fullNameAmharic: c.fullNameAmharic,
        email: c.email,
        role: c.role.toLowerCase(),
        tier: c.tier.toLowerCase(),
        totalDeposits: c.totalDeposits,
        totalSpent: c.totalSpent,
        createdAt: c.createdAt,
        avatar: c.avatar,
        isActive: c.isActive,
      })),
      auditLog: auditLog.map(l => ({
        id: l.id,
        adminId: l.adminId,
        action: l.action.toLowerCase(),
        target: l.target,
        details: l.details,
        createdAt: l.createdAt,
      })),
      sellerOrders: sellerOrders.map(o => ({
        id: o.id,
        userId: o.userId,
        customerName: o.user ? o.user.fullName : '',
        customerPhone: o.user ? o.user.phone : '',
        customerAddress: o.user ? o.user.address : '',
        animalId: o.animalId,
        animalType: o.animalType.toLowerCase(),
        animalBreed: o.animalBreed,
        totalPrice: o.totalPrice,
        deliveryOption: o.deliveryOption,
        deliveryZone: o.deliveryZone,
        deliveryTimeWindow: o.deliveryTimeWindow,
        paymentMethod: o.paymentMethod,
        deliveryStatus: o.deliveryStatus.toLowerCase(),
        deliverySteps: o.deliverySteps || [],
        createdAt: o.createdAt,
        isPaidToSeller: o.isPaidToSeller || false,
        deliveryFee: o.deliveryFee || 0,
        animalPrice: o.animalPrice || o.totalPrice,
      })),
      favorites: favorites.map(f => ({
        id: f.id,
        type: f.type.toLowerCase(),
        breed: f.breed,
        weight: f.weight,
        age: f.age,
        price: f.price,
        location: f.locationArea,
        sellerId: f.sellerId,
        sellerName: f.sellerName,
        sellerRating: f.sellerRating,
        description: f.description,
        healthCertificate: f.healthCertificate,
        availableDate: f.availableDate,
        isActive: f.isActive,
        isApproved: f.isApproved,
        images: f.images,
        gender: f.gender || null,
        healthStatus: f.healthStatus || null,
        vaccinationStatus: f.vaccinationStatus || false,
        insuranceEligible: f.insuranceEligible || false,
        insurancePremium: f.insurancePremium || 0,
      })),
      isLoggedIn: true,
    });
    return updatedDB;
  } catch (err) {
    console.error('Failed to sync with backend:', err);
    return readDB();
  }
}

function getDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === DB_VERSION) return parsed;
      // Version mismatch — re-seed
      return null;
    }
  } catch (e) {
    console.error('DB read error:', e);
  }
  return null;
}

function setDB(data) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('DB write error (quota?):', e);
  }
}

export function initDB(forceReset = false) {
  if (forceReset || !getDB()) {
    const seedData = {
      user: SEED_USER,
      wallets: SEED_WALLETS,
      holidays: SEED_HOLIDAYS,
      customerHolidays: SEED_CUSTOMER_HOLIDAYS,
      animals: SEED_ANIMALS,
      transactions: SEED_TRANSACTIONS,
      notifications: SEED_NOTIFICATIONS,
      orders: SEED_ORDERS,
      withdrawalRequests: SEED_WITHDRAWAL_REQUESTS,
      allCustomers: SEED_ALL_CUSTOMERS,
      auditLog: SEED_AUDIT_LOG,
      sellerOrders: [],
      isLoggedIn: false,
      version: DB_VERSION
    };
    setDB(seedData);
    return seedData;
  }
  return getDB();
}

export function readDB() {
  return getDB() || initDB();
}

export function updateDB(updater) {
  const db = readDB();
  const updated = typeof updater === 'function' ? updater(db) : { ...db, ...updater };
  setDB(updated);
  return updated;
}

// ---- Convenience helpers ----

export function getUser() { return readDB().user; }
export function getWallets() { return readDB().wallets; }
export function getPrimaryBalance() {
  const wallets = getWallets();
  const primary = wallets.find(w => !w.isFamily);
  return primary ? primary.balance : 0;
}

export function getHolidays() { return readDB().holidays.filter(h => h.isActive); }
export function getAllHolidaysRaw() { return readDB().holidays; }
export function getCustomerHolidays() { return readDB().customerHolidays; }
export function getAnimals(approvedOnly = true) {
  const db = readDB();
  if (approvedOnly) return db.animals.filter(a => a.isActive && a.isApproved);
  return db.animals.filter(a => a.isActive);
}
export function getAllAnimals() { return readDB().animals; }

export function getTransactions(walletId = null) {
  const txns = readDB().transactions;
  const filtered = walletId ? txns.filter(t => t.walletId === walletId) : txns;
  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getNotifications() {
  return readDB().notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getUnreadCount() {
  return readDB().notifications.filter(n => !n.read).length;
}

export function getOrders() {
  return readDB().orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getAllCustomers() { return readDB().allCustomers; }
export function getWithdrawalRequests() { return readDB().withdrawalRequests || []; }
export function getAuditLog() { return (readDB().auditLog || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
export function getSellerOrders() {
  return (readDB().sellerOrders || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
export function getSellerListings() {
  const currentUserId = getUser()?.id;
  return (readDB().animals || []).filter(a => a.sellerId === currentUserId);
}

export async function getKirchaPool(animalId) {
  try {
    return await apiFetch(`/orders/kircha/${animalId}`);
  } catch (err) {
    console.error(`Failed to fetch Kircha pool for ${animalId}:`, err);
    return { status: 'OPEN', bookedShares: 0, totalShares: 5, members: [] };
  }
}


// ---- Mutations ----

export async function updateUserProfile(updates) {
  await apiFetch('/users/profile', 'PUT', updates);
  await syncWithBackend();
  return readDB();
}

export async function changePassword(currentPassword, newPassword) {
  return await apiFetch('/users/password', 'PUT', { currentPassword, newPassword });
}

export async function updateNotifPreferences(prefs) {
  // Convert standard prefs structure to match Prisma model
  const body = {
    notifDeposits: prefs.deposits,
    notifHolidays: prefs.holidays,
    notifDelivery: prefs.delivery,
    notifSystem: prefs.system,
    notifPromotions: prefs.promotions,
  };
  await apiFetch('/users/notifications', 'PUT', body);
  await syncWithBackend();
  return readDB();
}

export async function setLanguage(lang) {
  await apiFetch('/users/language', 'PUT', { language: lang });
  await syncWithBackend();
  return readDB();
}

export async function makeDeposit(walletId, amount, description, method, holidayId = null) {
  await apiFetch('/transactions/deposit', 'POST', { walletId, amount, description, method, holidayId });
  await syncWithBackend();
  return readDB();
}

export async function transferBetweenWallets(fromWalletId, toWalletId, amount) {
  await apiFetch('/wallets/transfer', 'POST', { fromWalletId, toWalletId, amount });
  await syncWithBackend();
  return readDB();
}

export async function addFamilyWallet(name, spendingLimit = null) {
  await apiFetch('/wallets/family', 'POST', { name, spendingLimit });
  await syncWithBackend();
  return readDB();
}

export async function updateSpendingLimit(walletId, limit) {
  await apiFetch(`/wallets/${walletId}/limit`, 'PUT', { limit });
  await syncWithBackend();
  return readDB();
}

export async function removeFamilyWallet(walletId) {
  await apiFetch(`/wallets/${walletId}`, 'DELETE');
  await syncWithBackend();
  return readDB();
}

export async function addCustomerHoliday(holidayId, targetAmount, animalPreference) {
  await apiFetch('/holidays/goals', 'POST', { holidayId, targetAmount, animalPreference });
  await syncWithBackend();
  return readDB();
}

export async function depositToHoliday(customerHolidayId, amount, method = 'Telebirr') {
  await apiFetch(`/holidays/goals/${customerHolidayId}/deposit`, 'POST', { amount, method });
  await syncWithBackend();
  return readDB();
}

export async function cancelHolidayGoal(customerHolidayId) {
  await apiFetch(`/holidays/goals/${customerHolidayId}`, 'DELETE');
  await syncWithBackend();
  return readDB();
}

export async function toggleFavorite(animalId) {
  await apiFetch(`/animals/${animalId}/favorite`, 'POST');
  await syncWithBackend();
  return readDB();
}

export function getFavorites() {
  return readDB().favorites || [];
}

export async function placeOrder(animalId, deliveryOption, deliveryZone, deliveryTimeWindow, paymentMethod, kirchaShares = null, extra = {}) {
  await apiFetch('/orders', 'POST', {
    animalId,
    deliveryOption,
    deliveryZone,
    deliveryTimeWindow,
    paymentMethod,
    kirchaShares,
    deliveryAddress: extra.deliveryAddress || null,
    deliveryDate: extra.deliveryDate || null,
    insuranceAdded: extra.insuranceAdded || false,
  });
  await syncWithBackend();
  return readDB();
}

export async function requestWithdrawal(walletId, amount, reason, withdrawalMethod, accountNumber, accountName) {
  await apiFetch('/withdrawals', 'POST', { walletId, amount, reason, withdrawalMethod, accountNumber, accountName });
  await syncWithBackend();
  return readDB();
}

export async function processWithdrawal(wrId, approve, adminNote) {
  await apiFetch(`/withdrawals/${wrId}/process`, 'POST', { approve, adminNote });
  await syncWithBackend();
  return readDB();
}

export async function markNotificationsRead() {
  await apiFetch('/notifications/read', 'POST');
  await syncWithBackend();
  return readDB();
}

export async function broadcastNotification(title, message, type = 'system') {
  await apiFetch('/admin/broadcast', 'POST', { title, message, type });
  await syncWithBackend();
  return readDB();
}

export async function addAnimalListing(animal) {
  const body = {
    type: animal.type.toUpperCase(),
    breed: animal.breed,
    weight: parseFloat(animal.weight),
    age: animal.age,
    price: parseFloat(animal.price),
    locationArea: animal.locationArea || (animal.location && animal.location.area) || 'Bole',
    description: animal.description,
    healthCertificate: animal.healthCertificate || false,
    availableDate: animal.availableDate || new Date().toISOString(),
    images: animal.images || [],
    gender: animal.gender || 'Male',
    healthStatus: animal.healthStatus || 'Excellent',
    vaccinationStatus: animal.vaccinationStatus || false,
    insuranceEligible: animal.insuranceEligible || false,
    insurancePremium: animal.insurancePremium ? parseFloat(animal.insurancePremium) : 0,
  };
  await apiFetch('/animals', 'POST', body);
  await syncWithBackend();
  return readDB();
}

export async function editAnimalListing(id, animal) {
  const body = {
    type: animal.type.toUpperCase(),
    breed: animal.breed,
    weight: parseFloat(animal.weight),
    age: animal.age,
    price: parseFloat(animal.price),
    locationArea: animal.locationArea || (animal.location && animal.location.area) || 'Bole',
    description: animal.description,
    healthCertificate: animal.healthCertificate || false,
    availableDate: animal.availableDate || new Date().toISOString(),
    images: animal.images || [],
    gender: animal.gender || 'Male',
    healthStatus: animal.healthStatus || 'Excellent',
    vaccinationStatus: animal.vaccinationStatus || false,
    insuranceEligible: animal.insuranceEligible || false,
    insurancePremium: animal.insurancePremium ? parseFloat(animal.insurancePremium) : 0,
  };
  await apiFetch(`/animals/${id}`, 'PUT', body);
  await syncWithBackend();
  return readDB();
}

export async function deleteAnimalListing(id) {
  await apiFetch(`/animals/${id}`, 'DELETE');
  await syncWithBackend();
  return readDB();
}

export async function cancelOrder(orderId, reason = '') {
  await apiFetch(`/orders/${orderId}/cancel`, 'POST', { reason });
  await syncWithBackend();
  return readDB();
}

export async function rateOrder(orderId, rating) {
  const res = await apiFetch(`/orders/${orderId}/rate`, 'POST', { rating });
  await syncWithBackend();
  return res;
}

export async function reserveAnimal(animalId) {
  const res = await apiFetch(`/animals/${animalId}/reserve`, 'POST');
  await syncWithBackend();
  return res;
}

export async function createSupportTicket(title, message, category = 'SUPPORT') {
  const res = await apiFetch('/support/tickets', 'POST', { title, message, category });
  await syncWithBackend();
  return res;
}

export async function getClientSupportTickets() {
  return await apiFetch('/support/tickets');
}

export async function onboardPartner(phone, fullName, password, role) {
  const res = await apiFetch('/admin/partners', 'POST', { phone, fullName, password, role });
  await syncWithBackend();
  return res;
}

export async function getPendingPayouts() {
  return await apiFetch('/admin/payouts/pending');
}

export async function processPayout(sellerId) {
  const res = await apiFetch('/admin/payouts/process', 'POST', { sellerId });
  await syncWithBackend();
  return res;
}

export async function getPendingRefunds() {
  return await apiFetch('/admin/refunds/pending');
}

export async function processRefund(id, approve, adminNote) {
  const res = await apiFetch(`/admin/refunds/${id}/process`, 'POST', { approve, adminNote });
  await syncWithBackend();
  return res;
}

export async function getSupportTickets() {
  return await apiFetch('/admin/tickets');
}

export async function resolveSupportTicket(id) {
  const res = await apiFetch(`/admin/tickets/${id}/resolve`, 'POST');
  await syncWithBackend();
  return res;
}

export async function getMarketPrices() {
  return await apiFetch('/admin/market-prices');
}

export async function getPriceHistory() {
  return await apiFetch('/admin/market-prices/history');
}

export async function updateMarketPrice(animalType, breed, grade, price) {
  const res = await apiFetch('/admin/market-prices', 'POST', { animalType, breed, grade, price });
  await syncWithBackend();
  return res;
}

export async function deleteHoliday(id) {
  const res = await apiFetch(`/admin/holidays/${id}`, 'DELETE');
  await syncWithBackend();
  return res;
}

export async function approveAnimal(animalId) {
  await apiFetch(`/admin/animals/${animalId}/approve`, 'POST');
  await syncWithBackend();
  return readDB();
}

export async function rejectAnimal(animalId) {
  await apiFetch(`/admin/animals/${animalId}/reject`, 'POST');
  await syncWithBackend();
  return readDB();
}

export async function addHoliday(holiday) {
  await apiFetch('/admin/holidays', 'POST', holiday);
  await syncWithBackend();
  return readDB();
}

export async function toggleHoliday(holidayId) {
  // Fetch current holiday state from local cache, flip isActive via PUT
  const db = readDB();
  const holiday = db.holidays.find(h => h.id === holidayId);
  const newActive = holiday ? !holiday.isActive : false;
  await apiFetch(`/admin/holidays/${holidayId}`, 'PUT', { isActive: newActive });
  await syncWithBackend();
  return readDB();
}

export async function updateDeliveryZone(zoneName, lat, lng) {
  await apiFetch('/delivery/zones', 'POST', { name: zoneName, lat, lng });
  await syncWithBackend();
  return readDB();
}

export function getDeliveryZones() {
  const db = readDB();
  return db.deliveryZones || DELIVERY_ZONES;
}

export async function toggleCustomerActive(customerId) {
  await apiFetch(`/admin/customers/${customerId}/toggle-active`, 'POST');
  await syncWithBackend();
  return readDB();
}

export async function updateCustomerRole(customerId, role) {
  await apiFetch(`/admin/customers/${customerId}/role`, 'POST', { role });
  await syncWithBackend();
  return readDB();
}

export async function setLoggedIn(val, phone = '', password = '') {
  if (val === true) {
    if (phone && password) {
      try {
        const res = await apiFetch('/auth/login', 'POST', { phone, password });
        // Store JWT token in localStorage for cross-origin dev setup
        if (res.token) {
          localStorage.setItem('yebeal_borsa_token', res.token);
        }
        localStorage.setItem('yebeal_borsa_is_logged_in', 'true');

        // Immediate Local DB Update to prevent old profile bleed
        if (res.user) {
          updateDB({
            user: {
              id: res.user.id,
              faydaId: res.user.faydaId,
              phone: res.user.phone,
              fullName: res.user.fullName,
              fullNameAmharic: res.user.fullNameAmharic,
              email: res.user.email,
              gender: res.user.gender,
              region: res.user.region,
              address: res.user.address,
              role: res.user.role.toLowerCase(),
              tier: res.user.tier.toLowerCase(),
              totalDeposits: res.user.totalDeposits,
              totalSpent: res.user.totalSpent,
              avatar: res.user.avatar,
              language: res.user.language || 'en',
              notifPreferences: {
                deposits: res.user.notifDeposits,
                holidays: res.user.notifHolidays,
                delivery: res.user.notifDelivery,
                system: res.user.notifSystem,
                promotions: res.user.notifPromotions,
              }
            },
            isLoggedIn: true
          });
        }

        await syncWithBackend();
        return true;
      } catch (err) {
        console.error('Login request failed:', err);
        throw err;
      }
    } else {
      localStorage.setItem('yebeal_borsa_is_logged_in', 'true');
      updateDB({ isLoggedIn: true });
    }
  } else {
    try {
      // Clear token cookie on the backend
      await apiFetch('/auth/logout', 'POST');
    } catch (err) {
      console.error('Failed to log out from backend:', err);
    }
    localStorage.removeItem('yebeal_borsa_token');
    localStorage.removeItem('yebeal_borsa_is_logged_in');
    
    // Completely Reset Local DB on Logout to prevent data leaks or bleed-over
    updateDB({
      isLoggedIn: false,
      user: SEED_USER,
      wallets: SEED_WALLETS,
      holidays: SEED_HOLIDAYS,
      customerHolidays: SEED_CUSTOMER_HOLIDAYS,
      animals: SEED_ANIMALS,
      transactions: SEED_TRANSACTIONS,
      notifications: SEED_NOTIFICATIONS,
      orders: SEED_ORDERS,
      withdrawalRequests: SEED_WITHDRAWAL_REQUESTS,
      allCustomers: SEED_ALL_CUSTOMERS,
      auditLog: SEED_AUDIT_LOG,
      sellerOrders: []
    });
  }
}

export function isLoggedIn() {
  return localStorage.getItem('yebeal_borsa_is_logged_in') === 'true';
}

export async function registerUser(phone, fullName, password, extra = {}) {
  try {
    const res = await apiFetch('/auth/register', 'POST', {
      phone,
      fullName,
      password,
      faydaId: extra.faydaId || null,
      region: extra.region || 'Addis Ababa',
      city: extra.city || null,
      email: extra.email || null,
      gender: extra.gender || null,
      fullNameAmharic: extra.fullNameAmharic || null
    });
    // Store JWT token in localStorage for cross-origin dev setup
    if (res.token) {
      localStorage.setItem('yebeal_borsa_token', res.token);
    }
    localStorage.setItem('yebeal_borsa_is_logged_in', 'true');

    // Immediate Local DB Update
    if (res.user) {
      updateDB({
        user: {
          id: res.user.id,
          faydaId: res.user.faydaId,
          phone: res.user.phone,
          fullName: res.user.fullName,
          fullNameAmharic: res.user.fullNameAmharic,
          email: res.user.email,
          gender: res.user.gender,
          region: res.user.region,
          city: res.user.city,
          role: res.user.role.toLowerCase(),
          tier: res.user.tier.toLowerCase(),
          totalDeposits: res.user.totalDeposits,
          totalSpent: res.user.totalSpent,
          avatar: res.user.avatar,
          language: res.user.language || 'en',
          notifPreferences: {
            deposits: res.user.notifDeposits,
            holidays: res.user.notifHolidays,
            delivery: res.user.notifDelivery,
            system: res.user.notifSystem,
            promotions: res.user.notifPromotions,
          }
        },
        isLoggedIn: true
      });
    }

    if (extra.holidayId && extra.holidayTargetAmount) {
      try {
        await apiFetch('/holidays/goals', 'POST', {
          holidayId: extra.holidayId,
          targetAmount: parseFloat(extra.holidayTargetAmount),
          animalPreference: extra.holidayAnimalPreference || 'sheep'
        });
      } catch (goalErr) {
        console.error('Failed to create holiday goal during registration:', goalErr);
      }
    }

    await syncWithBackend();
    return true;
  } catch (err) {
    console.error('Registration failed:', err);
    throw err;
  }
}

// ---- Delivery Fee Calculator ----

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateDeliveryFee(fromArea, toArea, animalType) {
  const from = DELIVERY_ZONES[fromArea] || DELIVERY_ZONES['Bole'];
  const to = DELIVERY_ZONES[toArea] || DELIVERY_ZONES['Merkato'];
  const dist = haversine(from.lat, from.lng, to.lat, to.lng);
  const transportPerKm = { hen: 30, sheep: 80, goat: 80, cattle: 150, kircha: 150 };
  const laborFee = { hen: 100, sheep: 500, goat: 500, cattle: 1500, kircha: 1500 };
  const insuranceFee = { hen: 50, sheep: 300, goat: 300, cattle: 800, kircha: 800 };
  return Math.round(dist * (transportPerKm[animalType] || 80)) + (laborFee[animalType] || 500) + (insuranceFee[animalType] || 300);
}

export function getDeliveryBreakdown(fromArea, toArea, animalType, animalPrice) {
  const from = DELIVERY_ZONES[fromArea] || DELIVERY_ZONES['Bole'];
  const to = DELIVERY_ZONES[toArea] || DELIVERY_ZONES['Merkato'];
  const dist = haversine(from.lat, from.lng, to.lat, to.lng);
  const transportPerKm = { hen: 30, sheep: 80, goat: 80, cattle: 150, kircha: 150 };
  const laborFee = { hen: 100, sheep: 500, goat: 500, cattle: 1500, kircha: 1500 };
  const insuranceFee = { hen: 50, sheep: 300, goat: 300, cattle: 800, kircha: 800 };
  const transport = Math.round(dist * (transportPerKm[animalType] || 80));
  const labor = laborFee[animalType] || 500;
  const insurance = insuranceFee[animalType] || 300;
  const deliveryTotal = transport + labor + insurance;
  return { distance: Math.round(dist * 10) / 10, animalPrice, transport, labor, insurance, deliveryTotal, grandTotal: animalPrice + deliveryTotal };
}

// ---- Analytics Helpers ----

export function getAnalytics() {
  const db = readDB();
  const txns = db.transactions;
  const deposits = txns.filter(t => t.type === 'deposit');
  const purchases = txns.filter(t => t.type === 'purchase');
  const totalDeposited = deposits.reduce((s, t) => s + t.amount, 0);
  const totalPurchased = Math.abs(purchases.reduce((s, t) => s + t.amount, 0));
  const savedMoney = totalDeposited - totalPurchased;

  // Monthly breakdown
  const monthlyData = {};
  txns.forEach(t => {
    const month = new Date(t.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    if (!monthlyData[month]) monthlyData[month] = { deposits: 0, spent: 0 };
    if (t.amount > 0) monthlyData[month].deposits += t.amount;
    else monthlyData[month].spent += Math.abs(t.amount);
  });

  return { totalDeposited, totalPurchased, savedMoney, monthlyData, depositCount: deposits.length, purchaseCount: purchases.length };
}

export function generateFinancialReport() {
  const db = readDB();
  const analytics = getAnalytics();
  const customers = db.allCustomers;
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.isActive !== false).length,
      totalSystemDeposits: customers.reduce((s, c) => s + c.totalDeposits, 0),
      totalSystemSpent: customers.reduce((s, c) => s + c.totalSpent, 0),
      activeListings: db.animals.filter(a => a.isActive && a.isApproved).length,
      pendingApprovals: db.animals.filter(a => a.isActive && !a.isApproved).length,
      totalOrders: db.orders.length,
      pendingWithdrawals: (db.withdrawalRequests || []).filter(w => w.status === 'pending').length,
    },
    tierBreakdown: {
      gold: customers.filter(c => c.tier === 'gold').length,
      silver: customers.filter(c => c.tier === 'silver').length,
      bronze: customers.filter(c => c.tier === 'bronze').length,
    },
    holidays: db.holidays.map(h => ({
      name: h.name, deadline: h.deadline, isActive: h.isActive, minimumDeposit: h.minimumDeposit
    })),
    ...analytics
  };
  return report;
}

// ---- Formatters ----

export function formatETB(amount) {
  return new Intl.NumberFormat('en-ET').format(Math.abs(amount)) + ' ETB';
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getTierInfo(tier) {
  const tiers = {
    bronze: { label: 'Bronze', labelAm: 'ነሐስ', range: '0 – 10,000 ETB', className: 'bronze', icon: '🥉', next: 'Silver', nextAmount: 10000 },
    silver: { label: 'Silver', labelAm: 'ብር', range: '10,001 – 50,000 ETB', className: 'silver', icon: '🥈', next: 'Gold', nextAmount: 50000 },
    gold: { label: 'Gold', labelAm: 'ወርቅ', range: '50,001+ ETB', className: 'gold-tier', icon: '🥇', next: null, nextAmount: null }
  };
  return tiers[tier] || tiers.bronze;
}
