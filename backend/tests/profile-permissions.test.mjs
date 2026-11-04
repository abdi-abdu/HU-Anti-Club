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
  updateDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = 'demo-anti-drug-club';
const ACTOR = 'actor-user';
const TARGET = 'target-user';

let testEnv;

const positions = {
  Supervisor: 'supervisor',
  President: 'president',
  'Vice President': 'vice_president',
  Secretary: 'secretary',
};

async function seed(role) {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await db.doc(`users/${ACTOR}`).set({
      fullName: 'Test Officer',
      role: role === 'Admin' ? 'admin' : 'student',
      status: 'active',
      email: 'actor@example.test',
    });

    await db.doc(`users/${TARGET}`).set({
      fullName: 'Target Member',
      role: 'student',
      status: 'active',
      email: 'target@example.test',
    });

    await db.doc(`memberProfiles/${ACTOR}`).set({
      fullName: 'Test Officer',
      department: 'Software Engineering',
    });

    await db.doc(`memberProfiles/${TARGET}`).set({
      fullName: 'Target Member',
      department: 'Computer Science',
    });

    if (positions[role]) {
      await db.doc(`positionIndex/${positions[role]}`).set({
        memberId: ACTOR,
      });
    }
  });
}

function actorDb() {
  return testEnv.authenticatedContext(ACTOR).firestore();
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
  // Each test seeds its own clean database.
});

for (const role of [
  'Student',
  'Supervisor',
  'President',
  'Vice President',
  'Secretary',
  'Admin',
]) {
  test(`${role}: can edit own permitted profile fields`, async () => {
    await seed(role);
    const db = actorDb();

    const batch = writeBatch(db);
    batch.update(doc(db, `users/${ACTOR}`), {
      fullName: 'Updated Own Name',
    });
    batch.update(doc(db, `memberProfiles/${ACTOR}`), {
      fullName: 'Updated Own Name',
    });

    await assertSucceeds(batch.commit());
  });
}

for (const role of ['President', 'Vice President', 'Admin']) {
  test(`${role}: can edit another member's profile`, async () => {
    await seed(role);
    const db = actorDb();

    const batch = writeBatch(db);
    batch.update(doc(db, `users/${TARGET}`), {
      fullName: 'Edited By Officer',
    });
    batch.update(doc(db, `memberProfiles/${TARGET}`), {
      fullName: 'Edited By Officer',
    });

    await assertSucceeds(batch.commit());
  });
}

for (const role of ['Student', 'Supervisor', 'Secretary']) {
  test(`${role}: cannot edit another member's profile`, async () => {
    await seed(role);
    const db = actorDb();

    const batch = writeBatch(db);
    batch.update(doc(db, `users/${TARGET}`), {
      fullName: 'Unauthorized Change',
    });
    batch.update(doc(db, `memberProfiles/${TARGET}`), {
      fullName: 'Unauthorized Change',
    });

    await assertFails(batch.commit());

    // Verify neither document was changed by the rejected batch.
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const verificationDb = context.firestore();

      const userDoc = await getDoc(
        doc(verificationDb, `users/${TARGET}`)
      );
      const profileDoc = await getDoc(
        doc(verificationDb, `memberProfiles/${TARGET}`)
      );

      assert.equal(userDoc.data().fullName, 'Target Member');
      assert.equal(profileDoc.data().fullName, 'Target Member');
    });
  });
}

test('Student: cannot change own email, role, or university ID', async () => {
  await seed('Student');
  const db = actorDb();

  await assertFails(
    updateDoc(doc(db, `users/${ACTOR}`), {
      email: 'changed@example.test',
    })
  );

  await assertFails(
    updateDoc(doc(db, `users/${ACTOR}`), {
      role: 'admin',
    })
  );

  await assertFails(
    updateDoc(doc(db, `users/${ACTOR}`), {
      universityId: 'CHANGED-ID',
    })
  );
});

// Protected fields must not be editable through another member's profile.
for (const role of ['President', 'Vice President']) {
  for (const field of ['role', 'status', 'universityId']) {
    test(`${role}: cannot directly change another member's ${field} in memberProfiles`, async () => {
      await seed(role);
      const db = actorDb();

      const value = {
        role: 'admin',
        status: 'deactivated',
        universityId: 'CHANGED-ID',
      }[field];

      await assertFails(
        updateDoc(doc(db, `memberProfiles/${TARGET}`), {
          [field]: value,
        })
      );
    });
  }
}

// A denied write must reject the entire batch, including otherwise allowed writes.
test('President: denied batch leaves both profile documents unchanged', async () => {
  await seed('President');
  const db = actorDb();

  const batch = writeBatch(db);

  batch.update(doc(db, `memberProfiles/${TARGET}`), {
    fullName: 'This must not be saved',
  });

  batch.update(doc(db, `users/${TARGET}`), {
    email: 'unauthorized@example.test',
  });

  await assertFails(batch.commit());

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const verificationDb = context.firestore();

    const userDoc = await getDoc(doc(verificationDb, `users/${TARGET}`));
    const profileDoc = await getDoc(
      doc(verificationDb, `memberProfiles/${TARGET}`)
    );

    assert.equal(userDoc.data().email, 'target@example.test');
    assert.equal(profileDoc.data().fullName, 'Target Member');
  });
});


// Verify that authorized officer status changes stay synchronized
// across users and memberProfiles in one atomic batch.
async function setTargetStatus(status) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await db.doc(`users/${TARGET}`).update({ status });
    await db.doc(`memberProfiles/${TARGET}`).set(
      { status },
      { merge: true }
    );
  });
}

test('President: can approve a pending member with synchronized status updates', async () => {
  await seed('President');
  await setTargetStatus('pending');

  const db = actorDb();
  const batch = writeBatch(db);

  batch.update(doc(db, `users/${TARGET}`), {
    status: 'active',
  });
  batch.set(doc(db, `memberProfiles/${TARGET}`), {
    status: 'active',
    updatedAt: new Date(),
  }, { merge: true });

  await assertSucceeds(batch.commit());
});

test('Vice President: can reject a pending member with synchronized status updates', async () => {
  await seed('Vice President');
  await setTargetStatus('pending');

  const db = actorDb();
  const batch = writeBatch(db);

  batch.update(doc(db, `users/${TARGET}`), {
    status: 'rejected',
  });
  batch.set(doc(db, `memberProfiles/${TARGET}`), {
    status: 'rejected',
    updatedAt: new Date(),
  }, { merge: true });

  await assertSucceeds(batch.commit());
});

test('Vice President: cannot deactivate an active member', async () => {
  await seed('Vice President');

  const db = actorDb();
  const batch = writeBatch(db);

  batch.update(doc(db, `users/${TARGET}`), {
    status: 'deactivated',
  });
  batch.set(doc(db, `memberProfiles/${TARGET}`), {
    status: 'deactivated',
    updatedAt: new Date(),
  }, { merge: true });

  await assertFails(batch.commit());

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const verificationDb = context.firestore();

    const userDoc = await getDoc(doc(verificationDb, `users/${TARGET}`));
    const profileDoc = await getDoc(
      doc(verificationDb, `memberProfiles/${TARGET}`)
    );

    assert.equal(userDoc.data().status, 'active');
    assert.equal(profileDoc.data().status, undefined);
  });
});
