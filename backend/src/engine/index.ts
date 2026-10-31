/**
 * ANCHOR AI Memory Engine - Core Exports
 * Agent: ShaktAI
 * Team: Shakti-2 | Track 1: Agentic Memory
 */

export * from './types.js';
export * from './repository.js';
export * from './inMemoryRepository.js';
export * from './safety.js';
export * from './extractor.js';
export * from './decisionEngine.js';
export * from './retrievalEngine.js';
export * from './agentModes.js';
export * from './lifecycleEngine.js';

import { InMemoryRepository } from './inMemoryRepository.js';
import { DecisionEngine } from './decisionEngine.js';
import { RetrievalEngine } from './retrievalEngine.js';
import { AgentOrchestrator } from './agentModes.js';
import { LifecycleEngine } from './lifecycleEngine.js';

export class AnchorMemoryEngine {
  public repository: InMemoryRepository;
  public decisionEngine: DecisionEngine;
  public retrievalEngine: RetrievalEngine;
  public agentOrchestrator: AgentOrchestrator;
  public lifecycleEngine: LifecycleEngine;

  constructor(repo?: InMemoryRepository) {
    this.repository = repo || new InMemoryRepository();
    this.decisionEngine = new DecisionEngine(this.repository);
    this.retrievalEngine = new RetrievalEngine(this.repository);
    this.agentOrchestrator = new AgentOrchestrator(this.repository);
    this.lifecycleEngine = new LifecycleEngine(this.repository);
  }
}

