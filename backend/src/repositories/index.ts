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
    } catch (err) {
      logger.error({ err }, 'Failed to connect to MongoDB Atlas. Falling back to InMemoryRepository.');
    }
  }

  logger.info('STORE=memory configured. Initializing InMemoryRepository...');
  const inMemoryRepo = new InMemoryRepository();
  await inMemoryRepo.init();
  repositoryInstance = inMemoryRepo;
  return repositoryInstance;
}

