/* ============================================
   YEBEAL BORSA — Database Seed Script
   Populates PostgreSQL with initial data
   matching the frontend mock data exactly
   ============================================ */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Yebeal Borsa database...\n');

  // Clear existing data in correct order (respecting foreign keys)
  await prisma.deliveryStep.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.order.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.customerHoliday.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.marketPrice.deleteMany();
  await prisma.user.deleteMany();

  console.log('  ✓ Cleared existing data');

  // ─── 1. Users ──────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'user1',
        faydaId: 'FID-2024-893421',
        phone: '+251911234567',
        fullName: 'Yohannes Berhe',
        fullNameAmharic: 'ዮሃንስ በርሀ',
        email: 'yohannes@email.com',
        passwordHash,
        gender: 'Male',
        region: 'Addis Ababa',
        address: 'Bole Sub-City, Woreda 03',
        role: 'CUSTOMER',
        tier: 'SILVER',
        totalDeposits: 34500,
        totalSpent: 12000,
        avatar: 'YB',
        language: 'en',
        createdAt: new Date('2025-08-15'),
      }
    }),
    prisma.user.create({
      data: {
        id: 'user2',
        faydaId: 'FID-2024-112233',
        phone: '+251922345678',
        fullName: 'Almaz Desta',
        fullNameAmharic: 'አልማዝ ደስታ',
        email: 'almaz@email.com',
        passwordHash,
        role: 'CUSTOMER',
        tier: 'BRONZE',
        totalDeposits: 8200,
        totalSpent: 3000,
        avatar: 'AD',
        createdAt: new Date('2025-09-20'),
      }
    }),
    prisma.user.create({
      data: {
        id: 'user3',
        faydaId: 'FID-2024-445566',
        phone: '+251933456789',
        fullName: 'Mohammed Ahmed',
        fullNameAmharic: 'ሞሐመድ አህመድ',
        email: 'mohammed@email.com',
        passwordHash,
        role: 'CUSTOMER',
        tier: 'GOLD',
        totalDeposits: 78000,
        totalSpent: 45000,
        avatar: 'MA',
        createdAt: new Date('2025-06-10'),
      }
    }),
    prisma.user.create({
      data: {
        id: 'user4',
        faydaId: 'FID-2024-778899',
        phone: '+251944567890',
        fullName: 'Tigist Hailu',
        fullNameAmharic: 'ትግስት ሀይሉ',
        email: 'tigist@email.com',
        passwordHash,
        role: 'CUSTOMER',
        tier: 'SILVER',
        totalDeposits: 22000,
        totalSpent: 9500,
        avatar: 'TH',
        createdAt: new Date('2025-11-05'),
      }
    }),
    prisma.user.create({
      data: {
        id: 'user5',
        faydaId: 'FID-2024-334455',
        phone: '+251955678901',
        fullName: 'Kebede Worku',
        fullNameAmharic: 'ከበደ ወርቁ',
        email: 'kebede@email.com',
        passwordHash,
        role: 'CUSTOMER',
        tier: 'BRONZE',
        totalDeposits: 4500,
        totalSpent: 1200,
        avatar: 'KW',
        createdAt: new Date('2026-01-15'),
      }
    }),
    prisma.user.create({
      data: {
        id: 'user6',
        faydaId: 'FID-2024-667788',
        phone: '+251966789012',
        fullName: 'Hana Girma',
        fullNameAmharic: 'ሐና ግርማ',
        email: 'hana@email.com',
        passwordHash,
        role: 'SELLER',
        tier: 'BRONZE',
        totalDeposits: 6000,
        totalSpent: 2000,
        avatar: 'HG',
        createdAt: new Date('2026-02-28'),
      }
    }),
    // Admin user
    prisma.user.create({
      data: {
        id: 'admin1',
        phone: '+251900000000',
        fullName: 'Admin User',
        fullNameAmharic: 'አስተዳዳሪ',
        email: 'admin@yebealborsa.com',
        passwordHash: await bcrypt.hash('admin123', 12),
        role: 'ADMIN',
        tier: 'GOLD',
        avatar: 'AD',
      }
    }),
  ]);
  console.log(`  ✓ Created ${users.length} users`);

  // ─── 2. Wallets ────────────────────────────────────
  const wallets = await Promise.all([
    prisma.wallet.create({
      data: {
        id: 'w1', userId: 'user1', label: 'Primary Wallet',
        balance: 22500, isFamily: false,
        createdAt: new Date('2025-08-15'),
      }
    }),
    prisma.wallet.create({
      data: {
        id: 'w2', userId: 'user1', label: 'Family - Meron',
        balance: 5400, isFamily: true, familyMemberName: 'Meron Yohannes',
        spendingLimit: 3000, createdAt: new Date('2025-10-01'),
      }
    }),
    // Give other users wallets too
    prisma.wallet.create({ data: { id: 'w3', userId: 'user2', label: 'Primary Wallet', balance: 5200 } }),
    prisma.wallet.create({ data: { id: 'w4', userId: 'user3', label: 'Primary Wallet', balance: 33000 } }),
    prisma.wallet.create({ data: { id: 'w5', userId: 'user4', label: 'Primary Wallet', balance: 12500 } }),
    prisma.wallet.create({ data: { id: 'w6', userId: 'user5', label: 'Primary Wallet', balance: 3300 } }),
    prisma.wallet.create({ data: { id: 'w7', userId: 'user6', label: 'Primary Wallet', balance: 4000 } }),
  ]);
  console.log(`  ✓ Created ${wallets.length} wallets`);

  // ─── 3. Holidays ───────────────────────────────────
  const holidays = await Promise.all([
    prisma.holiday.create({
      data: {
        id: 'h1', name: 'Genna (ገና)', nameEn: 'Ethiopian Christmas',
        deadline: new Date('2027-01-07'), minimumDeposit: 3000,
        animalTypes: ['sheep', 'goat', 'hen', 'cattle'],
        isActive: true, color: 'genna', icon: '⛪',
        description: 'Ethiopian Christmas celebrated on January 7th',
      }
    }),
    prisma.holiday.create({
      data: {
        id: 'h2', name: 'Eid al-Adha (ዒድ አል አድሃ)', nameEn: 'Feast of Sacrifice',
        deadline: new Date('2026-06-17'), minimumDeposit: 5000,
        animalTypes: ['sheep', 'goat', 'cattle'],
        isActive: true, color: 'eid', icon: '🕌',
        description: 'Islamic feast of sacrifice',
      }
    }),
    prisma.holiday.create({
      data: {
        id: 'h3', name: 'Enkutatash (እንቁጣጣሽ)', nameEn: 'Ethiopian New Year',
        deadline: new Date('2026-09-11'), minimumDeposit: 2000,
        animalTypes: ['hen', 'sheep', 'goat'],
        isActive: true, color: 'enkutatash', icon: '🌸',
        description: 'Ethiopian New Year celebrated on September 11',
      }
    }),
    prisma.holiday.create({
      data: {
        id: 'h4', name: 'Fasika (ፋሲካ)', nameEn: 'Ethiopian Easter',
        deadline: new Date('2027-04-20'), minimumDeposit: 4000,
        animalTypes: ['sheep', 'goat', 'hen', 'cattle'],
        isActive: true, color: 'fasika', icon: '✝️',
        description: 'Ethiopian Orthodox Easter celebration',
      }
    }),
    prisma.holiday.create({
      data: {
        id: 'h5', name: 'Timkat (ጥምቀት)', nameEn: 'Epiphany',
        deadline: new Date('2027-01-19'), minimumDeposit: 2500,
        animalTypes: ['hen', 'sheep', 'goat'],
        isActive: true, color: 'enkutatash', icon: '🕯️',
        description: 'Ethiopian Orthodox Epiphany celebration',
      }
    }),
  ]);
  console.log(`  ✓ Created ${holidays.length} holidays`);

  // ─── 4. Customer Holiday Goals ─────────────────────
  const customerHolidays = await Promise.all([
    prisma.customerHoliday.create({
      data: { id: 'ch1', userId: 'user1', holidayId: 'h2', targetAmount: 9000, currentAmount: 5400, animalPreference: 'sheep', status: 'active' }
    }),
    prisma.customerHoliday.create({
      data: { id: 'ch2', userId: 'user1', holidayId: 'h3', targetAmount: 4000, currentAmount: 1200, animalPreference: 'hen', status: 'active' }
    }),
    prisma.customerHoliday.create({
      data: { id: 'ch3', userId: 'user1', holidayId: 'h1', targetAmount: 12000, currentAmount: 3000, animalPreference: 'goat', status: 'active' }
    }),
  ]);
  console.log(`  ✓ Created ${customerHolidays.length} customer holiday goals`);

  // ─── 5. Animals (Marketplace) ──────────────────────
  // We need seller users to exist. We'll use user6 as the main seller
  // and create references via user IDs directly for the seed sellers
  const animals = await Promise.all([
    prisma.animal.create({
      data: {
        id: 'a1', type: 'SHEEP', breed: 'Menz', weight: 42, age: '2 years',
        price: 8500, locationArea: 'Bole', locationLat: 9.0054, locationLng: 38.7636,
        sellerId: 'user6', sellerName: 'Abebe Kebede', sellerRating: 4.8,
        description: 'Healthy Menz breed sheep, well-fed and ready for holiday. Vaccinated and certified.',
        healthCertificate: true, availableDate: new Date('2026-06-01'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a2', type: 'GOAT', breed: 'Arsi-Bale', weight: 38, age: '1.5 years',
        price: 7200, locationArea: 'Merkato', locationLat: 9.0345, locationLng: 38.7468,
        sellerId: 'user6', sellerName: 'Fatuma Ali', sellerRating: 4.6,
        description: 'Premium Arsi-Bale goat. Excellent health condition. Perfect for Eid celebrations.',
        healthCertificate: true, availableDate: new Date('2026-06-05'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a3', type: 'CATTLE', breed: 'Borena', weight: 280, age: '3 years',
        price: 45000, locationArea: 'Kera', locationLat: 9.0000, locationLng: 38.7333,
        sellerId: 'user6', sellerName: 'Tadesse Mulugeta', sellerRating: 4.9,
        description: 'Large Borena breed cattle. Ideal for Kircha (group purchase). Premium quality meat.',
        healthCertificate: true, availableDate: new Date('2026-06-10'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a4', type: 'HEN', breed: 'Local', weight: 3, age: '8 months',
        price: 1200, locationArea: 'CMC', locationLat: 9.0287, locationLng: 38.8157,
        sellerId: 'user6', sellerName: 'Abebe Kebede', sellerRating: 4.8,
        description: 'Organic free-range hen. Great for traditional Doro Wot.',
        healthCertificate: false, availableDate: new Date('2026-05-28'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a5', type: 'SHEEP', breed: 'Horro', weight: 48, age: '2.5 years',
        price: 9800, locationArea: 'Lebu', locationLat: 8.9500, locationLng: 38.7000,
        sellerId: 'user6', sellerName: 'Dawit Haile', sellerRating: 4.7,
        description: 'Premium Horro sheep. Well-fed on natural pasture. Ideal weight for family celebration.',
        healthCertificate: true, availableDate: new Date('2026-06-08'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a6', type: 'GOAT', breed: 'Somali', weight: 35, age: '1 year',
        price: 6500, locationArea: 'Bole', locationLat: 9.0100, locationLng: 38.7800,
        sellerId: 'user6', sellerName: 'Fatuma Ali', sellerRating: 4.6,
        description: 'Somali breed goat with excellent meat quality. Health checked.',
        healthCertificate: true, availableDate: new Date('2026-06-12'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a7', type: 'CATTLE', breed: 'Horro', weight: 320, age: '4 years',
        price: 52000, locationArea: 'Merkato', locationLat: 9.0345, locationLng: 38.7468,
        sellerId: 'user6', sellerName: 'Tadesse Mulugeta', sellerRating: 4.9,
        description: 'Massive Horro cattle. Perfect for large gatherings or Kircha sharing.',
        healthCertificate: true, availableDate: new Date('2026-06-15'), isApproved: false,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a8', type: 'HEN', breed: 'Fayoumi', weight: 2.5, age: '6 months',
        price: 950, locationArea: 'Ayat', locationLat: 9.0400, locationLng: 38.8500,
        sellerId: 'user6', sellerName: 'Sara Tesfaye', sellerRating: 4.5,
        description: 'Fayoumi laying hen. Great for eggs and traditional dishes.',
        healthCertificate: false, availableDate: new Date('2026-05-30'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a9', type: 'KIRCHA', breed: 'Borena (Shared)', weight: 350, age: '4 years',
        price: 55000, locationArea: 'Kera', locationLat: 9.0000, locationLng: 38.7333,
        sellerId: 'user6', sellerName: 'Tadesse Mulugeta', sellerRating: 4.9,
        description: 'Premium Borena cattle available for Kircha (group purchase). Split cost among up to 7 families. Includes butchering service.',
        healthCertificate: true, availableDate: new Date('2026-06-14'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a10', type: 'SHEEP', breed: 'Afar', weight: 40, age: '2 years',
        price: 7800, locationArea: 'Piassa', locationLat: 9.0300, locationLng: 38.7480,
        sellerId: 'user6', sellerName: 'Dawit Haile', sellerRating: 4.7,
        description: 'Afar breed sheep, lean and tender. Excellent for Kitfo and Tibs.',
        healthCertificate: true, availableDate: new Date('2026-06-03'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a11', type: 'HEN', breed: 'Koekoek', weight: 3.5, age: '10 months',
        price: 1500, locationArea: 'Sarbet', locationLat: 8.9800, locationLng: 38.7600,
        sellerId: 'user6', sellerName: 'Sara Tesfaye', sellerRating: 4.5,
        description: 'Koekoek dual-purpose hen. Great for both eggs and meat. Healthy and active.',
        healthCertificate: true, availableDate: new Date('2026-06-02'), isApproved: true,
      }
    }),
    prisma.animal.create({
      data: {
        id: 'a12', type: 'GOAT', breed: 'Woyto-Guji', weight: 30, age: '1 year',
        price: 5800, locationArea: 'Megenagna', locationLat: 9.0200, locationLng: 38.7900,
        sellerId: 'user6', sellerName: 'Hana Girma', sellerRating: 4.4,
        description: 'Young Woyto-Guji goat. Tender meat, perfect for small family gatherings.',
        healthCertificate: false, availableDate: new Date('2026-06-18'), isApproved: true,
      }
    }),
  ]);
  console.log(`  ✓ Created ${animals.length} animal listings`);

  // ─── 6. Transactions ───────────────────────────────
  const transactions = await Promise.all([
    prisma.transaction.create({ data: { id: 't1', walletId: 'w1', amount: 2000, type: 'DEPOSIT', description: 'Monthly savings deposit', method: 'Telebirr', createdAt: new Date('2026-05-20T10:30:00') } }),
    prisma.transaction.create({ data: { id: 't2', walletId: 'w1', amount: 1500, type: 'DEPOSIT', description: 'Extra deposit for Eid', method: 'CBE Birr', createdAt: new Date('2026-05-15T14:20:00') } }),
    prisma.transaction.create({ data: { id: 't3', walletId: 'w1', amount: -8500, type: 'PURCHASE', description: 'Purchased Menz sheep from marketplace', method: 'Wallet', createdAt: new Date('2026-04-28T09:15:00') } }),
    prisma.transaction.create({ data: { id: 't4', walletId: 'w2', amount: 1000, type: 'DEPOSIT', description: 'Family deposit - Meron', method: 'Transfer', createdAt: new Date('2026-05-10T11:45:00') } }),
    prisma.transaction.create({ data: { id: 't5', walletId: 'w1', amount: 3000, type: 'DEPOSIT', description: 'Savings for Genna', method: 'Telebirr', createdAt: new Date('2026-05-01T08:30:00') } }),
    prisma.transaction.create({ data: { id: 't6', walletId: 'w1', amount: -3500, type: 'PURCHASE', description: 'Purchased 3 hens for Fasika', method: 'Wallet', createdAt: new Date('2026-03-15T16:00:00') } }),
    prisma.transaction.create({ data: { id: 't7', walletId: 'w1', amount: 5000, type: 'DEPOSIT', description: 'Bulk deposit', method: 'Bank Transfer', createdAt: new Date('2026-02-20T12:00:00') } }),
    prisma.transaction.create({ data: { id: 't8', walletId: 'w1', amount: 4000, type: 'DEPOSIT', description: 'Holiday savings', method: 'Telebirr', createdAt: new Date('2026-01-15T09:00:00') } }),
    prisma.transaction.create({ data: { id: 't9', walletId: 'w1', amount: 2500, type: 'DEPOSIT', description: 'Weekly savings', method: 'CBE Birr', createdAt: new Date('2025-12-20T11:30:00') } }),
    prisma.transaction.create({ data: { id: 't10', walletId: 'w2', amount: 2000, type: 'DEPOSIT', description: 'Family deposit - Meron birthday', method: 'Transfer', createdAt: new Date('2025-12-01T14:00:00') } }),
  ]);
  console.log(`  ✓ Created ${transactions.length} transactions`);

  // ─── 7. Notifications ──────────────────────────────
  const notifications = await Promise.all([
    prisma.notification.create({ data: { id: 'n1', userId: 'user1', title: 'Deposit Confirmed', message: 'Your deposit of 2,000 ETB via Telebirr has been confirmed.', type: 'DEPOSIT', read: false, createdAt: new Date('2026-05-20T10:31:00') } }),
    prisma.notification.create({ data: { id: 'n2', userId: 'user1', title: 'Eid al-Adha Reminder', message: 'Only 28 days left until Eid! You need 3,600 ETB more to reach your goal.', type: 'HOLIDAY', read: false, createdAt: new Date('2026-05-19T09:00:00') } }),
    prisma.notification.create({ data: { id: 'n3', userId: 'user1', title: 'New Animals Listed', message: '5 new sheep have been listed in your area. Check the marketplace!', type: 'MARKETPLACE', read: true, createdAt: new Date('2026-05-18T15:30:00') } }),
    prisma.notification.create({ data: { id: 'n4', userId: 'user1', title: 'Silver Tier Achieved! 🎉', message: 'Congratulations! Your total deposits have crossed 10,000 ETB. You are now a Silver member.', type: 'SYSTEM', read: true, createdAt: new Date('2026-04-01T10:00:00') } }),
    prisma.notification.create({ data: { id: 'n5', userId: 'user1', title: 'Holiday Season Discount!', message: 'Get 10% off delivery fees for all orders placed before Eid. Use code: EID2026', type: 'PROMOTION', read: true, createdAt: new Date('2026-05-10T08:00:00') } }),
    prisma.notification.create({ data: { id: 'n6', userId: 'user1', title: 'Delivery Complete', message: 'Your Menz sheep has been delivered successfully. Thank you for using Yebeal Borsa!', type: 'DELIVERY', read: true, createdAt: new Date('2026-04-29T11:35:00') } }),
  ]);
  console.log(`  ✓ Created ${notifications.length} notifications`);

  // ─── 8. Orders ─────────────────────────────────────
  const order = await prisma.order.create({
    data: {
      id: 'o1', userId: 'user1', animalId: 'a1', animalType: 'sheep', animalBreed: 'Menz',
      totalPrice: 10500, deliveryOption: 'delivery', deliveryZone: 'Megenagna',
      deliveryTimeWindow: 'Morning (8AM-12PM)', paymentMethod: 'wallet',
      deliveryStatus: 'DELIVERED', createdAt: new Date('2026-04-28T09:15:00'),
      deliverySteps: {
        create: [
          { label: 'Order Placed', done: true, time: '2026-04-28 09:15' },
          { label: 'Vet Inspection', done: true, time: '2026-04-28 14:00' },
          { label: 'In Transit', done: true, time: '2026-04-29 08:00' },
          { label: 'Delivered', done: true, time: '2026-04-29 11:30' },
        ]
      }
    }
  });
  console.log(`  ✓ Created 1 order with delivery steps`);

  // ─── 9. Withdrawal Requests ────────────────────────
  await prisma.withdrawalRequest.create({
    data: {
      id: 'wr1', userId: 'user1', walletId: 'w1', amount: 5000,
      reason: 'Emergency medical expense',
      withdrawalMethod: 'TELEBIRR',
      accountNumber: '+251911234567',
      status: 'APPROVED', adminNote: 'Approved - valid emergency',
      createdAt: new Date('2026-03-10T09:00:00'),
      processedAt: new Date('2026-03-10T14:30:00'),
    }
  });
  console.log(`  ✓ Created 1 withdrawal request`);

  // ─── 10. Audit Log ─────────────────────────────────
  await Promise.all([
    prisma.auditLog.create({ data: { id: 'al1', adminId: 'admin1', action: 'approve_animal', target: 'a1', details: 'Approved Menz sheep listing', createdAt: new Date('2026-04-25T10:00:00') } }),
    prisma.auditLog.create({ data: { id: 'al2', adminId: 'admin1', action: 'broadcast_notification', target: 'all', details: 'Sent system-wide Eid reminder', createdAt: new Date('2026-05-19T09:00:00') } }),
    prisma.auditLog.create({ data: { id: 'al3', adminId: 'admin1', action: 'approve_withdrawal', target: 'wr1', details: 'Approved withdrawal of 5,000 ETB for user1', createdAt: new Date('2026-03-10T14:30:00') } }),
  ]);
  console.log(`  ✓ Created 3 audit log entries`);

  // ─── 11. Delivery Zones ────────────────────────────
  const zones = [
    { name: 'Bole', lat: 9.0054, lng: 38.7636 },
    { name: 'Merkato', lat: 9.0345, lng: 38.7468 },
    { name: 'Kera', lat: 9.0000, lng: 38.7333 },
    { name: 'CMC', lat: 9.0287, lng: 38.8157 },
    { name: 'Lebu', lat: 8.9500, lng: 38.7000 },
    { name: 'Ayat', lat: 9.0400, lng: 38.8500 },
    { name: 'Megenagna', lat: 9.0200, lng: 38.7900 },
    { name: 'Piassa', lat: 9.0300, lng: 38.7480 },
    { name: 'Sarbet', lat: 8.9800, lng: 38.7600 },
    { name: '4 Kilo', lat: 9.0350, lng: 38.7630 },
    { name: 'Kaliti', lat: 8.9400, lng: 38.7400 },
    { name: 'Summit', lat: 9.0150, lng: 38.8050 },
  ];
  await prisma.deliveryZone.createMany({ data: zones });
  console.log(`  ✓ Created ${zones.length} delivery zones`);

  // ─── 12. Market Prices ──────────────────────────────
  const marketPrices = [
    { animalType: 'SHEEP', breed: 'Menz', grade: 'Grade A', price: 9000 },
    { animalType: 'GOAT', breed: 'Arsi-Bale', grade: 'Grade A', price: 7500 },
    { animalType: 'CATTLE', breed: 'Borena', grade: 'Grade A', price: 48000 },
    { animalType: 'HEN', breed: 'Local', grade: 'Standard', price: 1300 },
  ];
  await prisma.marketPrice.createMany({ data: marketPrices });
  console.log(`  ✓ Created ${marketPrices.length} market prices`);

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('   Customer: +251911234567 / password123');
  console.log('   Admin:    +251900000000 / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
