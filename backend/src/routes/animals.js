/* ============================================
   Animal/Marketplace Routes — Browse, Favorites, Add
   ============================================ */

import { Router } from 'express';
import { authenticate, optionalAuth, requireSellerOrAdmin } from '../middleware/auth.js';
import { parseAndValidateFloat, parseAndValidateInt } from '../utils/validation.js';

const router = Router();

// ─── GET /api/animals — Browse marketplace ───────
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      type, breed, location, minPrice, maxPrice,
      minWeight, maxWeight, minRating, certified,
      availableBefore, sortBy = 'newest',
      search, limit, offset,
      approvedOnly = 'true',
      seller,
    } = req.query;

    const where = { isActive: true };

    if (seller === 'me') {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required to view your listings.' });
      }
      where.sellerId = req.user.id;
      if (approvedOnly === 'true') {
        where.isApproved = true;
      }
    } else {
      if (approvedOnly === 'true') {
        where.isApproved = true;
      }
    }

    // Validate numerical pagination parameters
    const limitVal = parseAndValidateInt(limit, 'limit', false, 1) || 50;
    const offsetVal = parseAndValidateInt(offset, 'offset', false, 0) || 0;

    // Filters
    if (type) {
      const allowedTypes = ['SHEEP', 'GOAT', 'CATTLE', 'HEN', 'KIRCHA'];
      const typeUpper = type.toUpperCase();
      if (!allowedTypes.includes(typeUpper)) {
        return res.status(400).json({ error: `Invalid animal type "${type}". Must be one of: ${allowedTypes.join(', ')}` });
      }
      where.type = typeUpper;
    }
    if (breed) where.breed = { contains: breed, mode: 'insensitive' };
    if (location) where.locationArea = { contains: location, mode: 'insensitive' };
    
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseAndValidateFloat(minPrice, 'minPrice', false, 0);
      if (maxPrice) where.price.lte = parseAndValidateFloat(maxPrice, 'maxPrice', false, 0);
    }
    if (minWeight || maxWeight) {
      where.weight = {};
      if (minWeight) where.weight.gte = parseAndValidateFloat(minWeight, 'minWeight', false, 0);
      if (maxWeight) where.weight.lte = parseAndValidateFloat(maxWeight, 'maxWeight', false, 0);
    }
    if (minRating) {
      where.sellerRating = { gte: parseAndValidateFloat(minRating, 'minRating', false, 0) };
    }
    if (certified === 'true') where.healthCertificate = true;
    if (availableBefore) where.availableDate = { lte: new Date(availableBefore) };

    // Search across multiple fields
    if (search) {
      where.OR = [
        { breed: { contains: search, mode: 'insensitive' } },
        { locationArea: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sellerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Sort
    let orderBy = { createdAt: 'desc' };
    switch (sortBy) {
      case 'priceLow': orderBy = { price: 'asc' }; break;
      case 'priceHigh': orderBy = { price: 'desc' }; break;
      case 'weightLow': orderBy = { weight: 'asc' }; break;
      case 'weightHigh': orderBy = { weight: 'desc' }; break;
      case 'rating': orderBy = { sellerRating: 'desc' }; break;
      case 'newest': default: orderBy = { createdAt: 'desc' }; break;
    }

    const [animals, total] = await Promise.all([
      req.prisma.animal.findMany({
        where,
        orderBy,
        take: limitVal,
        skip: offsetVal,
      }),
      req.prisma.animal.count({ where }),
    ]);

    // If user is authenticated, include their favorites
    let favoriteIds = [];
    if (req.user) {
      const favorites = await req.prisma.favorite.findMany({
        where: { userId: req.user.id },
        select: { animalId: true },
      });
      favoriteIds = favorites.map(f => f.animalId);
    }

    res.json({
      animals: animals.map(a => ({
        ...a,
        isFavorite: favoriteIds.includes(a.id),
      })),
      total,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/animals/:id — Single animal ────────
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const animal = await req.prisma.animal.findUnique({
      where: { id: req.params.id },
    });

    if (!animal) return res.status(404).json({ error: 'Animal not found.' });

    let isFavorite = false;
    if (req.user) {
      const fav = await req.prisma.favorite.findFirst({
        where: { userId: req.user.id, animalId: req.params.id },
      });
      isFavorite = !!fav;
    }

    res.json({ ...animal, isFavorite });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/animals — Add listing ─────────────
router.post('/', authenticate, requireSellerOrAdmin, async (req, res, next) => {
  try {
    const {
      type, breed, weight, age, price, locationArea, locationLat, locationLng,
      description, healthCertificate, availableDate, gender, healthStatus,
      vaccinationStatus, insuranceEligible, insurancePremium, images
    } = req.body;

    if (!type || !breed || !weight || !price || !locationArea) {
      return res.status(400).json({ error: 'Type, breed, weight, price, and location are required.' });
    }

    const allowedTypes = ['SHEEP', 'GOAT', 'CATTLE', 'HEN', 'KIRCHA'];
    const typeUpper = type.toUpperCase();
    if (!allowedTypes.includes(typeUpper)) {
      return res.status(400).json({ error: `Invalid animal type "${type}". Must be one of: ${allowedTypes.join(', ')}` });
    }

    const validatedWeight = parseAndValidateFloat(weight, 'weight', true, 0.1);
    const validatedPrice = parseAndValidateFloat(price, 'price', true, 1);
    const validatedLat = locationLat !== undefined && locationLat !== null ? parseAndValidateFloat(locationLat, 'locationLat') : null;
    const validatedLng = locationLng !== undefined && locationLng !== null ? parseAndValidateFloat(locationLng, 'locationLng') : null;
    const validatedInsPremium = insurancePremium !== undefined && insurancePremium !== null ? parseAndValidateFloat(insurancePremium, 'insurancePremium', false, 0) : 0;

    const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });

    const animal = await req.prisma.animal.create({
      data: {
        type: typeUpper,
        breed,
        weight: validatedWeight,
        age: age || '',
        price: validatedPrice,
        locationArea,
        locationLat: validatedLat,
        locationLng: validatedLng,
        sellerId: req.user.id,
        sellerName: user.fullName,
        sellerRating: 0,
        description: description || '',
        healthCertificate: healthCertificate || false,
        availableDate: availableDate ? new Date(availableDate) : null,
        gender: gender || 'Male',
        healthStatus: healthStatus || 'Excellent',
        vaccinationStatus: vaccinationStatus || false,
        insuranceEligible: insuranceEligible || false,
        insurancePremium: validatedInsPremium,
        images: images || [],
        isActive: true,
        isApproved: false, // Requires admin approval
      },
    });

    res.status(201).json(animal);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/animals/:id/favorite — Toggle fav ─
router.post('/:id/favorite', authenticate, async (req, res, next) => {
  try {
    const existing = await req.prisma.favorite.findFirst({
      where: { userId: req.user.id, animalId: req.params.id },
    });

    if (existing) {
      await req.prisma.favorite.delete({ where: { id: existing.id } });
      res.json({ isFavorite: false });
    } else {
      await req.prisma.favorite.create({
        data: { userId: req.user.id, animalId: req.params.id },
      });
      res.json({ isFavorite: true });
    }
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/animals/favorites/list — User's favs
router.get('/favorites/list', authenticate, async (req, res, next) => {
  try {
    const favorites = await req.prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: { animal: true },
    });

    res.json(favorites.map(f => ({ ...f.animal, isFavorite: true })));
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/animals/:id/reserve ───────────────
router.post('/:id/reserve', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const now = new Date();

    const result = await req.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id } });
      if (!animal) throw new Error('Animal not found.');
      if (!animal.isActive || !animal.isApproved) throw new Error('Animal is not active or approved.');

      // Check if already reserved by another user
      if (animal.reservedUntil && animal.reservedUntil > now && animal.reservedBy !== req.user.id) {
        throw new Error('This animal is currently reserved by another customer.');
      }

      const reservedUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
      const updated = await tx.animal.update({
        where: { id },
        data: {
          reservedUntil,
          reservedBy: req.user.id,
        },
      });
      return updated;
    });

    res.json({ success: true, animal: result });
  } catch (err) {
    if (err.message.includes('found') || err.message.includes('reserved') || err.message.includes('active')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ─── PUT /api/animals/:id — Edit Listing ──────────
router.put('/:id', authenticate, requireSellerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      type, breed, weight, age, price, locationArea, locationLat, locationLng,
      description, healthCertificate, availableDate, gender, healthStatus,
      vaccinationStatus, insuranceEligible, insurancePremium, images
    } = req.body;

    const animal = await req.prisma.animal.findUnique({ where: { id } });
    if (!animal) {
      return res.status(404).json({ error: 'Animal listing not found.' });
    }

    if (animal.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You can only edit your own listings.' });
    }

    const now = new Date();
    if (animal.reservedUntil && animal.reservedUntil > now) {
      return res.status(400).json({ error: 'Cannot edit an animal listing while it is currently reserved by a customer.' });
    }

    const openPool = await req.prisma.kirchaPool.findFirst({
      where: { animalId: id, status: 'OPEN' }
    });
    if (openPool) {
      return res.status(400).json({ error: 'Cannot edit an animal listing while there is an active Kircha pool ongoing.' });
    }

    const updateData = {};
    if (type) {
      const typeUpper = type.toUpperCase();
      const allowedTypes = ['SHEEP', 'GOAT', 'CATTLE', 'HEN', 'KIRCHA'];
      if (!allowedTypes.includes(typeUpper)) {
        return res.status(400).json({ error: `Invalid animal type "${type}"` });
      }
      updateData.type = typeUpper;
    }
    if (breed !== undefined) updateData.breed = breed;
    if (weight !== undefined) updateData.weight = parseAndValidateFloat(weight, 'weight', true, 0.1);
    if (age !== undefined) updateData.age = age;
    if (price !== undefined) updateData.price = parseAndValidateFloat(price, 'price', true, 1);
    if (locationArea !== undefined) updateData.locationArea = locationArea;
    if (locationLat !== undefined) updateData.locationLat = locationLat !== null ? parseAndValidateFloat(locationLat, 'locationLat') : null;
    if (locationLng !== undefined) updateData.locationLng = locationLng !== null ? parseAndValidateFloat(locationLng, 'locationLng') : null;
    if (description !== undefined) updateData.description = description;
    if (healthCertificate !== undefined) updateData.healthCertificate = !!healthCertificate;
    if (availableDate !== undefined) updateData.availableDate = availableDate ? new Date(availableDate) : null;
    if (gender !== undefined) updateData.gender = gender;
    if (healthStatus !== undefined) updateData.healthStatus = healthStatus;
    if (vaccinationStatus !== undefined) updateData.vaccinationStatus = !!vaccinationStatus;
    if (insuranceEligible !== undefined) updateData.insuranceEligible = !!insuranceEligible;
    if (insurancePremium !== undefined) updateData.insurancePremium = parseAndValidateFloat(insurancePremium, 'insurancePremium', false, 0);
    if (images !== undefined) updateData.images = images;

    const updated = await req.prisma.animal.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/animals/:id — Deactivate Listing ─
router.delete('/:id', authenticate, requireSellerOrAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const animal = await req.prisma.animal.findUnique({ where: { id } });
    if (!animal) {
      return res.status(404).json({ error: 'Animal listing not found.' });
    }

    if (animal.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. You can only deactivate your own listings.' });
    }

    const now = new Date();
    if (animal.reservedUntil && animal.reservedUntil > now) {
      return res.status(400).json({ error: 'Cannot deactivate an animal listing while it is currently reserved by a customer.' });
    }

    const openPool = await req.prisma.kirchaPool.findFirst({
      where: { animalId: id, status: 'OPEN' }
    });
    if (openPool) {
      return res.status(400).json({ error: 'Cannot deactivate an animal listing while there is an active Kircha pool ongoing.' });
    }

    const updated = await req.prisma.animal.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Animal listing successfully deactivated.', animal: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
