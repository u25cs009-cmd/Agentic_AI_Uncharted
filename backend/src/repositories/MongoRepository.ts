import dns from 'node:dns';
import { INITIAL_MEMORIES, INITIAL_EVENTS } from '../data/seedData.js';
import { MongoClient, Db, Collection } from 'mongodb';
import { EventEmitter } from 'events';
import {
  Memory,
  MemoryEvent,
  Outcome,
  EnvEvent,
  Entity,
  User,
  Conversation,
  MemoryFilter,
  ScoredMemory,
  AgentRun
} from '../types/index.js';
import { Repository } from './types.js';
import { generateEmbedding } from '../services/embedding.js';
import { calculateRecency, calculateFinalScore, cosineSimilarity, fuseRRF } from '../utils/scoring.js';
import {
  ScopedAccessContext,
  buildScopedMongoMemoryFilter,
  buildScopedMongoEventFilter
} from './scopedAccess.js';
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
  private conversationsCol!: Collection<Conversation>;
  private agentRunsCol!: Collection<AgentRun>;

  constructor(private uri: string, private dbName: string) {
    try { dns.setServers(["8.8.8.8", "1.1.1.1"]); } catch {} 
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
      this.conversationsCol = this.db.collection<Conversation>('conversations');
      this.agentRunsCol = this.db.collection<AgentRun>('agent_runs');

      // Create compound & attribute indexes
      await this.memoriesCol.createIndex({ workspaceId: 1, status: 1, type: 1 });
      await this.memoriesCol.createIndex({ owner: 1, workspace: 1, status: 1 });
      await this.memoriesCol.createIndex({ attribute_key: 1 });
      await this.memoriesCol.createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0 });
      await this.memoriesCol.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
      await this.eventsCol.createIndex({ memory_id: 1, timestamp: -1 });
      await this.eventsCol.createIndex({ workspaceId: 1, timestamp: -1 });
      await this.conversationsCol.createIndex({ userId: 1, updatedAt: -1 });
      await this.agentRunsCol.createIndex({ workspaceId: 1, ts: -1 });

      logger.info('MongoDB Atlas indexes verified successfully.');

      const memCount = await this.memoriesCol.countDocuments();
      if (memCount === 0) {
        logger.info('Empty MongoDB database detected. Auto-seeding initial memories and events...');
        await this.memoriesCol.insertMany(INITIAL_MEMORIES.map(m => {
          const ws = m.workspaceId || m.workspace || 'ws-primary';
          const own = m.ownerId || m.owner || 'usr-shakti2';
          return {
            ...m,
            owner: own,
            ownerId: own,
            workspace: ws,
            workspaceId: ws,
            visibility: m.visibility || 'workspace',
            embedding: m.embedding || generateEmbedding(m.content),
            embeddingModel: m.embeddingModel || 'all-MiniLM-L6-v2-local',
            dimension: m.dimension || 384
          };
        }) as any);
        await this.eventsCol.insertMany(INITIAL_EVENTS.map(e => ({
          ...e,
          workspaceId: (e as any).workspaceId || 'ws-primary',
          workspace: (e as any).workspace || 'ws-primary',
          ownerId: (e as any).ownerId || 'usr-shakti2',
          owner: (e as any).owner || 'usr-shakti2',
          visibility: (e as any).visibility || 'workspace'
        })) as any);
      }
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
    const ws = memory.workspaceId || memory.workspace || 'ws-primary';
    const own = memory.ownerId || memory.owner || 'usr-shakti2';
    const vis = memory.visibility || 'workspace';

    const doc: Memory = {
      ...memory,
      _id: memId,
      id: memId,
      owner: own,
      ownerId: own,
      workspace: ws,
      workspaceId: ws,
      visibility: vis,
      embeddingModel: memory.embeddingModel || 'all-MiniLM-L6-v2-local',
      dimension: memory.dimension || (memory.embedding ? memory.embedding.length : 384),
      created_at: memory.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await this.memoriesCol.updateOne({ _id: memId }, { $set: doc }, { upsert: true });
    return doc;
  }

  async getMemoryById(id: string, owner?: string, workspace?: string): Promise<Memory | null> {
    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };
    const scopedFilter = buildScopedMongoMemoryFilter(ctx);
    return await this.memoriesCol.findOne({
      $and: [
        { $or: [{ _id: id }, { id }] },
        scopedFilter
      ]
    });
  }

  async findMemories(filter?: MemoryFilter): Promise<Memory[]> {
    const ctx: ScopedAccessContext = {
      userId: filter?.ownerId || filter?.owner || '',
      workspaceId: filter?.workspaceId || filter?.workspace || 'ws-primary'
    };
    const query = buildScopedMongoMemoryFilter(ctx, filter);
    return await this.memoriesCol.find(query).sort({ created_at: -1 }).toArray();
  }

  async updateMemory(
    id: string,
    updates: Partial<Memory>,
    owner?: string,
    workspace?: string
  ): Promise<Memory | null> {
    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };
    const query = {
      $and: [
        { $or: [{ _id: id }, { id }] },
        buildScopedMongoMemoryFilter(ctx)
      ]
    };

    const res = await this.memoriesCol.findOneAndUpdate(
      query,
      { $set: { ...updates, updated_at: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    return res || null;
  }

  async deleteMemory(id: string, owner?: string, workspace?: string): Promise<boolean> {
    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };
    const query = {
      $and: [
        { $or: [{ _id: id }, { id }] },
        buildScopedMongoMemoryFilter(ctx)
      ]
    };
    const res = await this.memoriesCol.deleteOne(query);
    return res.deletedCount > 0;
  }

  async deleteDerivedMemories(parentId: string, owner?: string, workspace?: string): Promise<number> {
    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };
    const query = {
      $and: [
        { derived_from: parentId },
        buildScopedMongoMemoryFilter(ctx)
      ]
    };
    const res = await this.memoriesCol.deleteMany(query);
    return res.deletedCount;
  }

  // --- Events ---

  async appendEvent(event: MemoryEvent): Promise<void> {
    const ws = event.workspaceId || event.workspace || 'ws-primary';
    const own = event.ownerId || event.owner || 'usr-shakti2';
    const vis = event.visibility || 'workspace';

    const fullEvent: MemoryEvent = {
      ...event,
      id: event.id || `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workspaceId: ws,
      workspace: ws,
      ownerId: own,
      owner: own,
      visibility: vis,
      timestamp: event.timestamp || new Date().toISOString()
    };
    await this.eventsCol.insertOne(fullEvent as any);
    this.emitter.emit('memory_event', fullEvent);
  }

  async getEvents(limit: number = 100, owner?: string, workspace?: string): Promise<MemoryEvent[]> {
    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };
    const query = buildScopedMongoEventFilter(ctx);
    return await this.eventsCol.find(query).sort({ timestamp: -1 }).limit(limit).toArray();
  }

  async getEventsForMemory(memoryId: string, owner?: string, workspace?: string): Promise<MemoryEvent[]> {
    const ctx: ScopedAccessContext = {
      userId: owner || '',
      workspaceId: workspace || 'ws-primary'
    };
    const query = buildScopedMongoEventFilter(ctx, memoryId);
    return await this.eventsCol.find(query).sort({ timestamp: -1 }).toArray();
  }

  // --- Normalization Helpers & Transactions (Step 5) ---

  private normalizeMemory(memory: Memory): Memory {
    const memId = memory._id || memory.id || `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const ws = memory.workspaceId || memory.workspace || 'ws-primary';
    const own = memory.ownerId || memory.owner || 'usr-shakti2';
    const vis = memory.visibility || 'workspace';
    return {
      ...memory,
      _id: memId,
      id: memId,
      owner: own,
      ownerId: own,
      workspace: ws,
      workspaceId: ws,
      visibility: vis,
      embeddingModel: memory.embeddingModel || 'all-MiniLM-L6-v2-local',
      dimension: memory.dimension || (memory.embedding ? memory.embedding.length : 384),
      created_at: memory.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private normalizeEvent(event: MemoryEvent): MemoryEvent {
    const ws = event.workspaceId || event.workspace || 'ws-primary';
    const own = event.ownerId || event.owner || 'usr-shakti2';
    const vis = event.visibility || 'workspace';
    return {
      ...event,
      id: event.id || `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workspaceId: ws,
      workspace: ws,
      ownerId: own,
      owner: own,
      visibility: vis,
      timestamp: event.timestamp || new Date().toISOString()
    };
  }

  async ingestTransactional(memory: Memory, event: MemoryEvent): Promise<{ memory: Memory; event: MemoryEvent }> {
    const session = this.client.startSession();
    try {
      let savedMemory = memory;
      let savedEvent = event;
      await session.withTransaction(async () => {
        const memDoc = this.normalizeMemory(memory);
        await this.memoriesCol.updateOne({ _id: memDoc._id }, { $set: memDoc }, { upsert: true, session });
        const evtDoc = this.normalizeEvent(event);
        await this.eventsCol.insertOne(evtDoc as any, { session });
        this.emitter.emit('memory_event', evtDoc);
        savedMemory = memDoc;
        savedEvent = evtDoc;
      });
      return { memory: savedMemory, event: savedEvent };
    } finally {
      await session.endSession();
    }
  }

  async supersedeTransactional(
    oldMemoryId: string,
    newMemory: Memory,
    oldEvent: MemoryEvent,
    newEvent: MemoryEvent,
    owner?: string,
    workspace?: string
  ): Promise<{ newMemory: Memory }> {
    const session = this.client.startSession();
    try {
      let savedNewMemory = newMemory;
      await session.withTransaction(async () => {
        const now = new Date().toISOString();
        const ctx: ScopedAccessContext = { userId: owner || '', workspaceId: workspace || 'ws-primary' };
        const scopedFilter = buildScopedMongoMemoryFilter(ctx);

        // 1. Retire old memory
        await this.memoriesCol.updateOne(
          { $and: [{ $or: [{ _id: oldMemoryId }, { id: oldMemoryId }] }, scopedFilter] },
          { $set: { status: 'superseded', valid_to: now, superseded_by: newMemory._id || newMemory.id, updated_at: now } },
          { session }
        );

        // 2. Append superseded event for old memory
        const oldEvtDoc = this.normalizeEvent(oldEvent);
        await this.eventsCol.insertOne(oldEvtDoc as any, { session });
        this.emitter.emit('memory_event', oldEvtDoc);

        // 3. Save new memory
        const newMemDoc = this.normalizeMemory(newMemory);
        await this.memoriesCol.updateOne({ _id: newMemDoc._id }, { $set: newMemDoc }, { upsert: true, session });
        savedNewMemory = newMemDoc;

        // 4. Append creation event for new memory
        const newEvtDoc = this.normalizeEvent(newEvent);
        await this.eventsCol.insertOne(newEvtDoc as any, { session });
        this.emitter.emit('memory_event', newEvtDoc);
      });
      return { newMemory: savedNewMemory };
    } finally {
      await session.endSession();
    }
  }

  async cascadeDeleteTransactional(
    targetMemoryId: string,
    tombstoneEvents: MemoryEvent[],
    owner?: string,
    workspace?: string
  ): Promise<{ deletedCount: number }> {
    const session = this.client.startSession();
    try {
      let totalDeleted = 0;
      await session.withTransaction(async () => {
        const ctx: ScopedAccessContext = { userId: owner || '', workspaceId: workspace || 'ws-primary' };
        const scopedFilter = buildScopedMongoMemoryFilter(ctx);

        // Delete parent memory
        const pRes = await this.memoriesCol.deleteOne(
          { $and: [{ $or: [{ _id: targetMemoryId }, { id: targetMemoryId }] }, scopedFilter] },
          { session }
        );
        totalDeleted += pRes.deletedCount;

        // Delete derived memories
        const dRes = await this.memoriesCol.deleteMany(
          { $and: [{ derived_from: targetMemoryId }, scopedFilter] },
          { session }
        );
        totalDeleted += dRes.deletedCount;

        // Insert tombstone events
        for (const evt of tombstoneEvents) {
          const evtDoc = this.normalizeEvent(evt);
          await this.eventsCol.insertOne(evtDoc as any, { session });
          this.emitter.emit('memory_event', evtDoc);
        }
      });
      return { deletedCount: totalDeleted };
    } finally {
      await session.endSession();
    }
  }

  // --- Native Atlas Retrieval & RRF Fusion (Step 3b) ---

  async searchAtlasHybrid(
    queryText: string,
    queryEmbedding: number[],
    topK: number = 20,
    filter?: MemoryFilter
  ): Promise<{ results: ScoredMemory[]; retrievalPath: 'atlas-hybrid'; indexError?: string }> {
    const ctx: ScopedAccessContext = {
      userId: filter?.ownerId || filter?.owner || '',
      workspaceId: filter?.workspaceId || filter?.workspace || 'ws-primary'
    };

    const statusFilter = filter?.status && filter.status !== 'all' ? filter.status : { $in: ['active', 'stale'] };
    const preFilter = buildScopedMongoMemoryFilter(ctx, { status: statusFilter as any });

    let vectorCandidates: Memory[] = [];
    let textCandidates: Memory[] = [];
    let indexError: string | undefined;

    // 1. $vectorSearch
    try {
      vectorCandidates = await this.memoriesCol
        .aggregate<Memory>([
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector: queryEmbedding,
              numCandidates: Math.max(topK * 10, 100),
              limit: topK,
              filter: preFilter
            }
          }
        ])
        .toArray();
    } catch (err: any) {
      logger.error({ err: err.message }, 'MongoRepository: Atlas $vectorSearch failed');
      indexError = `Atlas $vectorSearch error: ${err.message}`;
    }

    // 2. $search
    try {
      textCandidates = await this.memoriesCol
        .aggregate<Memory>([
          {
            $search: {
              index: 'text_index',
              compound: {
                must: [
                  {
                    text: {
                      query: queryText,
                      path: ['content', 'tags', 'entities.name']
                    }
                  }
                ]
              }
            }
          },
          { $match: preFilter },
          { $limit: topK }
        ])
        .toArray();
    } catch (err: any) {
      logger.error({ err: err.message }, 'MongoRepository: Atlas $search failed');
      indexError = (indexError ? `${indexError} | ` : '') + `Atlas $search error: ${err.message}`;
    }

    // Step 3d: Do not silently fall back in production if index fails
    if (indexError && vectorCandidates.length === 0 && textCandidates.length === 0) {
      return {
        results: [],
        retrievalPath: 'atlas-hybrid',
        indexError
      };
    }

    // 3. Reciprocal Rank Fusion (k = 60)
    const fused = fuseRRF(vectorCandidates, textCandidates, 60);

    // 4. Scoring Formula
    const scored: ScoredMemory[] = fused.map(({ memory: mem, relevance }) => {
      const recency = calculateRecency(mem.created_at || mem.valid_from, mem.type, mem.tier);
      const validity = mem.status === 'stale' ? 0.15 : 1.0;
      const finalScore = Number((relevance * mem.trust * mem.confidence * recency * validity).toFixed(4));

      return {
        ...mem,
        similarity: relevance,
        recency_score: Number(recency.toFixed(4)),
        final_score: finalScore
      };
    });

    scored.sort((a, b) => b.final_score - a.final_score);
    return {
      results: scored.slice(0, topK),
      retrievalPath: 'atlas-hybrid',
      indexError
    };
  }

  async searchVector(embedding: number[], topK: number = 20, filter?: MemoryFilter): Promise<ScoredMemory[]> {
    const ctx: ScopedAccessContext = {
      userId: filter?.ownerId || filter?.owner || '',
      workspaceId: filter?.workspaceId || filter?.workspace || 'ws-primary'
    };
    const preFilter = buildScopedMongoMemoryFilter(ctx, filter);

    try {
      const docs = await this.memoriesCol
        .aggregate<Memory>([
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector: embedding,
              numCandidates: Math.max(topK * 10, 100),
              limit: topK,
              filter: preFilter
            }
          }
        ])
        .toArray();

      if (docs.length > 0) {
        return docs.map((mem) => {
          const recency = calculateRecency(mem.created_at || mem.valid_from, mem.type, mem.tier);
          const validity = mem.status === 'stale' ? 0.15 : 1.0;
          const sim = mem.embedding && mem.embedding.length === embedding.length
            ? cosineSimilarity(embedding, mem.embedding)
            : 0.85;
          const finalScore = Number((sim * mem.trust * mem.confidence * recency * validity).toFixed(4));
          return {
            ...mem,
            similarity: Number(sim.toFixed(4)),
            recency_score: Number(recency.toFixed(4)),
            final_score: finalScore
          };
        });
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'MongoRepository: $vectorSearch execution failed');
      throw new Error(`Atlas $vectorSearch failed: ${err.message}. Index may not be provisioned or ready.`);
    }

    return [];
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
      const validity = mem.status === 'stale' ? 0.15 : 1.0;
      const finalScore = Number((sim * mem.trust * mem.confidence * recency * validity).toFixed(4));

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
    if (!email || typeof email !== 'string') return null;
    return await this.usersCol.findOne({ email: email.toLowerCase().trim() });
  }

  async findUserById(id: string): Promise<User | null> {
    return await this.usersCol.findOne({ id });
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    return await this.usersCol.findOne({ googleId });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    delete (cleanUpdates as any).id;
    delete (cleanUpdates as any)._id;

    await this.usersCol.updateOne({ id }, { $set: cleanUpdates });
    return await this.findUserById(id);
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    await this.memoriesCol.deleteMany({ $or: [{ owner: userId }, { ownerId: userId }] });
    await this.conversationsCol.deleteMany({ userId });
    const res = await this.usersCol.deleteOne({ id: userId });
    return res.deletedCount > 0;
  }

  // --- Conversations & Chat History ---

  async saveConversation(conversation: Conversation): Promise<Conversation> {
    const convId = conversation.id || conversation._id || `conv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const doc: Conversation = {
      ...conversation,
      id: convId,
      _id: convId,
      createdAt: conversation.createdAt || now,
      updatedAt: now
    };
    await this.conversationsCol.updateOne({ id: convId }, { $set: doc }, { upsert: true });
    return doc;
  }

  async findConversationsByUser(userId: string): Promise<Conversation[]> {
    return await this.conversationsCol.find({ userId }).sort({ updatedAt: -1 }).toArray();
  }

  async findConversationById(id: string, userId: string): Promise<Conversation | null> {
    return await this.conversationsCol.findOne({ id, userId });
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    const res = await this.conversationsCol.deleteOne({ id, userId });
    return res.deletedCount > 0;
  }

  // --- Real-time SSE ---

  subscribeEvents(listener: (event: MemoryEvent) => void): () => void {
    this.emitter.on('memory_event', listener);
    return () => {
      this.emitter.off('memory_event', listener);
    };
  }

  // --- Agent Runs (Step 6) ---

  async saveAgentRun(run: AgentRun): Promise<AgentRun> {
    const runId = run._id || run.id || `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const doc: AgentRun = {
      ...run,
      _id: runId,
      id: runId,
      ts: run.ts || new Date().toISOString()
    };
    await this.agentRunsCol.updateOne({ _id: runId }, { $set: doc }, { upsert: true });
    return doc;
  }

  async getAgentRuns(workspaceId: string, limit: number = 50): Promise<AgentRun[]> {
    return await this.agentRunsCol
      .find({ workspaceId })
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();
  }

  async getAgentRunById(id: string, workspaceId: string): Promise<AgentRun | null> {
    return await this.agentRunsCol.findOne({
      $and: [
        { $or: [{ _id: id }, { id }] },
        { workspaceId }
      ]
    });
  }
}
