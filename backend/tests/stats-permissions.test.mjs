import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { before, after, beforeEach, test } from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = 'demo-anti-drug-club';
const STUDENT = 'test-student';
const ADMIN = 'test-admin';

let testEnv;

async function seed() {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Create a student user
    await db.doc(`users/${STUDENT}`).set({
      role: 'student',
      status: 'active',
      email: 'student@example.test',
    });

    // Create an admin user
    await db.doc(`users/${ADMIN}`).set({
      role: 'admin',
      status: 'active',
      email: 'admin@example.test',
    });

    // Create initial stats document
    await db.doc('stats/current').set({
      activeMemberCount: 10,
      eventsHeldCount: 5,
      resourceCount: 3,
    });
  });
}

function unauthenticatedDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function studentDb() {
  return testEnv.authenticatedContext(STUDENT).firestore();
}

function adminDb() {
  return testEnv.authenticatedContext(ADMIN).firestore();
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await seed();
});

// ── Unauthenticated Visitor Tests ─────────────────────────────────────────

test('Unauthenticated visitor: can read stats/current', async () => {
  const db = unauthenticatedDb();
  const statsRef = doc(db, 'stats/current');

  await assertSucceeds(getDoc(statsRef));
});

test('Unauthenticated visitor: cannot create stats/current', async () => {
  await testEnv.clearFirestore();

  const db = unauthenticatedDb();
  const statsRef = doc(db, 'stats/current');

  await assertFails(
    setDoc(statsRef, {
      activeMemberCount: 0,
      eventsHeldCount: 0,
      resourceCount: 0,
    })
  );
});

test('Unauthenticated visitor: cannot update stats/current', async () => {
  const db = unauthenticatedDb();
  const statsRef = doc(db, 'stats/current');

  await assertFails(
    updateDoc(statsRef, {
      activeMemberCount: 999,
    })
  );
});

// ── Student Tests ─────────────────────────────────────────────────────────

test('Student: can read stats/current', async () => {
  const db = studentDb();
  const statsRef = doc(db, 'stats/current');

  await assertSucceeds(getDoc(statsRef));
});

test('Student: cannot create stats/current', async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`users/${STUDENT}`).set({
      role: 'student',
      status: 'active',
      email: 'student@example.test',
    });
  });

  const db = studentDb();
  const statsRef = doc(db, 'stats/current');

  await assertFails(
    setDoc(statsRef, {
      activeMemberCount: 0,
      eventsHeldCount: 0,
      resourceCount: 0,
    })
  );
});

test('Student: cannot update stats/current', async () => {
  const db = studentDb();
  const statsRef = doc(db, 'stats/current');

  await assertFails(
    updateDoc(statsRef, {
      activeMemberCount: 999,
    })
  );
});

// ── Admin Tests ───────────────────────────────────────────────────────────

test('Admin: can read stats/current', async () => {
  const db = adminDb();
  const statsRef = doc(db, 'stats/current');

  await assertSucceeds(getDoc(statsRef));
});

test('Admin: can create stats/current', async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`users/${ADMIN}`).set({
      role: 'admin',
      status: 'active',
      email: 'admin@example.test',
    });
  });

  const db = adminDb();
  const statsRef = doc(db, 'stats/current');

  await assertSucceeds(
    setDoc(statsRef, {
      activeMemberCount: 42,
      eventsHeldCount: 15,
      resourceCount: 8,
    })
  );
});

test('Admin: can update stats/current', async () => {
  const db = adminDb();
  const statsRef = doc(db, 'stats/current');

  await assertSucceeds(
    updateDoc(statsRef, {
      activeMemberCount: 50,
    })
  );
});

test('Admin: can update multiple stats fields', async () => {
  const db = adminDb();
  const statsRef = doc(db, 'stats/current');

  await assertSucceeds(
    updateDoc(statsRef, {
      activeMemberCount: 55,
      eventsHeldCount: 20,
      resourceCount: 12,
    })
  );
});
