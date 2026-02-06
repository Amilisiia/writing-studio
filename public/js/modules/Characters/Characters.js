import eventBus from '../../core/EventBus.js';
import bookService from '../../services/BookService.js';
import characterService from '../../services/CharacterService.js';

export class Characters {
    constructor() {
        this.container = null;
        this.currentBook = null;
        this.characters = [];
        this.filteredCharacters = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
    }

    async init(container) {
        console.log('[Characters] Ініціалізація модуля персонажів');
        this.container = container;

        try {
            const response = await fetch('/pages/characters.html');
            const html = await response.text();
            this.container.innerHTML = html;

            this.initElements();

            this.initEventHandlers();

            this.subscribeToEvents();

            await this.loadCurrentBook();

            console.log('[Characters] Модуль успішно ініціалізовано');
        } catch (error) {
            console.error('[Characters] Помилка ініціалізації:', error);
        }
    }

    initElements() {
        this.elements = {
            filterButtons: document.querySelectorAll('.filter-btn'),
            searchInput: document.getElementById('characterSearch'),

            charactersList: document.getElementById('charactersList'),

            addCharacterBtn: document.getElementById('addCharacterBtn'),

            characterModal: document.getElementById('characterModal'),
            characterForm: document.getElementById('characterForm'),

            characterName: document.getElementById('characterName'),
            characterRole: document.getElementById('characterRole'),
            characterAge: document.getElementById('characterAge'),
            characterOccupation: document.getElementById('characterOccupation'),
            characterDescription: document.getElementById('characterDescription'),
            characterAppearance: document.getElementById('characterAppearance'),
            characterPersonality: document.getElementById('characterPersonality'),
            characterGoals: document.getElementById('characterGoals'),
            characterBackstory: document.getElementById('characterBackstory'),

            totalCount: document.getElementById('totalCount'),
            protagonistCount: document.getElementById('protagonistCount'),
            antagonistCount: document.getElementById('antagonistCount'),
            secondaryCount: document.getElementById('secondaryCount')
        };
    }

