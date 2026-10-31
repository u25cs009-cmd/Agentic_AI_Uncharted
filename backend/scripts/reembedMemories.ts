/**
 * Seed Memory Re-Embedding Script (Step 2c)
 * Re-embeds all existing stored memories using the active EMBED_PROVIDER
 * ('openai' -> text-embedding-3-small 1536d or 'local' -> all-MiniLM-L6-v2-local 384d).
 * 
 * Usage:
 *   npx tsx scripts/reembedMemories.ts
 */

import { getRepository } from '../src/repositories/index.js';
import { getEmbedding } from '../src/services/embedding.js';
import { config } from '../src/config/index.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  console.log(`\n======================================================`);
  console.log(`  ENGRAM Memory Re-Embedding Utility`);
  console.log(`  Target Provider: ${config.embedProvider.toUpperCase()}`);
  console.log(`  Repository Store: ${config.store.toUpperCase()}`);
  console.log(`======================================================\n`);

  const repo = await getRepository();
  const memories = await repo.findMemories();

  console.log(`Found ${memories.length} memories to inspect and re-embed.\n`);

  let updatedCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < memories.length; i++) {
    const mem = memories[i];
    console.log(`[${i + 1}/${memories.length}] Embedding: "${mem.content.slice(0, 50)}..."`);

    const result = await getEmbedding(mem.content);

    await repo.updateMemory(
      mem._id,
      {
        embedding: result.embedding,
        embeddingModel: result.embeddingModel,
        dimension: result.dimension,
        updated_at: new Date().toISOString()
      },
      mem.ownerId || mem.owner,
      mem.workspaceId || mem.workspace
    );

    console.log(`  -> Model: ${result.embeddingModel} | Dim: ${result.dimension}`);
    updatedCount++;
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n======================================================`);
  console.log(`  Re-embedding complete!`);
  console.log(`  Total memories updated: ${updatedCount}`);
  console.log(`  Elapsed time: ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`======================================================\n`);

  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Failed to re-embed memories');
  console.error('Fatal error during re-embedding:', err);
  process.exit(1);
});
