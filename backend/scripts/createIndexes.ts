/**
 * Idempotent MongoDB Atlas Index Creation Script (Step 3a)
 * Uses official MongoDB Node.js driver to create:
 * 1. Vector Search index ("vector_index") on memories.embedding
 * 2. Atlas Search text index ("text_index") on memories (content, entities.name, tags, workspaceId)
 * 3. Regular and TTL indexes on memories, memory_events, outcomes, environments
 * 
 * Usage:
 *   npx tsx scripts/createIndexes.ts
 */

import dns from 'node:dns';
import { MongoClient } from 'mongodb';
import { config } from '../src/config/index.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {}

  console.log('\n======================================================');
  console.log('  ENGRAM MongoDB Atlas Index Creation Utility');
  console.log(`  Database: ${config.mongo.dbName}`);
  console.log(`  Embed Provider: ${config.embedProvider.toUpperCase()}`);
  console.log('======================================================\n');

  if (!config.mongo.uri || !config.mongo.uri.startsWith('mongodb')) {
    console.error('Error: MONGODB_URI is not set or invalid.');
    process.exit(1);
  }

  const client = new MongoClient(config.mongo.uri);
  await client.connect();
  console.log('Connected to MongoDB Atlas cluster successfully.\n');

  const db = client.db(config.mongo.dbName);
  const memoriesCol = db.collection('memories');
  const eventsCol = db.collection('memory_events');
  const outcomesCol = db.collection('outcomes');
  const envCol = db.collection('environments');
  const runsCol = db.collection('agent_runs');

  const numDimensions = config.embedProvider === 'openai' ? 1536 : 384;

  // 1. Regular B-Tree & TTL Indexes
  console.log('Creating standard B-tree & TTL indexes...');

  await memoriesCol.createIndex({ workspaceId: 1, status: 1, type: 1 });
  await memoriesCol.createIndex({ ownerId: 1, workspaceId: 1 });
  await memoriesCol.createIndex({ owner: 1, workspace: 1, status: 1 });
  await memoriesCol.createIndex({ attribute_key: 1 });
  // TTL hard delete index on purgeAt
  await memoriesCol.createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0 });
  await memoriesCol.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

  // Event indexes
  await eventsCol.createIndex({ memory_id: 1, timestamp: -1 });
  await eventsCol.createIndex({ workspaceId: 1, timestamp: -1 });
  await eventsCol.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });

  // Outcomes unique idempotency
  await outcomesCol.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
  await outcomesCol.createIndex({ memory_id: 1, timestamp: -1 });

  // Environment uniqueness
  await envCol.createIndex({ workspaceId: 1, service: 1 }, { unique: true, sparse: true });

  // Agent runs index
  await runsCol.createIndex({ workspaceId: 1, timestamp: -1 });

  console.log('Standard indexes verified and created.\n');

  // 2. Atlas Search Indexes (Vector & Text)
  console.log('Checking Atlas Search indexes...');

  let existingSearchIndexes: any[] = [];
  try {
    existingSearchIndexes = await memoriesCol.listSearchIndexes().toArray();
  } catch (err: any) {
    console.warn('Note: listSearchIndexes returned:', err.message);
  }

  const existingNames = new Set(existingSearchIndexes.map((idx) => idx.name));

  // A. Vector Search Index: "vector_index"
  if (!existingNames.has('vector_index')) {
    console.log(`Creating Vector Search index 'vector_index' (${numDimensions} dimensions, cosine)...`);
    try {
      await memoriesCol.createSearchIndex({
        name: 'vector_index',
        type: 'vectorSearch',
        definition: {
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions,
              similarity: 'cosine'
            },
            { type: 'filter', path: 'workspaceId' },
            { type: 'filter', path: 'ownerId' },
            { type: 'filter', path: 'visibility' },
            { type: 'filter', path: 'status' },
            { type: 'filter', path: 'type' }
          ]
        }
      });
      console.log("Vector Search index 'vector_index' requested successfully.");
    } catch (err: any) {
      console.error("Failed to create 'vector_index':", err.message);
    }
  } else {
    console.log("Vector Search index 'vector_index' already exists.");
  }

  // B. Atlas Search Text Index: "text_index"
  if (!existingNames.has('text_index')) {
    console.log("Creating Atlas Search text index 'text_index'...");
    try {
      await memoriesCol.createSearchIndex({
        name: 'text_index',
        type: 'search',
        definition: {
          mappings: {
            dynamic: false,
            fields: {
              content: { type: 'string' },
              entities: {
                type: 'document',
                fields: {
                  name: { type: 'string' }
                }
              },
              tags: { type: 'string' },
              workspaceId: { type: 'string' }
            }
          }
        }
      });
      console.log("Atlas Search index 'text_index' requested successfully.");
    } catch (err: any) {
      console.error("Failed to create 'text_index':", err.message);
    }
  } else {
    console.log("Atlas Search index 'text_index' already exists.");
  }

  console.log('\n======================================================');
  console.log('  Index provisioning script finished!');
  console.log('  Note: Atlas Search indexes may take 1-3 minutes to build.');
  console.log('======================================================\n');

  await client.close();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Failed to create indexes');
  console.error('Fatal error in createIndexes:', err);
  process.exit(1);
});
