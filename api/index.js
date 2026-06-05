import express from 'express';

let app;
try {
  const serverMod = await import('../backend/src/server.js');
  app = serverMod.default;
} catch (err) {
  console.error("Top-level Initialization Error:", err);
  app = express();
  app.all('*', (req, res) => {
    res.status(500).json({
      error: "Server initialization failed",
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      hint: "Check Vercel function logs. Common causes: missing DATABASE_URL or JWT_SECRET env vars, or Prisma client not generated (run prisma generate).",
      envCheck: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
        NODE_ENV: process.env.NODE_ENV || 'not set',
        VERCEL: !!process.env.VERCEL,
      }
    });
  });
}

export default app;

export const config = {
  api: {
    bodyParser: false,
  },
};
