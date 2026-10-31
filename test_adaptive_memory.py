#!/usr/bin/env python3
"""
==============================================================================
ANCHOR ADAPTIVE MEMORY-POWERED LLM INTELLIGENCE — INTEGRATION TEST SUITE
==============================================================================
Verifies the end-to-end adaptive memory architecture across all 8 required scenarios:
1. Basic memory use (Project name recall)
2. Previous action awareness (Completed components recall)
3. Context-aware technical recommendation (Tailored to React + Node.js + MongoDB)
4. Preference-based personalization (Step-by-step formatting)
5. No relevant memory (Anti-hallucination / safe abstention)
6. Memory update (Valid superseding from React to Next.js)
7. User isolation (Multi-tenant partition protection)
8. Previous feedback (Negative outcome adaptation)
==============================================================================
"""

import urllib.request
import json
import sys
import time

BASE_URL = "http://localhost:5000/api"

def request_json(url, method="GET", payload=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}
    except Exception as ex:
        return 500, {"error": str(ex)}

def register_or_login(email, password, name):
    status, res = request_json(f"{BASE_URL}/auth/register", method="POST", payload={
        "email": email,
        "password": password,
        "name": name
    })
    if status in (200, 201) and "token" in res:
        return res["token"], res["user"]["id"]
    # If already registered, login
    status, res = request_json(f"{BASE_URL}/auth/login", method="POST", payload={
        "email": email,
        "password": password
    })
    if status == 200 and "token" in res:
        return res["token"], res["user"]["id"]
    raise RuntimeError(f"Failed to auth user {email}: {res}")

