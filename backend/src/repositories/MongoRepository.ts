import { MongoClient, Db, Collection } from 'mongodb';
import { EventEmitter } from 'events';
import {
  Memory,
  MemoryEvent,
  Outcome,
  EnvEvent,
  Entity,
  User,
  MemoryFilter,
  ScoredMemory
} from '../types/index.js';
import { Repository } from './types.js';
import { calculateRecency, calculateFinalScore, cosineSimilarity } from '../utils/scoring.js';
import { logger } from '../utils/logger.js';

export class MongoRepository implements Repository {
  public name = 'MongoRepository';
  private client: MongoClient;
  private db!: Db;
  private emitter = new EventEmitter();
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPolledTimestamp: string = new Date().toISOString();

  // Collections
  private memoriesCol!: Collection<Memory>;
  private eventsCol!: Collection<MemoryEvent>;
  private outcomesCol!: Collection<Outcome>;
  private envEventsCol!: Collection<EnvEvent>;
  private entitiesCol!: Collection<Entity>;
  private usersCol!: Collection<User>;

  constructor(private uri: string, private dbName: string) {
    this.client = new MongoClient(this.uri);
    this.emitter.setMaxListeners(50);
  }

  async init(): Promise<void> {
    try {
      logger.info({ db: this.dbName }, 'Connecting to MongoDB Atlas cluster...');
      await this.client.connect();
      this.db = this.client.db(this.dbName);

      this.memoriesCol = this.db.collection<Memory>('memories');
      this.eventsCol = this.db.collection<MemoryEvent>('memory_events');
      this.outcomesCol = this.db.collection<Outcome>('outcomes');
      this.envEventsCol = this.db.collection<EnvEvent>('env_events');
      this.entitiesCol = this.db.collection<Entity>('entities');
      this.usersCol = this.db.collection<User>('users');

      // Create compound & attribute indexes
      await this.memoriesCol.createIndex({ owner: 1, workspace: 1, status: 1 });
      await this.memoriesCol.createIndex({ attribute_key: 1 });
      await this.memoriesCol.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
      await this.eventsCol.createIndex({ memory_id: 1, timestamp: -1 });

      logger.info('MongoDB Atlas indexes verified successfully.');
      this.initChangeStreamOrPolling();
    } catch (err) {
      logger.error({ err }, 'Failed to initialize MongoRepository');
      throw err;
    }
  }

  private initChangeStreamOrPolling() {
    try {
      const changeStream = this.eventsCol.watch();
      changeStream.on('change', (change) => {
        if (change.operationType === 'insert' && change.fullDocument) {
          this.emitter.emit('memory_event', change.fullDocument);
        }
      });
      changeStream.on('error', () => {
        logger.warn('Change stream unavailable on Atlas M0. Falling back to 2-second polling loop.');
        this.startPollingFallback();
      });
    } catch {
      this.startPollingFallback();
    }
  }

  private startPollingFallback() {
    if (this.pollingInterval) return;
    this.pollingInterval = setInterval(async () => {
      try {
        const newEvents = await this.eventsCol
          .find({ timestamp: { $gt: this.lastPolledTimestamp } })
          .sort({ timestamp: 1 })
          .toArray();

        for (const evt of newEvents) {
          this.lastPolledTimestamp = evt.timestamp;
          this.emitter.emit('memory_event', evt);
        }
      } catch (err) {
        // Suppress transient poll error
      }
    }, 2000);
  }

  async close(): Promise<void> {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    await this.client.close();
    this.emitter.removeAllListeners();
  }

  // --- Memories ---

