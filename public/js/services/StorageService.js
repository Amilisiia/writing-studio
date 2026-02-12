import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import firebaseConfig from '../config/firebase.config.js';
import auth from '../core/Auth.js';

class StorageService {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
    }

    getCurrentUserId() {
        const user = auth.getCurrentUser();
        if (!user) {
            throw new Error('Користувач не авторизований');
        }
        return user.uid;
    }

    getUserCollection(collectionName) {
        const userId = this.getCurrentUserId();
        return collection(this.db, 'users', userId, collectionName);
    }

    getUserDoc(collectionName, docId) {
        const userId = this.getCurrentUserId();
        return doc(this.db, 'users', userId, collectionName, docId);
    }

    async create(collectionName, docId, data) {
        try {
            console.log('[StorageService] create викликано з:', { collectionName, docId });

            const docRef = this.getUserDoc(collectionName, docId);

            console.log('[StorageService] docRef створено');

            const dataWithTimestamp = {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await setDoc(docRef, dataWithTimestamp);

            console.log(`✅ Документ створено: ${collectionName}/${docId}`);
            return { success: true, id: docId };

        } catch (error) {
            console.error('❌ Помилка створення документа:', error);
            console.error('❌ Параметри:', { collectionName, docId });
            return { success: false, error: error.message };
        }
    }

    async read(collectionName, docId) {
        try {
            const docRef = this.getUserDoc(collectionName, docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log(`✅ Документ прочитано: ${collectionName}/${docId}`);
                return {
                    success: true,
                    data: { id: docSnap.id, ...docSnap.data() }
                };
            } else {
                console.log(`⚠️ Документ не знайдено: ${collectionName}/${docId}`);
                return { success: false, error: 'Документ не знайдено' };
            }

        } catch (error) {
            console.error('❌ Помилка читання документа:', error);
            return { success: false, error: error.message };
        }
    }

    async readAll(collectionName) {
        try {
            const colRef = this.getUserCollection(collectionName);
            const querySnapshot = await getDocs(colRef);

            const documents = [];
            querySnapshot.forEach((doc) => {
                documents.push({ id: doc.id, ...doc.data() });
            });

            console.log(`✅ Прочитано ${documents.length} документів з ${collectionName}`);
            return { success: true, data: documents };

        } catch (error) {
            console.error('❌ Помилка читання колекції:', error);
            return { success: false, error: error.message };
        }
    }

    async update(collectionName, docId, data) {
        try {
            const docRef = this.getUserDoc(collectionName, docId);

            const dataWithTimestamp = {
                ...data,
                updatedAt: serverTimestamp()
            };

            await updateDoc(docRef, dataWithTimestamp);

            console.log(`✅ Документ оновлено: ${collectionName}/${docId}`);
            return { success: true, id: docId };

        } catch (error) {
            console.error('❌ Помилка оновлення документа:', error);
            return { success: false, error: error.message };
        }
    }

    async delete(collectionName, docId) {
        try {
            const docRef = this.getUserDoc(collectionName, docId);
            await deleteDoc(docRef);

            console.log(`✅ Документ видалено: ${collectionName}/${docId}`);
            return { success: true, id: docId };

        } catch (error) {
            console.error('❌ Помилка видалення документа:', error);
            return { success: false, error: error.message };
        }
    }

    async query(collectionName, conditions = []) {
        try {
            const colRef = this.getUserCollection(collectionName);

            let q = colRef;
            if (conditions.length > 0) {
                q = query(colRef, ...conditions);
            }

            const querySnapshot = await getDocs(q);

            const documents = [];
            querySnapshot.forEach((doc) => {
                documents.push({ id: doc.id, ...doc.data() });
            });

            console.log(`✅ Запит виконано: знайдено ${documents.length} документів`);
            return { success: true, data: documents };

        } catch (error) {
            console.error('❌ Помилка виконання запиту:', error);
            return { success: false, error: error.message };
        }
    }
}

const storageService = new StorageService();

export default storageService;