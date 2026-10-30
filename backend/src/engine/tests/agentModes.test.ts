import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryRepository } from '../inMemoryRepository.js';
import { AgentOrchestrator } from '../agentModes.js';

describe('ANCHOR Three Operating Modes (None, Naive, Governed)', () => {
  it('None mode answers without retrieving internal memories', async () => {
    const repo = new InMemoryRepository();
    const agent = new AgentOrchestrator(repo);

    const res = await agent.chat({
      query: 'What database are we using in production?',
      mode: 'none',
    });

    assert.equal(res.mode, 'none');
    assert.equal(res.retrieved_memories.length, 0);
    assert.match(res.answer, /NONE MODE - NO MEMORY RETRIEVED/i);
  });

  it('Naive mode blindly retrieves stale/unverified data without governance', async () => {
    const repo = new InMemoryRepository();
    const agent = new AgentOrchestrator(repo);

    // Query for postgres database
    const res = await agent.chat({
      query: 'PostgreSQL RDS database',
      mode: 'naive',
    });

    assert.equal(res.mode, 'naive');
    assert.ok(res.retrieved_memories.length > 0);
    // Naive mode does not abstain even on stale items
    assert.equal(res.abstained, false);
    assert.match(res.answer, /NAIVE MODE - UNCHECKED RETRIEVAL/i);
  });

  it('Governed mode enforces governance and uses verified active facts', async () => {
    const repo = new InMemoryRepository();
    const agent = new AgentOrchestrator(repo);

    const res = await agent.chat({
      query: 'What is our primary production database?',
      mode: 'governed',
    });

    assert.equal(res.mode, 'governed');
    assert.ok(res.retrieved_memories.length > 0);
    assert.equal(res.abstained, false);
    assert.match(res.answer, /MongoDB Atlas/i);
    assert.equal(res.retrieved_memories[0].memory.status, 'active');
  });
});

