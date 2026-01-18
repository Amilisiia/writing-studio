import auth from './core/Auth.js';
import eventBus from './core/EventBus.js';
import router from './core/Router.js';
window.router = router;

class App {
    constructor() {
        this.authModal = null;
        this.loginForm = null;
        this.registerForm = null;
        this.appLoader = null;
        this.appContainer = null;
    }

    async init() {
        console.log('⌛ Writing Studio запускається...');

        this.findElements();

        this.setupEventListeners();

        this.subscribeToAuthEvents();

        if (!auth.isAuthenticated()) {
            this.showAuthModal();
        } else {
            this.showApp();
        }
    }

    async loadComponents() {
        try {
            const response = await fetch('components/bookshelf.html');
            if (response.ok) {
                const html = await response.text();
                const container = document.getElementById('bookshelf-container');
                if (container) {
                    container.innerHTML = html;
                    console.log('✅ Bookshelf component завантажено');
                }
            }
        } catch (error) {
            console.error('❌ Помилка завантаження компонентів:', error);
        }
    }

    async loadComponents() {
        try {
            const response = await fetch('components/bookshelf.html');
            if (response.ok) {
                const html = await response.text();
                const container = document.getElementById('bookshelf-container');
                if (container) {
                    container.innerHTML = html;
                    console.log('✅ Bookshelf component завантажено');
                } else {
                    console.error('❌ bookshelf-container не знайдено');
                }
            } else {
                console.error('❌ Не вдалося завантажити bookshelf.html');
            }
        } catch (error) {
            console.error('❌ Помилка завантаження компонентів:', error);
        }
    }

    findElements() {
        this.authModal = document.getElementById('auth-modal');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.appLoader = document.getElementById('app-loader');
        this.appContainer = document.getElementById('app-container');
    }

    setupEventListeners() {
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');

        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }

    subscribeToAuthEvents() {
        eventBus.on('auth:logged-in', (user) => {
            console.log('🔋 Користувач увійшов:', user.email);
            this.hideAuthModal();
            this.showApp();
        });

        eventBus.on('auth:logged-out', () => {
            console.log('🪫 Користувач вийшов');
            this.hideApp();
            this.showAuthModal();
        });
    }

    showLoginForm() {
        if (this.loginForm) this.loginForm.style.display = 'block';
        if (this.registerForm) this.registerForm.style.display = 'none';

        const modalTitle = document.getElementById('auth-modal-title');
        if (modalTitle) modalTitle.textContent = 'Вхід у систему';
    }

    showRegisterForm() {
        if (this.loginForm) this.loginForm.style.display = 'none';
        if (this.registerForm) this.registerForm.style.display = 'block';

        const modalTitle = document.getElementById('auth-modal-title');
        if (modalTitle) modalTitle.textContent = 'Реєстрація';
    }

    async handleLogin() {
        const email = this.loginForm.querySelector('input[name="email"]').value;
        const password = this.loginForm.querySelector('input[name="password"]').value;

        this.showLoader();

        const result = await auth.login(email, password);

        this.hideLoader();

        if (result.success) {
            this.showToast('Вхід успішний! Ласкаво просимо!', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async handleRegister() {
        const name = this.registerForm.querySelector('input[name="name"]').value;
        const email = this.registerForm.querySelector('input[name="email"]').value;
        const password = this.registerForm.querySelector('input[name="password"]').value;
        const passwordConfirm = this.registerForm.querySelector('input[name="password-confirm"]').value;

        if (password !== passwordConfirm) {
            this.showToast('Паролі не співпадають!', 'error');
            return;
        }

        this.showLoader();

        const result = await auth.register(email, password, name);

        this.hideLoader();

        if (result.success) {
            this.showToast('Реєстрація успішна! Вітаємо!', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    }

    showAuthModal() {
        if (this.authModal) {
            this.authModal.style.display = 'flex';
            this.showLoginForm();
        }
    }

    hideAuthModal() {
        if (this.authModal) {
            this.authModal.style.display = 'none';
        }
    }

    async showApp() {
        if (this.appLoader) this.appLoader.style.display = 'none';
        if (this.appContainer) this.appContainer.style.display = 'block';

        await this.loadComponents();

        router.init();

        await this.initializeBookshelf();

        console.log('✅ Додаток завантажено');
    }

    async initializeBookshelf() {
        try {
            const { default: Bookshelf } = await import('./modules/Bookshelf/Bookshelf.js');
            const bookshelf = new Bookshelf();
            await bookshelf.init();

            window.bookshelf = bookshelf;

        } catch (error) {
            console.error('❌ Помилка ініціалізації Bookshelf:', error);
        }
    }

    hideApp() {
        if (this.appContainer) this.appContainer.style.display = 'none';
    }

    showLoader() {
        if (this.appLoader) this.appLoader.style.display = 'flex';
    }

    hideLoader() {
        if (this.appLoader) this.appLoader.style.display = 'none';
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});