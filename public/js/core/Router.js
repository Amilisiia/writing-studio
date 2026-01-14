import eventBus from './EventBus.js';

class Router {
    constructor() {
        this.currentRoute = 'editor';
        this.modules = new Map();
        this.routes = {
            'editor': {
                title: '📑 Редактор',
                icon: '📑',
                module: null
            },
            'characters': {
                title: '🎭 Персонажі',
                icon: '🎭',
                module: null
            },
            'terms': {
                title: '📖 Терміни',
                icon: '📖',
                module: null
            },
            'timeline': {
                title: '⌛ Хронологія',
                icon: '⌛',
                module: null
            }
        };
    }

    init() {
        console.log('Роутер ініціалізується...');

        this.findElements();

        this.setupTabListeners();

        this.navigateTo('editor');

        console.log('Роутер готовий');
    }

    findElements() {
        this.tabs = document.querySelectorAll('.tab[data-tab]');
        this.contentArea = document.getElementById('page-content');

        if (!this.contentArea) {
            console.error('❌ Елемент #page-content не знайдено');
        }
    }

    setupTabListeners() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const route = tab.dataset.tab;
                this.navigateTo(route);
            });
        });
    }

    async navigateTo(route) {
        if (!this.routes[route]) {
            console.error(`❌ Маршрут "${route}" не знайдено`);
            return;
        }

        console.log(`🧭 Навігація до: ${route}`);

        this.updateActiveTab(route);

        this.showLoader();

        await this.loadModuleContent(route);

        this.hideLoader();

        this.currentRoute = route;

        eventBus.emit('route:changed', { route, routeData: this.routes[route] });
    }

    updateActiveTab(route) {
        this.tabs.forEach(tab => {
            if (tab.dataset.tab === route) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    async loadModuleContent(route) {
        if (!this.contentArea) {
            console.error('❌ Область вмісту не знайдено');
            return;
        }

        try {
            const response = await fetch(`pages/${route}.html`);

            if (response.ok) {
                const html = await response.text();
                this.contentArea.innerHTML = html;

                await this.initializeModule(route);

                console.log(`✅ Модуль "${route}" завантажено`);
            } else {
                this.showPlaceholder(route);
            }

        } catch (error) {
            console.error(`❌ Помилка завантаження модуля "${route}":`, error);
            this.showPlaceholder(route);
        }
    }

    async initializeModule(route) {
        try {
            const moduleMap = {
                'editor': './js/modules/Editor/Editor.js',
                'characters': './js/modules/Characters/Characters.js',
                'terms': './js/modules/Terms/Terms.js',
                'timeline': './js/modules/Timeline/Timeline.js'
            };

            const modulePath = moduleMap[route];
            if (modulePath) {
                const { default: Module } = await import(modulePath);

                if (!this.modules.has(route)) {
                    const moduleInstance = new Module();
                    this.modules.set(route, moduleInstance);
                }

                const moduleInstance = this.modules.get(route);
                if (moduleInstance && typeof moduleInstance.init === 'function') {
                    moduleInstance.init();
                }
            }

        } catch (error) {
            console.log(`ℹ️ Модуль "${route}" ще не реалізований`);
        }
    }

    showPlaceholder(route) {
        const routeData = this.routes[route];

        this.contentArea.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px;">
                <div style="font-size: 72px; margin-bottom: 20px;">${routeData.icon}</div>
                <h1 style="color: #8b4513; margin-bottom: 15px; font-size: 32px;">${routeData.title}</h1>
                <p style="color: #666; font-size: 18px; margin-bottom: 30px; max-width: 500px;">
                    Цей модуль буде реалізовано пізніше. Зараз працює тільки система навігації.
                </p>
                <div style="background: #fff8dc; padding: 20px; border-radius: 12px; border-left: 4px solid #d4af37; max-width: 600px;">
                    <p style="margin: 0;"><strong>🚧 В розробці</strong></p>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">
                        Модуль "${route}" буде додано на наступних етапах розробки.
                    </p>
                </div>
            </div>
        `;
    }

    showLoader() {
        if (this.contentArea) {
            this.contentArea.style.opacity = '0.5';
        }
    }

    hideLoader() {
        if (this.contentArea) {
            this.contentArea.style.opacity = '1';
        }
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    registerModule(route, moduleInstance) {
        this.modules.set(route, moduleInstance);
        console.log(`📦 Модуль "${route}" зареєстровано`);
    }

    getModule(route) {
        return this.modules.get(route);
    }
}

const router = new Router();

export default router;