  async saveMemory(memory: Memory): Promise<Memory> {
    const memId = memory._id || memory.id || `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const doc: Memory = {
      ...memory,
      _id: memId,
      id: memId,
      created_at: memory.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await this.memoriesCol.updateOne({ _id: memId }, { $set: doc }, { upsert: true });
    return doc;
  }

  async getMemoryById(id: string, owner?: string, workspace?: string): Promise<Memory | null> {
    const query: any = { _id: id };
    if (owner) query.owner = owner;
    if (workspace) query.workspace = workspace;
    return await this.memoriesCol.findOne(query);
  }

  async findMemories(filter?: MemoryFilter): Promise<Memory[]> {
    const query: any = {};
    if (filter?.owner) query.owner = filter.owner;
    if (filter?.workspace) query.workspace = filter.workspace;
    if (filter?.status && filter.status !== 'all') query.status = filter.status;
    if (filter?.type && filter.type !== 'all') query.type = filter.type;
    if (filter?.tier && filter.tier !== 'all') query.tier = filter.tier;
    if (filter?.source && filter.source !== 'all') query['source.kind'] = filter.source;
    if (filter?.attribute_key) query.attribute_key = filter.attribute_key;
    if (filter?.entity) query.entities = filter.entity;
    if (filter?.search) {
      query.$or = [
        { content: { $regex: filter.search, $options: 'i' } },
        { attribute_key: { $regex: filter.search, $options: 'i' } },
        { entities: { $regex: filter.search, $options: 'i' } }
      ];
    }
    return await this.memoriesCol.find(query).sort({ created_at: -1 }).toArray();
  }

  async updateMemory(
    id: string,
    updates: Partial<Memory>,
    owner?: string,
    workspace?: string
  ): Promise<Memory | null> {
    const query: any = { _id: id };
    if (owner) query.owner = owner;
    if (workspace) query.workspace = workspace;

    const res = await this.memoriesCol.findOneAndUpdate(
      query,
      { $set: { ...updates, updated_at: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    return res || null;
  }

  async deleteMemory(id: string, owner?: string, workspace?: string): Promise<boolean> {
    const query: any = { _id: id };
    if (owner) query.owner = owner;
    if (workspace) query.workspace = workspace;
    const res = await this.memoriesCol.deleteOne(query);
    return res.deletedCount > 0;
  }

  async deleteDerivedMemories(parentId: string, owner?: string, workspace?: string): Promise<number> {
    const query: any = { derived_from: parentId };
    if (owner) query.owner = owner;
    if (workspace) query.workspace = workspace;
    const res = await this.memoriesCol.deleteMany(query);
    return res.deletedCount;
  }

  // --- Events ---

  async appendEvent(event: MemoryEvent): Promise<void> {
    const fullEvent: MemoryEvent = {
      ...event,
      id: event.id || `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: event.timestamp || new Date().toISOString()
    };
    await this.eventsCol.insertOne(fullEvent as any);
    this.emitter.emit('memory_event', fullEvent);
  }

  async getEvents(limit: number = 100, owner?: string, workspace?: string): Promise<MemoryEvent[]> {
    return await this.eventsCol.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }

  async getEventsForMemory(memoryId: string, owner?: string, workspace?: string): Promise<MemoryEvent[]> {
    return await this.eventsCol.find({ memory_id: memoryId }).sort({ timestamp: -1 }).toArray();
  }

  // --- Search ---

  async searchVector(embedding: number[], topK: number = 20, filter?: MemoryFilter): Promise<ScoredMemory[]> {
    const candidates = await this.findMemories(filter);
    const scored: ScoredMemory[] = [];

    for (const mem of candidates) {
      const sim = mem.embedding && mem.embedding.length > 0
        ? cosineSimilarity(embedding, mem.embedding)
        : mem.status === 'active' ? 0.85 : 0.40;

      const recency = calculateRecency(mem.created_at || mem.valid_from, mem.type, mem.tier);
      const finalScore = calculateFinalScore(sim, mem.trust, mem.confidence, recency);

      scored.push({
        ...mem,
        similarity: Number(sim.toFixed(4)),
        recency_score: Number(recency.toFixed(4)),
        final_score: finalScore
      });
    }

    scored.sort((a, b) => b.final_score - a.final_score);
    return scored.slice(0, topK);
  }

  async searchKeyword(query: string, topK: number = 20, filter?: MemoryFilter): Promise<ScoredMemory[]> {
    const candidates = await this.findMemories(filter);
    const scored: ScoredMemory[] = [];
    const tokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

    for (const mem of candidates) {
      const contentTokens = mem.content.toLowerCase().split(/\W+/);
      const matches = tokens.filter(t => contentTokens.includes(t));
      const overlap = tokens.length > 0 ? matches.length / tokens.length : 0.1;
      const sim = Math.min(0.98, Math.max(0.1, overlap));

      const recency = calculateRecency(mem.created_at || mem.valid_from, mem.type, mem.tier);
      const finalScore = calculateFinalScore(sim, mem.trust, mem.confidence, recency);

      scored.push({
        ...mem,
        similarity: Number(sim.toFixed(4)),
        recency_score: Number(recency.toFixed(4)),
        final_score: finalScore
      });
    }

    scored.sort((a, b) => b.final_score - a.final_score);
    return scored.slice(0, topK);
  }

  // --- Outcomes & Feedback ---

  async saveOutcome(outcome: Outcome): Promise<void> {
    await this.outcomesCol.insertOne({ ...outcome } as any);
  }

  async getOutcomes(memoryId?: string): Promise<Outcome[]> {
    const q: any = memoryId ? { memory_id: memoryId } : {};
    return await this.outcomesCol.find(q).sort({ timestamp: -1 }).toArray();
  }

  async saveEnvEvent(event: EnvEvent): Promise<void> {
    await this.envEventsCol.insertOne({ ...event } as any);
  }

  async getEnvEvents(limit: number = 50): Promise<EnvEvent[]> {
    return await this.envEventsCol.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }

  // --- Entities & Downstream Traversal ---

  async saveEntity(entity: Entity): Promise<void> {
    await this.entitiesCol.updateOne({ id: entity.id }, { $set: entity }, { upsert: true });
  }

  async getEntities(): Promise<Entity[]> {
    return await this.entitiesCol.find().toArray();
  }

  async findDownstreamMemories(componentName: string): Promise<Memory[]> {
    return await this.memoriesCol
      .find({
        $or: [
          { depends_on: componentName },
          { entities: componentName }
        ]
      })
      .toArray();
  }

  // --- Users & Isolation ---

  async saveUser(user: User): Promise<User> {
    await this.usersCol.updateOne({ id: user.id }, { $set: user }, { upsert: true });
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.usersCol.findOne({ email: email.toLowerCase() });
  }

  async findUserById(id: string): Promise<User | null> {
    return await this.usersCol.findOne({ id });
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    await this.memoriesCol.deleteMany({ owner: userId });
    const res = await this.usersCol.deleteOne({ id: userId });
    return res.deletedCount > 0;
  }

  // --- Real-time SSE ---

  subscribeEvents(listener: (event: MemoryEvent) => void): () => void {
    this.emitter.on('memory_event', listener);
    return () => {
      this.emitter.off('memory_event', listener);
    };
  }
}

