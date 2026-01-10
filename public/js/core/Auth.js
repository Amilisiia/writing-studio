import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import firebaseConfig from '../config/firebase.config.js';
import eventBus from './EventBus.js';

class Auth {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.currentUser = null;

        this.initAuthStateListener();
    }

    initAuthStateListener() {
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;

            if (user) {
                console.log('✒️ Користувач увійшов:', user.email);
                eventBus.emit('auth:logged-in', user);
            } else {
                console.log('🔚 Користувач вийшов');
                eventBus.emit('auth:logged-out');
            }
        });
    }

    async register(email, password, displayName) {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                this.auth,
                email,
                password
            );

            await updateProfile(userCredential.user, {
                displayName: displayName
            });

            console.log('🔏 Реєстрація успішна:', userCredential.user.email);
            return { success: true, user: userCredential.user };

        } catch (error) {
            console.error('😿 Помилка реєстрації:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(
                this.auth,
                email,
                password
            );

            console.log('✒️ Вхід успішний:', userCredential.user.email);
            return { success: true, user: userCredential.user };

        } catch (error) {
            console.error('😿 Помилка входу:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            console.log('✒️ Вихід успішний');
            return { success: true };

        } catch (error) {
            console.error('😿 Помилка виходу:', error);
            return { success: false, error: error.message };
        }
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'Цей email вже використовується',
            'auth/invalid-email': 'Невірний формат email',
            'auth/operation-not-allowed': 'Операція заборонена',
            'auth/weak-password': 'Пароль занадто слабкий (мінімум 6 символів)',
            'auth/user-disabled': 'Цей акаунт заблоковано',
            'auth/user-not-found': 'Користувача не знайдено',
            'auth/wrong-password': 'Невірний пароль',
            'auth/invalid-credential': 'Невірний email або пароль',
            'auth/too-many-requests': 'Занадто багато спроб. Спробуйте пізніше',
            'auth/network-request-failed': 'Помилка мережі. Перевірте підключення до інтернету'
        };

        return errorMessages[errorCode] || 'Невідома помилка: ' + errorCode;
    }
}

const auth = new Auth();

export default auth;