const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');

// Use your service account key
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
initializeApp({
  credential: cert(require(serviceAccountPath)),
});

const db = getFirestore();

async function removeIdFieldFromTasks() {
  const tasksRef = db.collection('tasks');
  const snapshot = await tasksRef.get();

  if (snapshot.empty) {
    console.log('No tasks found.');
    return;
  }

  let updated = 0;
  for (const doc of snapshot.docs) {
    if (doc.data().id) {
      await doc.ref.update({ id: FieldValue.delete() });
      updated++;
      console.log(`Removed id field from: ${doc.id}`);
    }
  }
  console.log(`Done! Removed id field from ${updated} documents.`);
}

removeIdFieldFromTasks().catch(console.error);