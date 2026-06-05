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
      error: "Top-level Initialization Error",
      message: err.message,
      stack: err.stack,
      name: err.name,
      env: Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('VERCEL_'))
    });
  });
}

export default app;
