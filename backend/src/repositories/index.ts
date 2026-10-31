import dns from 'node:dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}
import { Repository } from './types.js';
import { InMemoryRepository } from './InMemoryRepository.js';
import { MongoRepository } from './MongoRepository.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let repositoryInstance: Repository | null = null;

export async function getRepository(): Promise<Repository> {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  if (config.store === 'mongo') {
    logger.info('STORE=mongo configured. Initializing MongoRepository...');
    try {
      const mongoRepo = new MongoRepository(config.mongo.uri, config.mongo.dbName);
      await mongoRepo.init();
      repositoryInstance = mongoRepo;
      return repositoryInstance;
    } catch (err: any) {
      if (config.nodeEnv === 'production') {
        logger.error({ err: err.message }, 'Fatal: MongoDB Atlas cluster is unavailable. Silent fallback to InMemoryRepository is disabled in production.');
        throw new Error('Fatal: MongoDB Atlas cluster is unavailable in production. Refusing silent fallback to in-memory mode.');
      }
      logger.error({ err }, 'Failed to connect to MongoDB Atlas. Falling back to InMemoryRepository in development.');
    }
  }

  logger.info('STORE=memory configured. Initializing InMemoryRepository...');
  const inMemoryRepo = new InMemoryRepository();
  await inMemoryRepo.init();
  repositoryInstance = inMemoryRepo;
  return repositoryInstance;
}

export function resetRepository(): void {
  repositoryInstance = null;
}

