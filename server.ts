import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High payload limits for large transfers up to 1.5GB
app.use(express.json({ limit: '1500mb' }));
app.use(express.urlencoded({ extended: true, limit: '1500mb' }));

interface TransferFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // Base64 dataUrl or binary path
}

interface TransferRecord {
  code: string;
  createdAt: number;
  expiresAt: number;
  text?: string;
  files: TransferFile[];
  downloadCount: number;
  senderName?: string;
}

// In-memory + temp storage
const transfersStore = new Map<string, TransferRecord>();

// Clean up expired transfers every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, record] of transfersStore.entries()) {
    if (now > record.expiresAt) {
      transfersStore.delete(code);
    }
  }
}, 10 * 60 * 1000);

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeTransfers: transfersStore.size, timestamp: Date.now() });
});

// Create a new transfer
app.post('/api/transfers', (req, res) => {
  try {
    const { code, text, files, expiresInHours = 24, senderName } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Transfer code is required' });
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const now = Date.now();
    const expiresAt = now + Number(expiresInHours) * 3600 * 1000;

    const record: TransferRecord = {
      code: normalizedCode,
      createdAt: now,
      expiresAt,
      text: typeof text === 'string' ? text : '',
      files: Array.isArray(files) ? files : [],
      downloadCount: 0,
      senderName: senderName || 'Anonymous',
    };

    transfersStore.set(normalizedCode, record);

    return res.status(201).json({
      success: true,
      code: normalizedCode,
      expiresAt,
      filesCount: record.files.length,
      hasText: !!record.text,
    });
  } catch (err: any) {
    console.error('Error creating transfer:', err);
    return res.status(500).json({ error: 'Failed to create transfer', details: err?.message });
  }
});

// Retrieve a transfer by code
app.get('/api/transfers/:code', (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  const record = transfersStore.get(code);

  if (!record) {
    return res.status(404).json({ error: 'Transfer not found or expired' });
  }

  if (Date.now() > record.expiresAt) {
    transfersStore.delete(code);
    return res.status(410).json({ error: 'Transfer has expired' });
  }

  return res.json({
    success: true,
    transfer: {
      code: record.code,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      text: record.text,
      downloadCount: record.downloadCount,
      senderName: record.senderName,
      files: record.files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        dataUrl: f.dataUrl,
      })),
    },
  });
});

// Increment download count or signal receive
app.post('/api/transfers/:code/ack', (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  const record = transfersStore.get(code);
  if (record) {
    record.downloadCount += 1;
    return res.json({ success: true, downloadCount: record.downloadCount });
  }
  return res.status(404).json({ error: 'Transfer not found' });
});

// Delete transfer
app.delete('/api/transfers/:code', (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();
  if (transfersStore.has(code)) {
    transfersStore.delete(code);
    return res.json({ success: true, message: 'Transfer deleted' });
  }
  return res.status(404).json({ error: 'Transfer not found' });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // In dev mode, mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built dist files
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RedDrop] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