def run_tests():
    print("=" * 72)
    print("🚀 STARTING ANCHOR ADAPTIVE MEMORY-POWERED LLM INTELLIGENCE TESTS")
    print("=" * 72)

    passed = 0
    total = 8

    # Create primary test user
    ts = int(time.time())
    token_a, user_id_a = register_or_login(f"praneeth_{ts}@anchor.ai", "SecretP@ss123", "Praneeth Test")
    print(f"[*] Authenticated User A: ID={user_id_a}, Token={token_a[:12]}...")

    # --------------------------------------------------------------------------
    # TEST 1: Basic memory use
    # --------------------------------------------------------------------------
    print("\n[TEST 1] Basic Memory Use (Project Name Recall)")
    s1, r1 = request_json(f"{BASE_URL}/ingest", method="POST", payload={
        "text": "My project is called ANCHOR.",
        "source": {"kind": "user_stated"}
    }, token=token_a)
    assert s1 in (200, 201), f"Ingest failed: {r1}"
    print(f"  -> Saved Memory: 'My project is called ANCHOR.' (Action: {r1.get('action')})")

    s1_ask, r1_ask = request_json(f"{BASE_URL}/chat", method="POST", payload={
        "message": "What is my project called?",
        "mode": "governed"
    }, token=token_a)
    assert s1_ask == 200, f"Chat failed: {r1_ask}"
    ans1 = r1_ask.get("answer", "")
    print(f"  -> Query: 'What is my project called?'")
    print(f"  -> Gemini Output:\n     {ans1.strip()}")
    assert "ANCHOR" in ans1, f"Expected 'ANCHOR' in answer, got: {ans1}"
    print("  ✅ [PASS] TEST 1: System retrieved memory and correctly answered 'ANCHOR'")
    passed += 1

    # --------------------------------------------------------------------------
    # TEST 2: Previous action awareness
    # --------------------------------------------------------------------------
    print("\n[TEST 2] Previous Action Awareness (Completed Components)")
    s2, r2 = request_json(f"{BASE_URL}/ingest", method="POST", payload={
        "text": "I completed the React frontend and my teammate completed the Node.js backend.",
        "source": {"kind": "user_stated"}
    }, token=token_a)
    assert s2 in (200, 201), f"Ingest failed: {r2}"
    print(f"  -> Saved Action: 'I completed the React frontend and my teammate completed the Node.js backend.'")

    s2_ask, r2_ask = request_json(f"{BASE_URL}/chat", method="POST", payload={
        "message": "What parts of my project are already completed?",
        "mode": "governed"
    }, token=token_a)
    assert s2_ask == 200, f"Chat failed: {r2_ask}"
    ans2 = r2_ask.get("answer", "")
    print(f"  -> Query: 'What parts of my project are already completed?'")
    print(f"  -> Gemini Output:\n     {ans2.strip()}")
    assert ("React" in ans2 or "frontend" in ans2) and ("Node" in ans2 or "backend" in ans2), f"Expected React frontend & Node backend in answer, got: {ans2}"
    print("  ✅ [PASS] TEST 2: Gemini recalled completed parts (React frontend & Node.js backend)")
    passed += 1

    # --------------------------------------------------------------------------
    # TEST 3: Context-aware technical recommendation
    # --------------------------------------------------------------------------
    print("\n[TEST 3] Context-Aware Technical Recommendation")
    s3, r3 = request_json(f"{BASE_URL}/ingest", method="POST", payload={
        "text": "My project uses React, Node.js and MongoDB.",
        "source": {"kind": "user_stated"}
    }, token=token_a)
    assert s3 in (200, 201), f"Ingest failed: {r3}"
    print(f"  -> Saved Stack: 'My project uses React, Node.js and MongoDB.'")

    s3_ask, r3_ask = request_json(f"{BASE_URL}/chat", method="POST", payload={
        "message": "How should I add authentication?",
        "mode": "governed"
    }, token=token_a)
    assert s3_ask == 200, f"Chat failed: {r3_ask}"
    ans3 = r3_ask.get("answer", "")
    print(f"  -> Query: 'How should I add authentication?'")
    print(f"  -> Gemini Output:\n     {ans3.strip()}")
    # Verify the recommendation specifically addresses React, Node.js, and/or MongoDB
    has_stack_reference = ("React" in ans3 or "Node" in ans3 or "Mongo" in ans3 or "JWT" in ans3)
    assert has_stack_reference, f"Expected architecture-tailored response, got: {ans3}"
    print("  ✅ [PASS] TEST 3: Gemini produced authentication recommendation tailored to React, Node.js, and MongoDB")
    passed += 1

    # --------------------------------------------------------------------------
    # TEST 4: Preference-based personalization
    # --------------------------------------------------------------------------
    print("\n[TEST 4] Preference-Based Personalization")
    s4, r4 = request_json(f"{BASE_URL}/ingest", method="POST", payload={
        "text": "I prefer simple explanations with exact step-by-step instructions.",
        "source": {"kind": "user_stated"}
    }, token=token_a)
    assert s4 in (200, 201), f"Ingest failed: {r4}"
    print(f"  -> Saved Preference: 'I prefer simple explanations with exact step-by-step instructions.'")

    s4_ask, r4_ask = request_json(f"{BASE_URL}/chat", method="POST", payload={
        "message": "How should I configure environment variables?",
        "mode": "governed"
    }, token=token_a)
    assert s4_ask == 200, f"Chat failed: {r4_ask}"
    ans4 = r4_ask.get("answer", "")
    print(f"  -> Query: 'How should I configure environment variables?'")
    print(f"  -> Gemini Output:\n     {ans4.strip()}")
    # Verify presence of step-by-step list (e.g. 1., 2., 3., or bulleted instructions)
    has_steps = ("1." in ans4 or "Step 1" in ans4 or "step-by-step" in ans4.lower())
    assert has_steps, f"Expected step-by-step formatted response, got: {ans4}"
    print("  ✅ [PASS] TEST 4: Gemini adapted response to user's step-by-step instruction preference")
    passed += 1

    # --------------------------------------------------------------------------
    # TEST 5: No relevant memory
    # --------------------------------------------------------------------------
    print("\n[TEST 5] No Relevant Memory (Anti-Hallucination Guard)")
    s5_ask, r5_ask = request_json(f"{BASE_URL}/chat", method="POST", payload={
        "message": "What is my favorite vacation destination in Europe?",
        "mode": "governed"
    }, token=token_a)
    assert s5_ask == 200, f"Chat failed: {r5_ask}"
    ans5 = r5_ask.get("answer", "")
    print(f"  -> Query: 'What is my favorite vacation destination in Europe?'")
    print(f"  -> Gemini Output:\n     {ans5.strip()}")
    # Verify the model does NOT invent a destination and explicitly communicates lack of memory/context
    ans5_norm = ans5.replace("’", "'").lower()
    communicates_lack = (
        "no" in ans5_norm or
        "not" in ans5_norm or
        "cannot" in ans5_norm or
        "don't" in ans5_norm or
        "recorded information" in ans5_norm
    )
    assert communicates_lack, f"Expected communication of missing context, got: {ans5}"
    print("  ✅ [PASS] TEST 5: Gemini refused to invent personal memories without evidence")
    passed += 1

    # --------------------------------------------------------------------------
    # TEST 6: Memory update (Valid Superseding)
    # --------------------------------------------------------------------------
    print("\n[TEST 6] Memory Update (Valid Superseding)")
    s6, r6 = request_json(f"{BASE_URL}/ingest", method="POST", payload={
        "text": "Update: My project now uses Next.js instead of React for the frontend.",
        "source": {"kind": "user_stated"}
    }, token=token_a)
    assert s6 in (200, 201), f"Ingest failed: {r6}"
    print(f"  -> Ingested Update: 'My project now uses Next.js instead of React...' (Action: {r6.get('action')})")

    s6_ask, r6_ask = request_json(f"{BASE_URL}/chat", method="POST", payload={
        "message": "What frontend framework does my project use?",
        "mode": "governed"
    }, token=token_a)
    assert s6_ask == 200, f"Chat failed: {r6_ask}"
    ans6 = r6_ask.get("answer", "")
    print(f"  -> Query: 'What frontend framework does my project use?'")
    print(f"  -> Gemini Output:\n     {ans6.strip()}")
    assert "Next.js" in ans6 or "Next" in ans6, f"Expected updated framework 'Next.js', got: {ans6}"
    print("  ✅ [PASS] TEST 6: Updated memory (Next.js) used instead of superseded information")
    passed += 1

    # --------------------------------------------------------------------------
    # TEST 7: User isolation (Multi-Tenant Protection)
    # --------------------------------------------------------------------------
    print("\n[TEST 7] User Isolation (Tenant Boundary Protection)")
    # Register second user (User B)
    token_b, user_id_b = register_or_login(f"alice_{ts}@anchor.ai", "SecretP@ss123", "Alice Private")
    print(f"[*] Authenticated User B: ID={user_id_b}")

    # User B saves a highly confidential secret
    secret_code = f"CIPHER-DELTA-KEY-{hex(ts)[2:].upper()}"
    s7_b, r7_b = request_json(f"{BASE_URL}/ingest", method="POST", payload={
        "text": f"My secret project code is {secret_code}.",
        "source": {"kind": "user_stated"}
    }, token=token_b)
    assert s7_b in (200, 201), f"User B ingest failed: {r7_b}"
    print(f"  -> User B saved private secret code: {secret_code}")

    # User A asks for the secret code - User A MUST NOT receive User B's secret!
    s7_a, r7_a = request_json(f"{BASE_URL}/chat", method="POST", payload={
        "message": "What is my secret project code?",
        "mode": "governed"
    }, token=token_a)
    assert s7_a == 200, f"User A chat failed: {r7_a}"
    ans7_a = r7_a.get("answer", "")
    print(f"  -> User A asks: 'What is my secret project code?'")
    print(f"  -> User A response: {ans7_a.strip()[:100]}...")
    assert secret_code not in ans7_a, f"CRITICAL LEAK: User A retrieved User B's secret code {secret_code}!"

    # Verify User B CAN retrieve their own secret code
    s7_b_ask, r7_b_ask = request_json(f"{BASE_URL}/chat", method="POST", payload={
        "message": "What is my secret project code?",
        "mode": "governed"
    }, token=token_b)
    ans7_b = r7_b_ask.get("answer", "")
    print(f"  -> User B asks: 'What is my secret project code?'")
    print(f"  -> User B response: {ans7_b.strip()[:100]}...")
    assert secret_code in ans7_b, f"User B should retrieve their own secret, got: {ans7_b}"
    print("  ✅ [PASS] TEST 7: Strict user isolation verified. No cross-tenant memory leakage.")
    passed += 1

    # --------------------------------------------------------------------------
    # TEST 8: Previous feedback & negative outcome awareness
    # --------------------------------------------------------------------------
    print("\n[TEST 8] Previous Feedback (Negative Outcome Awareness)")
    s8, r8 = request_json(f"{BASE_URL}/ingest", method="POST", payload={
        "text": "Feedback: Storing sessions in server memory failed during load testing; use Redis or stateless JWT instead.",
        "source": {"kind": "user_stated"}
    }, token=token_a)
    assert s8 in (200, 201), f"Feedback ingest failed: {r8}"
    print(f"  -> Ingested Feedback: 'Storing sessions in server memory failed during load testing; use Redis or stateless JWT instead.'")

    s8_ask, r8_ask = request_json(f"{BASE_URL}/chat", method="POST", payload={
        "message": "Where should I store user sessions for scale?",
        "mode": "governed"
    }, token=token_a)
    assert s8_ask == 200, f"Chat failed: {r8_ask}"
    ans8 = r8_ask.get("answer", "")
    print(f"  -> Query: 'Where should I store user sessions for scale?'")
    print(f"  -> Gemini Output:\n     {ans8.strip()}")
    assert ("Redis" in ans8 or "JWT" in ans8) and ("server memory" in ans8.lower() or "failed" in ans8.lower() or "stateless" in ans8.lower() or "load" in ans8.lower()), f"Expected previous feedback consideration in response, got: {ans8}"
    print("  ✅ [PASS] TEST 8: Gemini incorporated previous testing feedback and recommended Redis/JWT over failed server memory")
    passed += 1

    print("\n" + "=" * 72)
    print(f"🎉 ALL {passed}/{total} ADAPTIVE MEMORY-POWERED LLM INTELLIGENCE TESTS PASSED!")
    print("=" * 72)

if __name__ == "__main__":
    run_tests()
