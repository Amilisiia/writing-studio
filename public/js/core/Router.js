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
        console.log(`[Router] Початок ініціалізації модуля: ${route}`);

        try {
            const moduleMap = {
                'editor': '../modules/Editor/Editor.js',
                'characters': '../modules/Characters/Characters.js',
                'terms': '../modules/Terms/Terms.js',
                'timeline': '../modules/Timeline/Timeline.js'
            };

            const modulePath = moduleMap[route];
            console.log(`[Router] Шлях до модуля: ${modulePath}`);

            if (modulePath) {
                console.log(`[Router] Спроба імпорту модуля з: ${modulePath}`);

                const module = await import(modulePath);
                console.log(`[Router] Модуль імпортовано успішно:`, module);

                const ModuleClass = module.default || module.Editor || module.Characters || module.Terms || module.Timeline;

                if (!ModuleClass) {
                    console.error(`[Router] ❌ Модуль "${route}" не експортує клас`);
                    return;
                }

                console.log(`[Router] Знайдено клас модуля:`, ModuleClass);

                if (this.modules.has(route)) {
                    const oldModule = this.modules.get(route);
                    if (oldModule && typeof oldModule.destroy === 'function') {
                        oldModule.destroy();
                    }
                }

                console.log(`[Router] Створення інстансу модуля...`);
                const moduleInstance = new ModuleClass();
                this.modules.set(route, moduleInstance);
                console.log(`[Router] Інстанс створено:`, moduleInstance);

                if (typeof moduleInstance.init === 'function') {
                    console.log(`[Router] Виклик init() модуля...`);
                    await moduleInstance.init(this.contentArea);
                    console.log(`✅ Модуль "${route}" ініціалізовано`);
                } else {
                    console.warn(`[Router] ⚠️ Модуль "${route}" не має методу init()`);
                }
            } else {
                console.log(`[Router] Шлях до модуля "${route}" не знайдено в moduleMap`);
            }

        } catch (error) {
            console.error(`[Router] ❌ ПОМИЛКА ініціалізації модуля "${route}":`, error);
            console.error(`[Router] Stack trace:`, error.stack);
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