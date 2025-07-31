const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, query, where, getDocs, deleteDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxGQqQqQqQqQqQqQqQqQqQqQqQqQqQqQ",
  authDomain: "cc-project-manager.firebaseapp.com",
  projectId: "cc-project-manager",
  storageBucket: "cc-project-manager.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixUserRole() {
  try {
    console.log('Starting user role fix...');
    
    // 1. Find the user todd@c-cdev.com and update their role to owner
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', 'todd@c-cdev.com'));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'owner'
      });
      console.log('✅ Updated todd@c-cdev.com role to owner');
    } else {
      console.log('❌ User todd@c-cdev.com not found');
    }
    
    // 2. Remove the pending invitation for todd@c-cdev.com
    const invitesRef = collection(db, 'invites');
    const inviteQuery = query(invitesRef, where('email', '==', 'todd@c-cdev.com'));
    const inviteSnapshot = await getDocs(inviteQuery);
    
    if (!inviteSnapshot.empty) {
      for (const inviteDoc of inviteSnapshot.docs) {
        await deleteDoc(doc(db, 'invites', inviteDoc.id));
        console.log('✅ Removed pending invitation for todd@c-cdev.com');
      }
    } else {
      console.log('ℹ️ No pending invitation found for todd@c-cdev.com');
    }
    
    console.log('🎉 User role fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing user role:', error);
  }
}

fixUserRole(); 