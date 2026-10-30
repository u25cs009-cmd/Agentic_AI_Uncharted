import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AnchorMemoryEngine } from './engine/index.js';
import { createMemoryRouter } from './routes/memoryRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize ANCHOR Core AI Memory Engine
const engine = new AnchorMemoryEngine();

// Mount API routes
app.use('/api', createMemoryRouter(engine));

export { app, engine };

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`⚓ ANCHOR AI Memory Engine Server (Agent: XYRO101)`);
    console.log(`🚀 Server listening on http://localhost:${port}`);
    console.log(`🛡️ Governed Write Path: POST http://localhost:${port}/api/ingest`);
    console.log(`🔍 Hybrid Retrieval:    POST http://localhost:${port}/api/retrieve`);
    console.log(`💬 Three-Mode Chat:     POST http://localhost:${port}/api/chat`);
    console.log(`======================================================\n`);
  });
}

