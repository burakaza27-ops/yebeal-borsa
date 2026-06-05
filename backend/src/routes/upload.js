/* ============================================
   Image Upload Route — Supabase Storage
   ============================================ */

import { Router } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';

const router = Router();

let multerInstance, supabaseClient, multer;

async function initUploadDeps() {
  if (multerInstance && supabaseClient) return { multerInstance, supabaseClient };
  
  const multerMod = await import('multer');
  multer = multerMod.default || multerMod;
  const supabaseMod = await import('@supabase/supabase-js');
  const createClient = supabaseMod.createClient || supabaseMod.default?.createClient;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  // Use service role key for server-side uploads (bypasses RLS).
  // Falls back to anon key if service role key is not configured.
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Image storage is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY.');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);

  multerInstance = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jfif'];
      if (allowed.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.jfif')) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, WebP, and JFIF images are allowed.'), false);
      }
    }
  });

  return { multerInstance, supabaseClient };
}

// ─── POST /api/upload/image — Upload a single image ───
router.post('/image', authenticate, async (req, res) => {
  try {
    let deps;
    try {
      deps = await initUploadDeps();
    } catch (importErr) {
      console.error('Upload dependencies not available or not configured:', importErr.message);
      if (importErr.message.includes('not configured')) {
        return res.status(500).json({ error: importErr.message });
      }
      return res.status(501).json({ error: 'Image upload is not available on this deployment. Missing dependencies.' });
    }

    const { multerInstance: upload, supabaseClient: supabase } = deps;
    const BUCKET = 'animal-images';

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
