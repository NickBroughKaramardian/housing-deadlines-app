// Firebase.js - Microsoft Lists replacement that maintains EXACT Firebase API
import { microsoftDataService } from './microsoftDataService';

// Mock Firebase app
const app = {
  name: 'microsoft-365-app',
  options: {},
  _deleted: false
};

// Mock Firestore
const db = {
  collection: (collectionName) => ({
    doc: (docId) => ({
      get: async () => {
        const data = await microsoftDataService[collectionName].getAll();
        const item = data.find(item => item.id === docId);
        return {
          exists: !!item,
          data: () => item,
          id: docId
        };
      },
      set: async (data) => {
        await microsoftDataService[collectionName].add({ id: docId, ...data });
        return { id: docId };
      },
      update: async (data) => {
        await microsoftDataService[collectionName].update(docId, data);
        return { id: docId };
      },
      delete: async () => {
        await microsoftDataService[collectionName].delete(docId);
        return { id: docId };
      }
    }),
    add: async (data) => {
      const result = await microsoftDataService[collectionName].add(data);
      return { id: result.id };
    },
    where: (field, operator, value) => ({
      where: (field2, operator2, value2) => ({
        where: (field3, operator3, value3) => ({
          orderBy: (field4, direction) => ({
            limit: (count) => ({
              onSnapshot: (callback) => {
                // Real-time subscription simulation
                const poll = async () => {
                  try {
                    const data = await microsoftDataService[collectionName].getAll();
                    const filtered = data.filter(item => {
                      if (field === 'organizationId' && operator === '==' && value === 'microsoft-365') return true;
                      if (field2 && operator2 && value2) {
                        if (field2 === 'isAnnouncement' && operator2 === '==' && value2 === true) {
                          return item.isAnnouncement === true;
                        }
                      }
                      return true;
                    });
                    callback({
                      docs: filtered.map(item => ({
                        id: item.id,
                        data: () => item,
                        exists: true
                      }))
                    });
                  } catch (error) {
                    console.error('Error in onSnapshot:', error);
                  }
                };
                poll();
                const interval = setInterval(poll, 5000);
                return () => clearInterval(interval);
              },
              get: async () => {
                const data = await microsoftDataService[collectionName].getAll();
                const filtered = data.filter(item => {
                  if (field === 'organizationId' && operator === '==' && value === 'microsoft-365') return true;
                  if (field2 && operator2 && value2) {
                    if (field2 === 'isAnnouncement' && operator2 === '==' && value2 === true) {
                      return item.isAnnouncement === true;
                    }
                  }
                  return true;
                });
                return {
                  docs: filtered.map(item => ({
                    id: item.id,
                    data: () => item,
                    exists: true
                  }))
                };
              }
            }),
            onSnapshot: (callback) => {
              const poll = async () => {
                try {
                  const data = await microsoftDataService[collectionName].getAll();
                  const filtered = data.filter(item => {
                    if (field === 'organizationId' && operator === '==' && value === 'microsoft-365') return true;
                    if (field2 && operator2 && value2) {
                      if (field2 === 'isAnnouncement' && operator2 === '==' && value2 === true) {
                        return item.isAnnouncement === true;
                      }
                    }
                    return true;
                  });
                  callback({
                    docs: filtered.map(item => ({
                      id: item.id,
                      data: () => item,
                      exists: true
                    }))
                  });
                } catch (error) {
                  console.error('Error in onSnapshot:', error);
                }
              };
              poll();
              const interval = setInterval(poll, 5000);
              return () => clearInterval(interval);
            },
            get: async () => {
              const data = await microsoftDataService[collectionName].getAll();
              const filtered = data.filter(item => {
                if (field === 'organizationId' && operator === '==' && value === 'microsoft-365') return true;
                if (field2 && operator2 && value2) {
                  if (field2 === 'isAnnouncement' && operator2 === '==' && value2 === true) {
                    return item.isAnnouncement === true;
                  }
                }
                return true;
              });
              return {
                docs: filtered.map(item => ({
                  id: item.id,
                  data: () => item,
                  exists: true
                }))
              };
            }
          }),
          onSnapshot: (callback) => {
            const poll = async () => {
              try {
                const data = await microsoftDataService[collectionName].getAll();
                const filtered = data.filter(item => {
                  if (field === 'organizationId' && operator === '==' && value === 'microsoft-365') return true;
                  if (field2 && operator2 && value2) {
                    if (field2 === 'isAnnouncement' && operator2 === '==' && value2 === true) {
                      return item.isAnnouncement === true;
                    }
                  }
                  return true;
                });
                callback({
                  docs: filtered.map(item => ({
                    id: item.id,
                    data: () => item,
                    exists: true
                  }))
                });
              } catch (error) {
                console.error('Error in onSnapshot:', error);
              }
            };
            poll();
            const interval = setInterval(poll, 5000);
            return () => clearInterval(interval);
          },
          get: async () => {
            const data = await microsoftDataService[collectionName].getAll();
            const filtered = data.filter(item => {
              if (field === 'organizationId' && operator === '==' && value === 'microsoft-365') return true;
              if (field2 && operator2 && value2) {
                if (field2 === 'isAnnouncement' && operator2 === '==' && value2 === true) {
                  return item.isAnnouncement === true;
                }
              }
              return true;
            });
            return {
              docs: filtered.map(item => ({
                id: item.id,
                data: () => item,
                exists: true
              }))
            };
          }
        }),
        onSnapshot: (callback) => {
          const poll = async () => {
            try {
              const data = await microsoftDataService[collectionName].getAll();
              const filtered = data.filter(item => {
                if (field === 'organizationId' && operator === '==' && value === 'microsoft-365') return true;
                return true;
              });
              callback({
                docs: filtered.map(item => ({
                  id: item.id,
                  data: () => item,
                  exists: true
                }))
              });
            } catch (error) {
              console.error('Error in onSnapshot:', error);
            }
          };
          poll();
          const interval = setInterval(poll, 5000);
          return () => clearInterval(interval);
        },
        get: async () => {
          const data = await microsoftDataService[collectionName].getAll();
          const filtered = data.filter(item => {
            if (field === 'organizationId' && operator === '==' && value === 'microsoft-365') return true;
            return true;
          });
          return {
            docs: filtered.map(item => ({
              id: item.id,
              data: () => item,
              exists: true
            }))
          };
        }
      }),
      orderBy: (field, direction) => ({
        limit: (count) => ({
          onSnapshot: (callback) => {
            const poll = async () => {
              try {
                const data = await microsoftDataService[collectionName].getAll();
                callback({
                  docs: data.slice(0, count).map(item => ({
                    id: item.id,
                    data: () => item,
                    exists: true
                  }))
                });
              } catch (error) {
                console.error('Error in onSnapshot:', error);
              }
            };
            poll();
            const interval = setInterval(poll, 5000);
            return () => clearInterval(interval);
          },
          get: async () => {
            const data = await microsoftDataService[collectionName].getAll();
            return {
              docs: data.slice(0, count).map(item => ({
                id: item.id,
                data: () => item,
                exists: true
              }))
            };
          }
        }),
        onSnapshot: (callback) => {
          const poll = async () => {
            try {
              const data = await microsoftDataService[collectionName].getAll();
              callback({
                docs: data.map(item => ({
                  id: item.id,
                  data: () => item,
                  exists: true
                }))
              });
            } catch (error) {
              console.error('Error in onSnapshot:', error);
            }
          };
          poll();
          const interval = setInterval(poll, 5000);
          return () => clearInterval(interval);
        },
        get: async () => {
          const data = await microsoftDataService[collectionName].getAll();
          return {
            docs: data.map(item => ({
              id: item.id,
              data: () => item,
              exists: true
            }))
          };
        }
      }),
      limit: (count) => ({
        onSnapshot: (callback) => {
          const poll = async () => {
            try {
              const data = await microsoftDataService[collectionName].getAll();
              callback({
                docs: data.slice(0, count).map(item => ({
                  id: item.id,
                  data: () => item,
                  exists: true
                }))
              });
            } catch (error) {
              console.error('Error in onSnapshot:', error);
            }
          };
          poll();
          const interval = setInterval(poll, 5000);
          return () => clearInterval(interval);
        },
        get: async () => {
          const data = await microsoftDataService[collectionName].getAll();
          return {
            docs: data.slice(0, count).map(item => ({
              id: item.id,
              data: () => item,
              exists: true
            }))
          };
        }
      }),
      onSnapshot: (callback) => {
        const poll = async () => {
          try {
            const data = await microsoftDataService[collectionName].getAll();
            callback({
              docs: data.map(item => ({
                id: item.id,
                data: () => item,
                exists: true
              }))
            });
          } catch (error) {
            console.error('Error in onSnapshot:', error);
          }
        };
        poll();
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
      },
      get: async () => {
        const data = await microsoftDataService[collectionName].getAll();
        return {
          docs: data.map(item => ({
            id: item.id,
            data: () => item,
            exists: true
          }))
        };
      }
    })
  })
};

