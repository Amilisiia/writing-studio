import eventBus from '../../core/EventBus.js';
import bookService from '../../services/BookService.js';
import termService from '../../services/TermService.js';

export class Terms {
    constructor() {
        this.container = null;
        this.currentBook = null;
        this.terms = [];
        this.filteredTerms = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
    }

    async init(container) {
        console.log('[Terms] Ініціалізація модуля термінів');
        this.container = container;

        try {
            const response = await fetch('/pages/terms.html');
            const html = await response.text();
            this.container.innerHTML = html;

            this.initElements();

            this.initEventHandlers();

            this.subscribeToEvents();

            await this.loadCurrentBook();

            console.log('[Terms] Модуль успішно ініціалізовано');
        } catch (error) {
            console.error('[Terms] Помилка ініціалізації:', error);
        }
    }

    initElements() {
        this.elements = {
            filterButtons: document.querySelectorAll('.filter-btn'),
            searchInput: document.getElementById('termSearch'),

            termsList: document.getElementById('termsList'),

            addTermBtn: document.getElementById('addTermBtn'),

            termModal: document.getElementById('termModal'),
            termForm: document.getElementById('termForm'),

            termName: document.getElementById('termName'),
            termCategory: document.getElementById('termCategory'),
            termDescription: document.getElementById('termDescription'),
            termUsage: document.getElementById('termUsage'),

            totalCount: document.getElementById('totalCount'),
            placeCount: document.getElementById('placeCount'),
            objectCount: document.getElementById('objectCount'),
            magicCount: document.getElementById('magicCount'),
            technologyCount: document.getElementById('technologyCount'),
            otherCount: document.getElementById('otherCount')
        };
    }

