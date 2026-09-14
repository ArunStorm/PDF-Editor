import express from 'express';
const app = express(); app.use(express.json({ limit: '10mb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'pdf-editor-backend' }));
// TODO: Add optional local OCR/rendering endpoints. Keep server tasks opt-in and local.
app.listen(3001, () => console.log('Backend listening on http://127.0.0.1:3001'));
