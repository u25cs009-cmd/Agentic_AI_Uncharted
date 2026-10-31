import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Automatically locate .env in backend directory, current working directory, or parent root
const potentialEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '..', '.env')
];

for (const envPath of potentialEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  store: ((process.env.STORE || 'memory').toLowerCase().startsWith('mongo') ? 'mongo' : 'memory') as 'memory' | 'mongo',
  
  jwtSecret: process.env.JWT_SECRET || 'anchor_dev_jwt_secret_change_in_production_key_2026',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  internalApiKey: process.env.INTERNAL_API_KEY || 'shakti2_internal_key_for_n8n_webhooks',

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

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL || '',
  }
};
