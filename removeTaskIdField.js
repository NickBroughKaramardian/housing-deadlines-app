const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
  projectId: 'cc-project-manager',
});

const db = getFirestore();

async function cleanFirestoreTasks() {
  const tasksRef = db.collection('tasks');
  const snapshot = await tasksRef.get();
  
  let removedIdFields = 0;
  let deletedSyntheticDocs = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Check if document has a synthetic id field (starts with numbers)
    if (data.id && /^\d+/.test(data.id)) {
      console.log(`Deleting document with synthetic id: ${data.id}`);
      await doc.ref.delete();
      deletedSyntheticDocs++;
    }
    // Remove id field from documents that have it but don't have synthetic ids
    else if (data.id) {
      console.log(`Removing id field from: ${doc.id}`);
      await doc.ref.update({
        id: FieldValue.delete()
      });
      removedIdFields++;
    }
  }
  
  console.log(`\nDone!`);
  console.log(`- Deleted ${deletedSyntheticDocs} documents with synthetic ids`);
  console.log(`- Removed id field from ${removedIdFields} documents`);
}

cleanFirestoreTasks().catch(console.error);