// Mock Firebase Auth
const auth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    // Simulate auth state change
    setTimeout(() => {
      callback({
        uid: '1',
        email: 'user@example.com',
        displayName: 'Current User'
      });
    }, 100);
    return () => {};
  },
  signInWithEmailAndPassword: async (email, password) => {
    return {
      user: {
        uid: '1',
        email: email,
        displayName: 'Current User'
      }
    };
  },
  createUserWithEmailAndPassword: async (email, password) => {
    return {
      user: {
        uid: Date.now().toString(),
        email: email,
        displayName: 'New User'
      }
    };
  },
  signOut: async () => {
    return Promise.resolve();
  },
  sendPasswordResetEmail: async (email) => {
    return Promise.resolve();
  },
  updateProfile: async (user, profile) => {
    return Promise.resolve();
  },
  updatePassword: async (user, password) => {
    return Promise.resolve();
  }
};

// Firebase functions
export const initializeApp = () => app;
export const getFirestore = () => db;
export const getAuth = () => auth;
export const collection = (db, collectionName) => db.collection(collectionName);
export const doc = (db, collectionName, docId) => db.collection(collectionName).doc(docId);
export const addDoc = async (collectionRef, data) => {
  const result = await microsoftDataService[collectionRef._path.segments[0]].add(data);
  return { id: result.id };
};
export const updateDoc = async (docRef, data) => {
  await microsoftDataService[docRef._path.segments[0]].update(docRef._path.segments[1], data);
  return { id: docRef._path.segments[1] };
};
export const deleteDoc = async (docRef) => {
  await microsoftDataService[docRef._path.segments[0]].delete(docRef._path.segments[1]);
  return { id: docRef._path.segments[1] };
};
export const getDoc = async (docRef) => {
  const data = await microsoftDataService[docRef._path.segments[0]].getAll();
  const item = data.find(item => item.id === docRef._path.segments[1]);
  return {
    exists: !!item,
    data: () => item,
    id: docRef._path.segments[1]
  };
};
export const getDocs = async (query) => {
  const collectionName = query._path.segments[0];
  const data = await microsoftDataService[collectionName].getAll();
  return {
    docs: data.map(item => ({
      id: item.id,
      data: () => item,
      exists: true
    }))
  };
};
export const query = (collectionRef, ...queryConstraints) => {
  return {
    _path: collectionRef._path,
    onSnapshot: (callback) => {
      const poll = async () => {
        try {
          const collectionName = collectionRef._path.segments[0];
          const data = await microsoftDataService[collectionName].getAll();
          callback({
            docs: data.map(item => ({
              id: item.id,
              data: () => item,
              exists: true
            }))
          });
        } catch (error) {
          console.error('Error in onSnapshot:', error);
        }
      };
      poll();
      const interval = setInterval(poll, 5000);
      return () => clearInterval(interval);
    },
    get: async () => {
      const collectionName = collectionRef._path.segments[0];
      const data = await microsoftDataService[collectionName].getAll();
      return {
        docs: data.map(item => ({
          id: item.id,
          data: () => item,
          exists: true
        }))
      };
    }
  };
};
export const where = (field, operator, value) => ({ field, operator, value });
export const orderBy = (field, direction) => ({ field, direction });
export const limit = (count) => ({ count });
export const onSnapshot = (query, callback) => {
  const poll = async () => {
    try {
      const collectionName = query._path.segments[0];
      const data = await microsoftDataService[collectionName].getAll();
      callback({
        docs: data.map(item => ({
          id: item.id,
          data: () => item,
          exists: true
        }))
      });
    } catch (error) {
      console.error('Error in onSnapshot:', error);
    }
  };
  poll();
  const interval = setInterval(poll, 5000);
  return () => clearInterval(interval);
};
export const serverTimestamp = () => new Date().toISOString();

// Export everything
export { db, auth };
export default app;
