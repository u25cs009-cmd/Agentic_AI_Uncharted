import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Look for .env in current, parent, and root directories
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), 'backend', '.env')
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  store: ((process.env.STORE || 'memory').toLowerCase().startsWith('mongo') ? 'mongo' : 'memory') as 'memory' | 'mongo',
  embedProvider: (process.env.EMBED_PROVIDER || 'local').toLowerCase() as 'openai' | 'local',

  jwtSecret: process.env.JWT_SECRET || 'anchor_dev_jwt_secret_change_in_production_key_2026',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  internalApiKey: process.env.INTERNAL_API_KEY || process.env.ENGRAM_SHARED_SECRET || '',
  webhookSecret: process.env.ENGRAM_SHARED_SECRET || process.env.WEBHOOK_SECRET || process.env.INTERNAL_API_KEY || '',

  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/anchor',
    dbName: process.env.MONGODB_DB_NAME || 'anchor',
  },

  ai: {
    geminiKey: process.env.GEMINI_API_KEY || '',
    groqKey: process.env.GROQ_API_KEY || '',
    openRouterKey: process.env.OPENROUTER_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
  },

  notifyWebhookUrl: process.env.NOTIFY_WEBHOOK_URL || '',

  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL || '',
    wf1WebhookUrl: process.env.N8N_WF1_WEBHOOK_URL || '',
    wf2WebhookUrl: process.env.N8N_WF2_WEBHOOK_URL || '',
    wf3WebhookUrl: process.env.N8N_WF3_WEBHOOK_URL || '',
    timeoutMs: parseInt(process.env.N8N_TIMEOUT_MS || '8000', 10),
  }
};
