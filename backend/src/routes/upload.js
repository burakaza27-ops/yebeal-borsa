/* ============================================
   Image Upload Route — Supabase Storage
   ============================================ */

import { Router } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ─── POST /api/upload/image — Upload a single image ───
router.post('/image', authenticate, async (req, res) => {
  try {
    // Lazy-load multer and supabase so a missing package never crashes the server
    let multer, createClient;
    try {
      multer = (await import('multer')).default;
      createClient = (await import('@supabase/supabase-js')).createClient;
    } catch (importErr) {
      console.error('Upload dependencies not available:', importErr.message);
      return res.status(501).json({ error: 'Image upload is not available on this deployment. Missing dependencies.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Image storage is not configured. Missing SUPABASE_URL or SUPABASE_ANON_KEY.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const BUCKET = 'animal-images';

    // Use multer to parse the multipart upload in-memory
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only JPEG, PNG, and WebP images are allowed.'), false);
        }
      }
    });

    // Wrap multer's single-file handler in a promise
    await new Promise((resolve, reject) => {
      upload.single('image')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    // Generate unique filename
    const ext = req.file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const filePath = `listings/${req.user.id}/${uniqueName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: `Upload failed: ${error.message}` });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    res.status(201).json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('Upload route error:', err);
    if (err.message?.includes('Only JPEG')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Image upload failed.' });
  }
});

export default router;
