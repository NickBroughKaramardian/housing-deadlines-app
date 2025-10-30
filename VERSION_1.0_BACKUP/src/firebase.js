import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBuuzXARkzRsgyzE9n0ZX42EllABb55EhE",
  authDomain: "cc-project-manager.firebaseapp.com",
  projectId: "cc-project-manager",
  storageBucket: "cc-project-manager.appspot.com",
  messagingSenderId: "1016045535100",
  appId: "1:1016045535100:web:3f624b6186e6476442aef9",
  measurementId: "G-KX9P1CPYCR"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const handleAddTask = async (newTask) => {
  await addDoc(collection(db, 'tasks'), newTask);
};

const handleUpdateTask = async (updatedTask) => {
  const ref = doc(db, 'tasks', updatedTask.id);
  await updateDoc(ref, updatedTask);
};

const handleDeleteTask = async (id) => {
  await deleteDoc(doc(db, 'tasks', id));
};

const setTasks = (tasks) => {
  // Implementation of setTasks function
};

onSnapshot(collection(db, 'tasks'), (snapshot) => {
  setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
}); 