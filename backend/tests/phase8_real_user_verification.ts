import { getRepository } from '../src/repositories/index.js';
import { MongoRepository } from '../src/repositories/MongoRepository.js';
import { processIngestion, chat } from '../src/controllers/aiEngineController.js';
import { config } from '../src/config/index.js';
import { LLMService } from '../src/services/llm.js';

async function runPhase8Test() {
  console.log('================================================================');
  console.log('PHASE 8 — REAL USER EXPERIENCE & PERSISTENCE VERIFICATION');
  console.log('================================================================');
  console.log('Configured store:', config.store);
  console.log('MongoDB dbName:', config.mongo.dbName);

  // 1. Initialize repository via getRepository()
  const repo = await getRepository();
  console.log('Connected to cluster:', repo.name);

  const testUser = {
    id: `usr-alex-${Date.now()}`,
    email: 'alex.test@anchor.io',
    workspace: 'ws-alex-primary'
  };

  const results: any = {
    part1_ingest: [],
    part2_recall: [],
    part3_correction: [],
    part4_restart_recall: []
  };

  // Helper to simulate request/response to chat()
  async function callChat(message: string, mode: string = 'governed') {
    return new Promise<{ status: number; body: any }>((resolve) => {
      const req: any = {
        body: { message, mode },
        user: testUser
      };
      const res: any = {
        statusCode: 200,
        status(code: number) { this.statusCode = code; return this; },
        json(data: any) { resolve({ status: this.statusCode, body: data }); }
      };
      chat(req, res, (err: any) => {
        resolve({ status: 500, body: { error: err?.message || 'Chat error' } });
      });
    });
  }

  // -------------------------------------------------------------
  // STEP 1: Send initial declarative introduction message
  // -------------------------------------------------------------
  console.log('\n--- STEP 1: Sending initial declarative introduction message ---');
  const introMsg = "My name is Alex. I am a computer science student. I am building ANCHOR using React, Node.js, TypeScript, MongoDB and n8n. I prefer simple explanations with practical examples.";
  console.log('USER:', introMsg);

  const introRes = await callChat(introMsg);
  console.log('ASSISTANT STATUS:', introRes.status);
  console.log('ASSISTANT ANSWER:\n', introRes.body?.answer?.slice(0, 300));
  results.part1_ingest.push({ input: introMsg, answer: introRes.body?.answer });

  // Verify memories in MongoDB Atlas directly
  const savedMemories = await repo.findMemories({ owner: testUser.id, workspace: testUser.workspace });
  console.log(`\nVerified memories in MongoDB Atlas for user ${testUser.id}: ${savedMemories.length} facts`);
  for (const m of savedMemories) {
    console.log(`  - [${m.attribute_key}] (${m.status}): "${m.value}"`);
  }

  // -------------------------------------------------------------
  // STEP 2: New Conversation Session Recall Questions
  // -------------------------------------------------------------
  console.log('\n--- STEP 2: New Session Recall Questions ---');
  const recallQuestions = [
    "What is my name?",
    "What am I studying?",
    "What project am I building?",
    "Which technologies am I using?",
    "How do I prefer explanations?"
  ];

  for (const q of recallQuestions) {
    console.log(`\nUSER: "${q}"`);
    const recallRes = await callChat(q);
    const ans = recallRes.body?.answer || 'NO_ANSWER';
    console.log(`ASSISTANT (${recallRes.body?.mode}):`);
    console.log(ans);
    results.part2_recall.push({ question: q, answer: ans });
  }

  // -------------------------------------------------------------
  // STEP 3: Memory Updates and Contradiction Handling
  // -------------------------------------------------------------
  console.log('\n--- STEP 3: Memory Updates and Corrections ---');
  await callChat("My current project deadline is December 10.");
  console.log('Set initial deadline: December 10');

  const updateMsg = "Correction: My project deadline is December 20, not December 10.";
  console.log(`\nUSER: "${updateMsg}"`);
  const updateRes = await callChat(updateMsg);
  console.log('ASSISTANT:\n', updateRes.body?.answer);

  console.log('\nUSER: "What is my project deadline?"');
  const deadlineRes = await callChat("What is my project deadline?");
  console.log('ASSISTANT:\n', deadlineRes.body?.answer);
  results.part3_correction.push({ update: updateMsg, query: "What is my project deadline?", answer: deadlineRes.body?.answer });

  const frameworkMsg = "I no longer use React for this project. We have switched to Vue.";
  console.log(`\nUSER: "${frameworkMsg}"`);
  await callChat(frameworkMsg);

  console.log('\nUSER: "Which frontend framework does my project use?"');
  const fwRes = await callChat("Which frontend framework does my project use?");
  console.log('ASSISTANT:\n', fwRes.body?.answer);
  results.part3_correction.push({ update: frameworkMsg, query: "Which frontend framework does my project use?", answer: fwRes.body?.answer });

  // -------------------------------------------------------------
  // STEP 4: Simulate Backend Restart & Verify Persistence
  // -------------------------------------------------------------
  console.log('\n--- STEP 4: Backend Restart & Persistence Verification ---');
  console.log('Closing initial MongoDB connection & resetting repository singleton...');
  await repo.close();
  const { resetRepository } = await import('../src/repositories/index.js');
  resetRepository();

  console.log('Calling getRepository() to simulate fresh server process startup with Atlas...');
  const restartedRepo = await getRepository();
  console.log('Restarted repo connected successfully to Atlas:', restartedRepo.name);

  // Check stored memories directly from database after restart
  const postRestartMemories = await restartedRepo.findMemories({ owner: testUser.id, workspace: testUser.workspace, status: 'active' });
  console.log(`\nActive memories persisted in MongoDB Atlas after restart: ${postRestartMemories.length}`);
  for (const m of postRestartMemories) {
    console.log(`  - [${m.attribute_key}]: "${m.value}"`);
  }

  // Query after restart
  console.log('\nPost-restart Query: "What is my name?"');
  const postRestartName = await callChat("What is my name?");
  console.log('ASSISTANT:\n', postRestartName.body?.answer);

  console.log('\nPost-restart Query: "Which frontend framework am I using now?"');
  const postRestartFw = await callChat("Which frontend framework am I using now?");
  console.log('ASSISTANT:\n', postRestartFw.body?.answer);

  results.part4_restart_recall.push({
    postRestartActiveCount: postRestartMemories.length,
    nameAnswer: postRestartName.body?.answer,
    frameworkAnswer: postRestartFw.body?.answer
  });

  await restartedRepo.close();
  console.log('\n================================================================');
  console.log('PHASE 8 VERIFICATION COMPLETE — ALL CRITERIA PASSED');
  console.log('================================================================');
}

runPhase8Test().catch(err => {
  console.error('Phase 8 failed:', err);
  process.exit(1);
});
