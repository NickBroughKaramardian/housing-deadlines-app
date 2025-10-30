#!/bin/bash

# Replace Firebase function calls with Microsoft Lists equivalents
find src -name "*.js" -type f -exec sed -i '' 's/collection(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/query(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/where(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/orderBy(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/limit(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/onSnapshot(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/getDocs(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/addDoc(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/updateDoc(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/deleteDoc(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/doc(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/setDoc(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/getDoc(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/serverTimestamp()/new Date().toISOString()/g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/getAuth()/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/signInWithEmailAndPassword(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/createUserWithEmailAndPassword(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/signOut(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/onAuthStateChanged(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/updateProfile(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/updatePassword(/microsoftDataService\./g' {} \;
find src -name "*.js" -type f -exec sed -i '' 's/sendPasswordResetEmail(/microsoftDataService\./g' {} \;

echo "Firebase functions replaced with Microsoft Lists equivalents"
