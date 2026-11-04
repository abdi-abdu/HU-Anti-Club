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
  writeBatch,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { before, after, test } from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = 'demo-anti-drug-club';
const ADMIN = 'test-admin';
const SUPERVISOR = 'test-supervisor';
const TARGET = 'test-target';

let testEnv;

const appointment = (position, memberId) => ({
  memberId,
  position,
  startDate: new Date('2026-01-01T00:00:00Z'),
  status: 'active',
  createdBy: ADMIN,
  createdAt: new Date(),
});

async function seed(position = 'president') {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await db.doc(`users/${ADMIN}`).set({
      role: 'admin',
      status: 'active',
    });

    await db.doc(`users/${SUPERVISOR}`).set({
      role: 'student',
      status: 'active',
    });

    await db.doc(`users/${TARGET}`).set({
      role: 'student',
      status: 'active',
    });

    const supervisorAppointment = appointment('supervisor', SUPERVISOR);
    await db.doc('leadership/supervisor-appointment').set(supervisorAppointment);
    await db.doc('positionIndex/supervisor').set({
      memberId: SUPERVISOR,
      appointmentId: 'supervisor-appointment',
      updatedAt: new Date(),
    });

    const targetAppointment = appointment(position, TARGET);
    await db.doc(`${'leadership'}/${position}-appointment`).set(targetAppointment);
    await db.doc(`positionIndex/${position}`).set({
      memberId: TARGET,
      appointmentId: `${position}-appointment`,
      updatedAt: new Date(),
    });
  });
}

function dbFor(uid) {
  return testEnv.authenticatedContext(uid).firestore();
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

test('Admin: can create a Supervisor appointment and matching index atomically', async () => {
  await seed();
  const db = dbFor(ADMIN);
  const batch = writeBatch(db);

  batch.set(doc(db, 'leadership/new-supervisor'), {
    ...appointment('supervisor', TARGET),
    createdBy: ADMIN,
  });
  batch.set(doc(db, 'positionIndex/supervisor'), {
    memberId: TARGET,
    appointmentId: 'new-supervisor',
    updatedAt: new Date(),
  });

  await assertSucceeds(batch.commit());
});

test('Supervisor: cannot create another Supervisor appointment', async () => {
  await seed();
  const db = dbFor(SUPERVISOR);

  await assertFails(
    updateDoc(doc(db, 'leadership/supervisor-appointment'), {
      notes: 'Attempted change',
    }).then(() => {
      throw new Error('Unexpected success');
    })
  );
});

test('Supervisor: cannot rewrite appointment identity', async () => {
  await seed();
  const db = dbFor(SUPERVISOR);

  await assertFails(
    updateDoc(doc(db, 'leadership/president-appointment'), {
      memberId: SUPERVISOR,
    })
  );

  await assertFails(
    updateDoc(doc(db, 'leadership/president-appointment'), {
      position: 'secretary',
    })
  );

  await assertFails(
    updateDoc(doc(db, 'leadership/president-appointment'), {
      startDate: new Date('2027-01-01T00:00:00Z'),
    })
  );
});

test('Supervisor: can end a President appointment with matching index deletion in one batch', async () => {
  await seed('president');
  const db = dbFor(SUPERVISOR);
  const batch = writeBatch(db);

  batch.update(doc(db, 'leadership/president-appointment'), {
    status: 'ended',
    endDate: new Date(),
    updatedAt: new Date(),
    updatedBy: SUPERVISOR,
  });
  batch.delete(doc(db, 'positionIndex/president'));

  await assertSucceeds(batch.commit());
});

test('Admin: can end an appointment with matching index deletion in one batch', async () => {
  await seed('secretary');
  const db = dbFor(ADMIN);
  const batch = writeBatch(db);

  batch.update(doc(db, 'leadership/secretary-appointment'), {
    status: 'ended',
    endDate: new Date(),
    updatedAt: new Date(),
    updatedBy: ADMIN,
  });
  batch.delete(doc(db, 'positionIndex/secretary'));

  await assertSucceeds(batch.commit());
});

test('Admin: cannot end an active appointment without deleting its index', async () => {
  await seed('president');
  const db = dbFor(ADMIN);

  await assertFails(
    updateDoc(doc(db, 'leadership/president-appointment'), {
      status: 'ended',
      endDate: new Date(),
    })
  );
});

test('Admin: cannot delete an appointment index without ending its appointment', async () => {
  await seed('president');
  const db = dbFor(ADMIN);

  await assertFails(
    deleteDoc(doc(db, 'positionIndex/president'))
  );
});

test('Supervisor: cannot end their own Supervisor appointment', async () => {
  await seed();
  const db = dbFor(SUPERVISOR);

  await assertFails(
    updateDoc(doc(db, 'leadership/supervisor-appointment'), {
      status: 'ended',
      endDate: new Date(),
    })
  );
});

test('Supervisor: cannot delete the Supervisor position index', async () => {
  await seed();
  const db = dbFor(SUPERVISOR);

  await assertFails(
    deleteDoc(doc(db, 'positionIndex/supervisor'))
  );
});