    initEventHandlers() {
        this.elements.addTermBtn.addEventListener('click', () => {
            this.showTermModal();
        });

        this.elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });

        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.applyFilters();
        });

        this.initModalHandlers();
    }

    initModalHandlers() {
        const modal = this.elements.termModal;

        document.getElementById('closeTermModal').addEventListener('click', () => {
            this.hideTermModal();
        });

        document.getElementById('cancelTermBtn').addEventListener('click', () => {
            this.hideTermModal();
        });

        document.getElementById('saveTermBtn').addEventListener('click', () => {
            this.saveTerm();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideTermModal();
            }
        });
    }

    subscribeToEvents() {
        eventBus.on('book:selected', (book) => {
            console.log('[Terms] Отримано подію book:selected:', book);
            this.selectBook(book.id);
        });

        eventBus.on('editor:request-term', () => {
            console.log('[Terms] Отримано запит на вибір терміну');
        });
    }

    async loadCurrentBook() {
        try {
            this.currentBook = bookService.getCurrentBook();

            if (this.currentBook) {
                await this.loadTerms();
            } else {
                this.showEmptyState('Оберіть книгу зі списку');
            }
        } catch (error) {
            console.error('[Terms] Помилка завантаження книги:', error);
        }
    }

    async selectBook(bookId) {
        try {
            const result = await bookService.getBook(bookId);
            if (result.success) {
                this.currentBook = result.data;
                await this.loadTerms();
            }
        } catch (error) {
            console.error('[Terms] Помилка вибору книги:', error);
        }
    }

    async loadTerms() {
        if (!this.currentBook) return;

        try {
            this.terms = await termService.getAll(this.currentBook.id);
            this.applyFilters();
            this.updateStats();

            console.log('[Terms] Завантажено', this.terms.length, 'термінів');
        } catch (error) {
            console.error('[Terms] Помилка завантаження термінів:', error);
            this.showEmptyState('Помилка завантаження термінів');
        }
    }

    applyFilters() {
        let filtered = [...this.terms];

        filtered = termService.filterByCategory(filtered, this.currentFilter);

        filtered = termService.searchByName(filtered, this.searchQuery);

        this.filteredTerms = filtered;
        this.renderTerms();
    }

    setFilter(filter) {
        this.currentFilter = filter;

        this.elements.filterButtons.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.applyFilters();
    }

    renderTerms() {
        const list = this.elements.termsList;

        if (this.filteredTerms.length === 0) {
            if (this.terms.length === 0) {
                this.showEmptyState('Ще немає термінів. Додайте перший!');
            } else {
                this.showEmptyState('Термінів не знайдено за цими фільтрами');
            }
            return;
        }

        list.innerHTML = '';

        this.filteredTerms.forEach(term => {
            const card = this.createTermCard(term);
            list.appendChild(card);
        });
    }

    createTermCard(term) {
        const card = document.createElement('div');
        card.className = 'term-card';
        card.dataset.termId = term.id;

        const categoryLabels = {
            place: 'Місце',
            object: 'Предмет',
            magic: 'Магія',
            technology: 'Технологія',
            other: 'Інше'
        };

        const categoryIcons = {
            place: '🗺️',
            object: '📦',
            magic: '✨',
            technology: '⚙️',
            other: '📌'
        };

        card.innerHTML = `
            <div class="term-card-header">
                <div class="term-icon">${categoryIcons[term.category] || '📌'}</div>
                <div class="term-main-info">
                    <h3 class="term-name">${term.name}</h3>
                    <span class="term-category-badge ${term.category}">${categoryLabels[term.category] || term.category}</span>
                </div>
                <div class="term-actions">
                    <button class="btn-icon edit-term" data-id="${term.id}" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-term" data-id="${term.id}" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="term-card-body">
                ${term.description ? `<p class="term-description">${term.description}</p>` : ''}
                ${term.usage ? `<p class="term-usage"><strong>Контекст:</strong> ${term.usage}</p>` : ''}
            </div>
        `;

        card.querySelector('.edit-term').addEventListener('click', (e) => {
            e.stopPropagation();
            this.editTerm(term.id);
        });

        card.querySelector('.delete-term').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTerm(term.id);
        });

        return card;
    }

    showEmptyState(message) {
        this.elements.termsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <p>${message}</p>
            </div>
        `;
    }

    updateStats() {
        const stats = termService.getStats(this.terms);

        this.elements.totalCount.textContent = stats.total;
        this.elements.placeCount.textContent = stats.place;
        this.elements.objectCount.textContent = stats.object;
        this.elements.magicCount.textContent = stats.magic;
        this.elements.technologyCount.textContent = stats.technology;
        this.elements.otherCount.textContent = stats.other;
    }

    showTermModal(term = null) {
        if (!this.currentBook) {
            alert('Спочатку оберіть книгу');
            return;
        }

        this.currentTerm = term;

        const title = term ? 'Редагувати термін' : 'Новий термін';
        document.querySelector('#termModal .modal-header h3').textContent = title;

        if (term) {
            this.elements.termName.value = term.name || '';
            this.elements.termCategory.value = term.category || 'other';
            this.elements.termDescription.value = term.description || '';
            this.elements.termUsage.value = term.usage || '';
        } else {
            this.elements.termForm.reset();
        }

        this.elements.termModal.classList.add('active');
    }

    hideTermModal() {
        this.elements.termModal.classList.remove('active');
        this.currentTerm = null;
    }

    async saveTerm() {
        const name = this.elements.termName.value.trim();

        if (!name) {
            alert('Введіть назву терміну');
            return;
        }

        const termData = {
            name: name,
            category: this.elements.termCategory.value,
            description: this.elements.termDescription.value.trim(),
            usage: this.elements.termUsage.value.trim()
        };

        try {
            if (this.currentTerm) {
                await termService.update(this.currentBook.id, this.currentTerm.id, termData);
                console.log('[Terms] Термін оновлено');
            } else {
                await termService.create(this.currentBook.id, termData);
                console.log('[Terms] Термін створено');
            }

            await this.loadTerms();

            this.hideTermModal();

        } catch (error) {
            console.error('[Terms] Помилка збереження терміну:', error);
            alert('Помилка збереження терміну');
        }
    }

    async editTerm(termId) {
        try {
            const term = await termService.get(this.currentBook.id, termId);
            this.showTermModal(term);
        } catch (error) {
            console.error('[Terms] Помилка завантаження терміну:', error);
            alert('Помилка завантаження терміну');
        }
    }

    async deleteTerm(termId) {
        if (!confirm('Ви впевнені, що хочете видалити цей термін?')) {
            return;
        }

        try {
            await termService.delete(this.currentBook.id, termId);
            await this.loadTerms();
            console.log('[Terms] Термін видалено');
        } catch (error) {
            console.error('[Terms] Помилка видалення терміну:', error);
            alert('Помилка видалення терміну');
        }
    }

    destroy() {
        console.log('[Terms] Знищення модуля');

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