    initEventHandlers() {
        this.elements.addCharacterBtn.addEventListener('click', () => {
            this.showCharacterModal();
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
        const modal = this.elements.characterModal;

        document.getElementById('closeCharacterModal').addEventListener('click', () => {
            this.hideCharacterModal();
        });

        document.getElementById('cancelCharacterBtn').addEventListener('click', () => {
            this.hideCharacterModal();
        });

        document.getElementById('saveCharacterBtn').addEventListener('click', () => {
            this.saveCharacter();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideCharacterModal();
            }
        });
    }

    subscribeToEvents() {
        eventBus.on('book:selected', (book) => {
            console.log('[Characters] Отримано подію book:selected:', book);
            this.selectBook(book.id);
        });

        eventBus.on('editor:request-character', () => {
            console.log('[Characters] Отримано запит на вибір персонажа');
        });
    }

    async loadCurrentBook() {
        try {
            this.currentBook = bookService.getCurrentBook();

            if (this.currentBook) {
                await this.loadCharacters();
            } else {
                this.showEmptyState('Оберіть книгу зі списку');
            }
        } catch (error) {
            console.error('[Characters] Помилка завантаження книги:', error);
        }
    }

    async selectBook(bookId) {
        try {
            const result = await bookService.getBook(bookId);
            if (result.success) {
                this.currentBook = result.data;
                await this.loadCharacters();
            }
        } catch (error) {
            console.error('[Characters] Помилка вибору книги:', error);
        }
    }

    async loadCharacters() {
        if (!this.currentBook) return;

        try {
            this.characters = await characterService.getAll(this.currentBook.id);
            this.applyFilters();
            this.updateStats();

            console.log('[Characters] Завантажено', this.characters.length, 'персонажів');
        } catch (error) {
            console.error('[Characters] Помилка завантаження персонажів:', error);
            this.showEmptyState('Помилка завантаження персонажів');
        }
    }

    applyFilters() {
        let filtered = [...this.characters];

        filtered = characterService.filterByRole(filtered, this.currentFilter);

        filtered = characterService.searchByName(filtered, this.searchQuery);

        this.filteredCharacters = filtered;
        this.renderCharacters();
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

    renderCharacters() {
        const list = this.elements.charactersList;

        if (this.filteredCharacters.length === 0) {
            if (this.characters.length === 0) {
                this.showEmptyState('Ще немає персонажів. Додайте першого!');
            } else {
                this.showEmptyState('Персонажів не знайдено за цими фільтрами');
            }
            return;
        }

        list.innerHTML = '';

        this.filteredCharacters.forEach(character => {
            const card = this.createCharacterCard(character);
            list.appendChild(card);
        });
    }

    createCharacterCard(character) {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.dataset.characterId = character.id;

        const roleLabels = {
            protagonist: 'Головний герой',
            antagonist: 'Антагоніст',
            secondary: 'Другорядний',
            minor: 'Епізодичний'
        };

        const roleIcons = {
            protagonist: '⭐',
            antagonist: '💀',
            secondary: '👤',
            minor: '👥'
        };

        card.innerHTML = `
            <div class="character-card-header">
                <div class="character-icon">${roleIcons[character.role] || '👤'}</div>
                <div class="character-main-info">
                    <h3 class="character-name">${character.name}</h3>
                    <span class="character-role-badge ${character.role}">${roleLabels[character.role] || character.role}</span>
                </div>
                <div class="character-actions">
                    <button class="btn-icon edit-character" data-id="${character.id}" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-character" data-id="${character.id}" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="character-card-body">
                ${character.age ? `<p class="character-meta"><strong>Вік:</strong> ${character.age}</p>` : ''}
                ${character.occupation ? `<p class="character-meta"><strong>Професія:</strong> ${character.occupation}</p>` : ''}
                ${character.description ? `<p class="character-description">${character.description}</p>` : ''}
            </div>
            <div class="character-card-footer">
                <button class="btn-select-character" data-id="${character.id}">
                    Вибрати для редактора
                </button>
            </div>
        `;

        card.querySelector('.edit-character').addEventListener('click', (e) => {
            e.stopPropagation();
            this.editCharacter(character.id);
        });

        card.querySelector('.delete-character').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteCharacter(character.id);
        });

        card.querySelector('.btn-select-character').addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectCharacterForEditor(character);
        });

        return card;
    }

    showEmptyState(message) {
        this.elements.charactersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎭</div>
                <p>${message}</p>
            </div>
        `;
    }

    updateStats() {
        const stats = characterService.getStats(this.characters);

        this.elements.totalCount.textContent = stats.total;
        this.elements.protagonistCount.textContent = stats.protagonist;
        this.elements.antagonistCount.textContent = stats.antagonist;
        this.elements.secondaryCount.textContent = stats.secondary;
    }

    showCharacterModal(character = null) {
        if (!this.currentBook) {
            alert('Спочатку оберіть книгу');
            return;
        }

        this.currentCharacter = character;

        const title = character ? 'Редагувати персонажа' : 'Новий персонаж';
        document.querySelector('#characterModal .modal-header h3').textContent = title;

        if (character) {
            this.elements.characterName.value = character.name || '';
            this.elements.characterRole.value = character.role || 'secondary';
            this.elements.characterAge.value = character.age || '';
            this.elements.characterOccupation.value = character.occupation || '';
            this.elements.characterDescription.value = character.description || '';
            this.elements.characterAppearance.value = character.appearance || '';
            this.elements.characterPersonality.value = character.personality || '';
            this.elements.characterGoals.value = character.goals || '';
            this.elements.characterBackstory.value = character.backstory || '';
        } else {
            this.elements.characterForm.reset();
        }

        this.elements.characterModal.classList.add('active');
    }

    hideCharacterModal() {
        this.elements.characterModal.classList.remove('active');
        this.currentCharacter = null;
    }

    async saveCharacter() {
        const name = this.elements.characterName.value.trim();

        if (!name) {
            alert('Введіть ім\'я персонажа');
            return;
        }

        const characterData = {
            name: name,
            role: this.elements.characterRole.value,
            age: this.elements.characterAge.value.trim(),
            occupation: this.elements.characterOccupation.value.trim(),
            description: this.elements.characterDescription.value.trim(),
            appearance: this.elements.characterAppearance.value.trim(),
            personality: this.elements.characterPersonality.value.trim(),
            goals: this.elements.characterGoals.value.trim(),
            backstory: this.elements.characterBackstory.value.trim()
        };

        try {
            if (this.currentCharacter) {
                await characterService.update(this.currentBook.id, this.currentCharacter.id, characterData);
                console.log('[Characters] Персонажа оновлено');
            } else {
                await characterService.create(this.currentBook.id, characterData);
                console.log('[Characters] Персонажа створено');
            }

            await this.loadCharacters();

            this.hideCharacterModal();

        } catch (error) {
            console.error('[Characters] Помилка збереження персонажа:', error);
            alert('Помилка збереження персонажа');
        }
    }

    async editCharacter(characterId) {
        try {
            const character = await characterService.get(this.currentBook.id, characterId);
            this.showCharacterModal(character);
        } catch (error) {
            console.error('[Characters] Помилка завантаження персонажа:', error);
            alert('Помилка завантаження персонажа');
        }
    }

    async deleteCharacter(characterId) {
        if (!confirm('Ви впевнені, що хочете видалити цього персонажа?')) {
            return;
        }

        try {
            await characterService.delete(this.currentBook.id, characterId);
            await this.loadCharacters();
            console.log('[Characters] Персонажа видалено');
        } catch (error) {
            console.error('[Characters] Помилка видалення персонажа:', error);
            alert('Помилка видалення персонажа');
        }
    }

    selectCharacterForEditor(character) {
        console.log('[Characters] Відправка персонажа в редактор:', character.name);
        eventBus.emit('character:selected', character);

        alert(`Персонаж "${character.name}" відправлено в редактор!`);
    }

    destroy() {
        console.log('[Characters] Знищення модуля');

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
