import eventBus from '../../core/EventBus.js';
import bookService from '../../services/BookService.js';
import chapterService from '../../services/ChapterService.js';

export class Editor {
    constructor() {
        this.container = null;
        this.currentBook = null;
        this.currentChapter = null;
        this.linkedCharacters = [];
        this.linkedTerms = [];
        this.linkedTimeline = [];
        this.autoSaveInterval = null;
        this.saveTimeout = null;
        this.stats = {
            words: 0,
            characters: 0,
            charactersNoSpaces: 0,
            paragraphs: 0,
            readTime: 0
        };

        this.settings = {
            autoSave: true,
            autoSaveDelay: 30000,
            dailyGoal: 1000,
            theme: 'light',
            fontSize: 16,
            lineHeight: 1.8,
            font: 'serif',
            spellCheck: true,
            typewriterMode: false
        };

        this.loadSettings();

        this.subscribeToEvents();
    }

    async init(container) {
        console.log('[Editor] Ініціалізація модуля редактора');
        this.container = container;

        try {
            const response = await fetch('/pages/editor.html');
            const html = await response.text();
            this.container.innerHTML = html;

            this.initElements();

            this.initEventHandlers();

            const savedBookId = localStorage.getItem('currentBookId');
            if (savedBookId) {
                await this.selectBook(savedBookId);

                const savedChapterId = localStorage.getItem('currentChapterId');
                if (savedChapterId) {
                    await this.onChapterSelected(savedChapterId);
                }
            }


            this.applySettings();

            if (this.settings.autoSave) {
                this.startAutoSave();
            }

            console.log('[Editor] Модуль успішно ініціалізовано');
        } catch (error) {
            console.error('[Editor] Помилка ініціалізації:', error);
        }
    }

    initElements() {
        this.elements = {
            currentBookTitle: document.getElementById('currentBookTitle'),
            textEditor: document.getElementById('textEditor'),
            chapterTitle: document.getElementById('chapterTitle'),

            chapterNumber: document.getElementById('chapterNumber'),
            chapterPOV: document.getElementById('chapterPOV'),
            chapterCharactersContainer: document.getElementById('chapterCharactersContainer'),
            linkedTermsList: document.getElementById('linkedTermsList'),
            linkedTimelinesList: document.getElementById('linkedTimelinesList'),

            chaptersOutline: document.getElementById('chaptersOutline'),

            wordCount: document.getElementById('wordCount'),
            charCount: document.getElementById('charCount'),
            readTime: document.getElementById('readTime'),
            detailedWordCount: document.getElementById('detailedWordCount'),
            detailedCharCountWith: document.getElementById('detailedCharCountWith'),
            detailedCharCountWithout: document.getElementById('detailedCharCountWithout'),
            paragraphCount: document.getElementById('paragraphCount'),

            goalProgress: document.getElementById('goalProgress'),
            currentGoal: document.getElementById('currentGoal'),
            targetGoal: document.getElementById('targetGoal'),

            saveStatus: document.getElementById('saveStatus'),
            lastSaved: document.getElementById('lastSaved'),

            sidebar: document.getElementById('editorSidebar'),

            settingsModal: document.getElementById('settingsModal'),
            newChapterModal: document.getElementById('newChapterModal'),
            selectCharacterModal: document.getElementById('selectCharacterModal'),
            characterInfoOverlay: document.getElementById('characterInfoOverlay'),
            characterInfoModal: document.getElementById('characterInfoModal'),
            selectTermModal: document.getElementById('selectTermModal'),
            termInfoOverlay: document.getElementById('termInfoOverlay'),
            termInfoModal: document.getElementById('termInfoModal'),
            selectTimelineModal: document.getElementById('selectTimelineModal'),
            timelineInfoOverlay: document.getElementById('timelineInfoOverlay'),
            timelineInfoModal: document.getElementById('timelineInfoModal')
        };
    }

    initEventHandlers() {

        document.getElementById('addChapterBtn').addEventListener('click', () => {
            this.showNewChapterModal();
        });

        this.elements.textEditor.addEventListener('input', () => {
            this.onTextChanged();
        });

        this.elements.chapterTitle.addEventListener('input', () => {
            this.scheduleAutoSave();
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveChapter();
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('toggleSidebarBtn').addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.querySelectorAll('.format-btn[data-command]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.currentTarget.dataset.command;
                this.execCommand(command);
            });
        });

        document.getElementById('headingSelect').addEventListener('change', (e) => {
            this.changeHeading(e.target.value);
        });

        document.getElementById('blockquoteBtn').addEventListener('click', () => {
            this.insertBlockquote();
        });

        document.getElementById('focusModeBtn').addEventListener('click', () => {
            this.toggleFocusMode();
        });

        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        document.getElementById('addCharacterBtn').addEventListener('click', () => {
            this.showCharacterSelector();
        });

        
        document.getElementById('addLinkedTermBtn').addEventListener('click', () => {
            this.showLinkedTermSelector();
        });

        document.getElementById('addLinkedTimelineBtn').addEventListener('click', () => {
            this.showLinkedTimelineSelector();
        });

        this.initNewChapterModal();

        this.initSettingsModal();

        this.initSelectCharacterModal();

        this.initCharacterInfoModal();

        this.initSelectTermModal();

        this.initTermInfoModal();

        this.initSelectTimelineModal();

        this.initTimelineInfoModal();

        this.initHotkeys();
    }

    initNewChapterModal() {
        const modal = this.elements.newChapterModal;

        document.getElementById('closeNewChapterBtn').addEventListener('click', () => {
            this.hideNewChapterModal();
        });

        document.getElementById('cancelNewChapterBtn').addEventListener('click', () => {
            this.hideNewChapterModal();
        });

        document.getElementById('createNewChapterBtn').addEventListener('click', () => {
            this.createNewChapter();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideNewChapterModal();
            }
        });
    }

    initSettingsModal() {
        const modal = this.elements.settingsModal;

        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.hideSettings();
        });

        document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
            this.hideSettings();
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettingsFromModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideSettings();
            }
        });

        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchSettingsTab(tabName);
            });
        });

        document.getElementById('fontSizeRange').addEventListener('input', (e) => {
            document.getElementById('fontSizeValue').textContent = e.target.value + 'px';
        });

        document.getElementById('lineHeightRange').addEventListener('input', (e) => {
            document.getElementById('lineHeightValue').textContent = e.target.value;
        });

        document.getElementById('exportTxtBtn').addEventListener('click', () => {
            this.exportChapter('txt');
        });

        document.getElementById('exportHtmlBtn').addEventListener('click', () => {
            this.exportChapter('html');
        });

        document.getElementById('exportDocxBtn').addEventListener('click', () => {
            this.exportChapter('docx');
        });
    }

    initSelectCharacterModal() {
        const modal = this.elements.selectCharacterModal;

        document.getElementById('closeSelectCharacterModal').addEventListener('click', () => {
            this.hideSelectCharacterModal();
        });

        document.getElementById('cancelSelectCharacterBtn').addEventListener('click', () => {
            this.hideSelectCharacterModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideSelectCharacterModal();
            }
        });

        document.getElementById('selectCharacterSearch').addEventListener('input', (e) => {
            this.filterSelectCharacters(e.target.value);
        });
    }

    initCharacterInfoModal() {
        document.getElementById('closeCharacterInfoModal').addEventListener('click', () => {
            this.hideCharacterInfo();
        });

        document.getElementById('closeCharacterInfoBtn').addEventListener('click', () => {
            this.hideCharacterInfo();
        });

        this.elements.characterInfoOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.characterInfoOverlay) {
                this.hideCharacterInfo();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'editCharacterBtn') {
                console.log('[Editor] Клік на кнопку Редагувати');
                this.editCurrentCharacter();
            }
        });
    }

    async loadCharactersForSelection() {
        try {
            const { default: characterService } = await import('../../services/CharacterService.js');

            const characters = await characterService.getAll(this.currentBook.id);

            this.availableCharacters = characters;
            this.renderSelectCharacters(characters);

            console.log('[Editor] Завантажено', characters.length, 'персонажів для вибору');
        } catch (error) {
            console.error('[Editor] Помилка завантаження персонажів:', error);
            this.availableCharacters = [];
            this.renderSelectCharacters([]);
        }
    }

    renderSelectCharacters(characters) {
        const list = document.getElementById('selectCharactersList');

        if (!list) return;

        list.innerHTML = '';

        if (characters.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Персонажів не знайдено</div>';
            return;
        }

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

        characters.forEach(character => {
            const card = document.createElement('div');
            card.className = 'select-character-card';
            card.dataset.characterId = character.id;

            card.innerHTML = `
            <div class="select-character-card-header">
                <div class="select-character-icon">${roleIcons[character.role] || '👤'}</div>
                <div>
                    <h4 class="select-character-name">${character.name}</h4>
                    <span class="select-character-role ${character.role}">${roleLabels[character.role] || character.role}</span>
                </div>
            </div>
            ${character.age ? `<p class="select-character-meta">Вік: ${character.age}</p>` : ''}
            ${character.occupation ? `<p class="select-character-meta">Професія: ${character.occupation}</p>` : ''}
        `;

            card.addEventListener('click', () => {
                this.addCharacterToChapter(character);
                this.hideSelectCharacterModal();
            });

            list.appendChild(card);
        });
    }

    filterSelectCharacters(query) {
        if (!this.availableCharacters) return;

        const filtered = this.availableCharacters.filter(char =>
            char.name.toLowerCase().includes(query.toLowerCase())
        );

        this.renderSelectCharacters(filtered);
    }

    hideSelectCharacterModal() {
        this.elements.selectCharacterModal.classList.remove('active');
        document.getElementById('selectCharacterSearch').value = '';
    }

    initSelectTermModal() {
        const modal = this.elements.selectTermModal;

        document.getElementById('closeSelectTermModal').addEventListener('click', () => {
            this.hideSelectTermModal();
        });

        document.getElementById('cancelSelectTermBtn').addEventListener('click', () => {
            this.hideSelectTermModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideSelectTermModal();
            }
        });

        document.getElementById('selectTermSearch').addEventListener('input', (e) => {
            this.filterSelectTerms(e.target.value);
        });
    }

    initTermInfoModal() {
        document.getElementById('closeTermInfoModal').addEventListener('click', () => {
            this.hideTermInfo();
        });

        document.getElementById('closeTermInfoBtn').addEventListener('click', () => {
            this.hideTermInfo();
        });

        this.elements.termInfoOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.termInfoOverlay) {
                this.hideTermInfo();
            }
        });
    }

    async showTermSelector() {
        if (!this.currentBook) {
            this.showToast('Спочатку оберіть книгу', 'warning');
            return;
        }

        if (!this.currentChapter) {
            this.showToast('Спочатку оберіть главу', 'warning');
            return;
        }

        console.log('[Editor] Відкриваємо вибір терміну');

        await this.loadTermsForSelection();

        this.elements.selectTermModal.classList.add('active');
    }

    async loadTermsForSelection() {
        try {
            const { default: termService } = await import('../../services/TermService.js');

            const terms = await termService.getAll(this.currentBook.id);

            this.availableTerms = terms;
            this.renderSelectTerms(terms);

            console.log('[Editor] Завантажено', terms.length, 'термінів для вибору');
        } catch (error) {
            console.error('[Editor] Помилка завантаження термінів:', error);
            this.availableTerms = [];
            this.renderSelectTerms([]);
        }
    }

    renderSelectTerms(terms) {
        const list = document.getElementById('selectTermsList');

        if (!list) return;

        list.innerHTML = '';

        if (terms.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Термінів не знайдено</div>';
            return;
        }

        const categoryLabels = {
            place: 'Місце',
            person: 'Персона',
            object: 'Об\'єкт',
            concept: 'Концепція',
            technology: 'Технологія',
            magic: 'Магія',
            organization: 'Організація',
            other: 'Інше'
        };

        terms.forEach(term => {
            const card = document.createElement('div');
            card.className = 'select-character-card';
            card.dataset.termId = term.id;

            card.innerHTML = `
            <div class="select-character-card-header">
                <div class="select-character-icon">📖</div>
                <div>
                    <h4 class="select-character-name">${term.name}</h4>
                    ${term.category ? `<span class="select-character-role">${categoryLabels[term.category] || term.category}</span>` : ''}
                </div>
            </div>
            ${term.shortDefinition ? `<p class="select-character-meta">${term.shortDefinition}</p>` : ''}
        `;

            card.addEventListener('click', () => {
                this.addTermToChapter(term);
                this.hideSelectTermModal();
            });

            list.appendChild(card);
        });
    }

    filterSelectTerms(query) {
        if (!this.availableTerms) return;

        const filtered = this.availableTerms.filter(term =>
            term.name.toLowerCase().includes(query.toLowerCase())
        );

        this.renderSelectTerms(filtered);
    }

    hideSelectTermModal() {
        this.elements.selectTermModal.classList.remove('active');
        document.getElementById('selectTermSearch').value = '';
    }

    async showLinkedTermSelector() {
        if (!this.currentBook) {
            this.showToast('Спочатку оберіть книгу', 'warning');
            return;
        }

        if (!this.currentChapter) {
            this.showToast('Спочатку оберіть главу', 'warning');
            return;
        }

        console.log('[Editor] Відкриваємо вибір терміну');

        await this.loadTermsForSelection();

        this.elements.selectTermModal.classList.add('active');
    }

    async addTermToChapter(term) {
        if (!this.currentChapter) {
            console.warn('[Editor] Немає поточної глави');
            return;
        }

        if (this.linkedTerms.find(t => t.id === term.id)) {
            this.showToast('Термін вже доданий до глави', 'info');
            return;
        }

        this.linkedTerms.push(term);
        this.renderLinkedTerms();
        await this.saveLinkedTerms();

        this.showToast(`Термін "${term.name}" додано до глави`, 'success');
    }

    async removeTermFromChapter(termId) {
        this.linkedTerms = this.linkedTerms.filter(t => t.id !== termId);
        this.renderLinkedTerms();
        await this.saveLinkedTerms();
        this.showToast('Термін видалено з глави', 'success');
    }

    renderLinkedTerms() {
        const container = this.elements.linkedTermsList;
        if (!container) return;

        container.innerHTML = '';

        this.linkedTerms.forEach(term => {
            const item = document.createElement('div');
            item.className = 'quick-access-item';
            item.dataset.termId = term.id;

            item.innerHTML = `
            <i class="fas fa-book-open"></i>
            <span>${term.name}</span>
            <button class="remove-quick" title="Видалити">×</button>
        `;

            item.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-quick')) {
                    this.showTermInfo(term);
                }
            });

            const removeBtn = item.querySelector('.remove-quick');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTermFromChapter(term.id);
            });

            container.appendChild(item);
        });
    }

    initSelectTimelineModal() {
        const modal = this.elements.selectTimelineModal;

        document.getElementById('closeSelectTimelineModal').addEventListener('click', () => {
            this.hideSelectTimelineModal();
        });

        document.getElementById('cancelSelectTimelineBtn').addEventListener('click', () => {
            this.hideSelectTimelineModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideSelectTimelineModal();
            }
        });

        document.getElementById('selectTimelineSearch').addEventListener('input', (e) => {
            this.filterSelectTimeline(e.target.value);
        });
    }

    initTimelineInfoModal() {
        document.getElementById('closeTimelineInfoModal').addEventListener('click', () => {
            this.hideTimelineInfo();
        });

        document.getElementById('closeTimelineInfoBtn').addEventListener('click', () => {
            this.hideTimelineInfo();
        });

        this.elements.timelineInfoOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.timelineInfoOverlay) {
                this.hideTimelineInfo();
            }
        });
    }

    async showLinkedTimelineSelector() {
        if (!this.currentBook) {
            this.showToast('Спочатку оберіть книгу', 'warning');
            return;
        }

        if (!this.currentChapter) {
            this.showToast('Спочатку оберіть главу', 'warning');
            return;
        }

        console.log('[Editor] Відкриваємо вибір події');

        await this.loadTimelineForSelection();

        this.elements.selectTimelineModal.classList.add('active');
    }

    async loadTimelineForSelection() {
        try {
            const { default: timelineService } = await import('../../services/TimelineService.js');

            const events = await timelineService.getAll(this.currentBook.id);

            this.availableTimeline = events;
            this.renderSelectTimeline(events);

            console.log('[Editor] Завантажено', events.length, 'подій для вибору');
        } catch (error) {
            console.error('[Editor] Помилка завантаження подій:', error);
            this.availableTimeline = [];
            this.renderSelectTimeline([]);
        }
    }

    renderSelectTimeline(events) {
        const list = document.getElementById('selectTimelineList');

        if (!list) return;

        list.innerHTML = '';

        if (events.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Подій не знайдено</div>';
            return;
        }

        events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'select-character-card';
            card.dataset.eventId = event.id;

            const dateStr = event.dateDay || event.dateMonth || event.dateYear
                ? [event.dateDay, event.dateMonth, event.dateYear].filter(Boolean).join('.')
                : 'Дата не вказана';

            card.innerHTML = `
            <div class="select-character-card-header">
                <div class="select-character-icon">🕐</div>
                <div>
                    <h4 class="select-character-name">${event.title}</h4>
                    <span class="select-character-role">${dateStr}</span>
                </div>
            </div>
            ${event.description ? `<p class="select-character-meta">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>` : ''}
        `;

            card.addEventListener('click', () => {
                this.addTimelineToChapter(event);
                this.hideSelectTimelineModal();
            });

            list.appendChild(card);
        });
    }

    filterSelectTimeline(query) {
        if (!this.availableTimeline) return;

        const filtered = this.availableTimeline.filter(event =>
            event.title.toLowerCase().includes(query.toLowerCase())
        );

        this.renderSelectTimeline(filtered);
    }

    hideSelectTimelineModal() {
        this.elements.selectTimelineModal.classList.remove('active');
        document.getElementById('selectTimelineSearch').value = '';
    }

    async showTimelineInfo(event) {
        this.currentInfoTimeline = event;

        document.getElementById('timelineInfoTitle').textContent = event.title;

        let dateStr = 'Дата не вказана';
        if (event.dateDay || event.dateMonth || event.dateYear) {
            const parts = [];
            if (event.dateDay) parts.push(event.dateDay);
            if (event.dateMonth) parts.push(event.dateMonth);
            if (event.dateYear) parts.push(event.dateYear);
            dateStr = parts.join('.');
        }

        let charactersHTML = '';
        if (event.linkedCharacters && event.linkedCharacters.length > 0) {
            try {
                const { default: characterService } = await import('../../services/CharacterService.js');

                const characters = [];
                for (const charId of event.linkedCharacters) {
                    const char = await characterService.get(this.currentBook.id, charId);
                    if (char) {
                        characters.push(char);
                    }
                }

                if (characters.length > 0) {
                    charactersHTML = `
                <div class="info-row">
                    <label>Персонажі події</label>
                    <div class="characters-tags" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                        ${characters.map(char => `
                            <span class="character-tag">
                                <i class="fas fa-user"></i>
                                ${char.name}
                            </span>
                        `).join('')}
                    </div>
                </div>
                `;
                }

                console.log('[Editor] Завантажено', characters.length, 'персонажів події');
            } catch (error) {
                console.error('[Editor] Помилка завантаження персонажів:', error);
            }
        }

        const infoBody = document.getElementById('timelineInfoBody');
        infoBody.innerHTML = `
        <div class="info-row">
            <label>Дата</label>
            <span class="badge secondary">${dateStr}</span>
        </div>
        
        ${event.description ? `
        <div class="info-row">
            <label>Опис</label>
            <p>${event.description}</p>
        </div>
        ` : ''}
        
        ${charactersHTML}
        
        ${event.location ? `
        <div class="info-row">
            <label>Локація</label>
            <p>${event.location}</p>
        </div>
        ` : ''}
    `;

        this.elements.timelineInfoOverlay.classList.add('active');
    }
    
    hideTimelineInfo() {
        this.elements.timelineInfoOverlay.classList.remove('active');
        this.currentInfoTimeline = null;
    }

    async addTimelineToChapter(event) {
        if (!this.currentChapter) {
            console.warn('[Editor] Немає поточної глави');
            return;
        }

        if (this.linkedTimeline.find(e => e.id === event.id)) {
            this.showToast('Подія вже додана до глави', 'info');
            return;
        }

        this.linkedTimeline.push(event);
        this.renderLinkedTimeline();
        await this.saveLinkedTimeline();

        this.showToast(`Подія "${event.title}" додано до глави`, 'success');
    }

    async removeTimelineFromChapter(eventId) {
        this.linkedTimeline = this.linkedTimeline.filter(e => e.id !== eventId);
        this.renderLinkedTimeline();
        await this.saveLinkedTimeline();
        this.showToast('Подію видалено з глави', 'success');
    }

    renderLinkedTimeline() {
        const container = this.elements.linkedTimelinesList;
        if (!container) return;

        container.innerHTML = '';

        this.linkedTimeline.forEach(event => {
            const item = document.createElement('div');
            item.className = 'quick-access-item';
            item.dataset.eventId = event.id;

            const dateStr = event.dateDay || event.dateMonth || event.dateYear
                ? `${event.dateDay || ''} ${event.dateMonth || ''} ${event.dateYear || ''}`.trim()
                : '';

            item.innerHTML = `
            <i class="fas fa-clock"></i>
            <span>${event.title}</span>
            <button class="remove-quick" title="Видалити">×</button>
        `;

            item.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-quick')) {
                    this.showTimelineInfo(event);
                }
            });

            const removeBtn = item.querySelector('.remove-quick');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTimelineFromChapter(event.id);
            });

            container.appendChild(item);
        });
    }

    showTermInfo(term) {
        this.currentInfoTerm = term;

        const categoryLabels = {
            place: 'Місце',
            person: 'Персона',
            object: 'Об\'єкт',
            concept: 'Концепція',
            technology: 'Технологія',
            magic: 'Магія',
            organization: 'Організація',
            other: 'Інше'
        };

        document.getElementById('termInfoName').textContent = term.name;

        const infoBody = document.getElementById('termInfoBody');
        infoBody.innerHTML = `
        ${term.category ? `
        <div class="info-row">
            <label>Категорія</label>
            <span class="badge secondary">${categoryLabels[term.category] || term.category}</span>
        </div>
        ` : ''}
        
        ${term.description ? `
        <div class="info-row">
            <label>Значення/Опис</label>
            <p>${term.description}</p>
        </div>
        ` : ''}
        
        ${term.usage ? `
        <div class="info-row">
            <label>Контекст використання</label>
            <p>${term.usage}</p>
        </div>
        ` : ''}
    `;

        this.elements.termInfoOverlay.classList.add('active');
    }

    hideTermInfo() {
        this.elements.termInfoOverlay.classList.remove('active');
        this.currentInfoTerm = null;
    }

    initHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveChapter();
            }

            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.execCommand('bold');
            }

            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                this.execCommand('italic');
            }

            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                this.execCommand('underline');
            }

            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
        });
    }

    subscribeToEvents() {
        eventBus.on('book:selected', (book) => {
            console.log('[Editor] Отримано подію book:selected:', book);
            this.selectBook(book.id);
        });

        eventBus.on('character:selected', (character) => {
            console.log('[Editor] Отримано подію character:selected:', character);
            this.insertCharacterName(character.name);
        });

        eventBus.on('term:selected', (term) => {
            console.log('[Editor] Отримано подію term:selected:', term);
            this.insertTermName(term.name);
        });

        eventBus.on('timeline:selected', (event) => {
            console.log('[Editor] Отримано подію timeline:selected:', event);
            this.insertTimelineReference(event);
        });

        eventBus.on('character:linked', (character) => {
            console.log('[Editor] Отримано персонажа для додавання:', character);
            this.addCharacterToChapter(character);
        });
    }

    async selectBook(bookId) {
        if (!bookId) return;

        if (this.currentBook && this.currentBook.id !== bookId) {
            this.currentChapter = null;
            this.elements.textEditor.innerHTML = '<p>Оберіть главу для редагування</p>';
            this.elements.chapterTitle.value = '';
            this.elements.chapterNumber.value = 1;
            this.elements.chapterPOV.value = '';
            this.linkedCharacters = [];
            this.linkedTerms = [];
            this.linkedTimeline = [];
            localStorage.removeItem('currentChapterId');

            if (this.elements.chapterCharactersContainer) {
                this.elements.chapterCharactersContainer.innerHTML = '';
            }

            if (this.elements.linkedTermsList) {
                this.elements.linkedTermsList.innerHTML = '';
            }
            if (this.elements.linkedTimelinesList) {
                this.elements.linkedTimelinesList.innerHTML = '';
            }
        }

        try {
            const result = await bookService.getBook(bookId);
            if (result.success) {
                this.currentBook = result.data;

                this.elements.currentBookTitle.textContent = this.currentBook.title;

                await this.loadChapters();


                localStorage.setItem('currentBookId', this.currentBook.id);

                console.log('[Editor] Вибрано книгу:', this.currentBook.title);
            }
        } catch (error) {
            console.error('[Editor] Помилка вибору книги:', error);
        }
    }

    async onBookSelected(bookId) {
        await this.selectBook(bookId);
    }

    async loadChapters() {
        if (!this.currentBook) return;

        try {
            const chapters = await chapterService.getAll(this.currentBook.id);

            chapters.sort((a, b) => (a.order || 0) - (b.order || 0));

            this.updateChaptersOutline(chapters);

            console.log('[Editor] Завантажено', chapters.length, 'глав');
        } catch (error) {
            console.error('[Editor] Помилка завантаження глав:', error);
        }
    }

    updateChaptersOutline(chapters) {
        const outline = this.elements.chaptersOutline;
        outline.innerHTML = '';

        chapters.forEach((chapter, index) => {
            const item = document.createElement('div');
            item.className = 'outline-item';
            item.dataset.chapterId = chapter.id;

            if (this.currentChapter && this.currentChapter.id === chapter.id) {
                item.classList.add('active');
            }

            item.innerHTML = `
                <div class="outline-header">
                    <span>${chapter.title || `Глава ${index + 1}`}</span>
                    <span class="outline-stats">${chapter.wordCount || 0} слів</span>
                    <button class="outline-delete-btn" data-chapter-id="${chapter.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            item.addEventListener('click', (e) => {
                if (!e.target.closest('.outline-delete-btn')) {
                    this.onChapterSelected(chapter.id);
                }
            });

            const deleteBtn = item.querySelector('.outline-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChapter(chapter.id);
            });

            outline.appendChild(item);
        });
    }

    async onChapterSelected(chapterId) {
        if (!chapterId) return;

        try {
            if (this.currentChapter) {
                await this.saveChapter();
            }

            this.currentChapter = await chapterService.get(this.currentBook.id, chapterId);

            this.loadChapterIntoEditor();

            document.querySelectorAll('.outline-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.chapterId === chapterId) {
                    item.classList.add('active');
                }
            });

            localStorage.setItem('currentChapterId', this.currentChapter.id);

            console.log('[Editor] Вибрано главу:', this.currentChapter.title);
        } catch (error) {
            console.error('[Editor] Помилка вибору глави:', error);
        }
    }

    loadChapterIntoEditor() {
        if (!this.currentChapter) return;

        this.elements.chapterTitle.value = this.currentChapter.title || '';

        this.elements.textEditor.innerHTML = this.currentChapter.content || '<p>Почніть писати вашу історію...</p>';

        this.elements.chapterNumber.value = this.currentChapter.order || 1;
        this.elements.chapterPOV.value = this.currentChapter.pov || '';

        this.updateStats();

        this.loadLinkedCharacters();

        this.loadLinkedTerms();

        this.loadLinkedTimeline();
    }

    showNewChapterModal() {
        if (!this.currentBook) {
            this.showToast('Спочатку оберіть книгу', 'warning');
            return;
        }

        const chapters = this.elements.chaptersOutline.querySelectorAll('.outline-item');
        const nextNumber = chapters.length + 1;

        document.getElementById('newChapterNumber').value = nextNumber;
        document.getElementById('newChapterTitle').value = '';
        document.getElementById('newChapterPOV').value = '';

        this.elements.newChapterModal.classList.add('active');
    }

    hideNewChapterModal() {
        this.elements.newChapterModal.classList.remove('active');
    }

    async createNewChapter() {
        const title = document.getElementById('newChapterTitle').value.trim();
        const number = parseInt(document.getElementById('newChapterNumber').value);
        const pov = document.getElementById('newChapterPOV').value.trim();

        if (!title) {
            this.showToast('Введіть назву глави', 'error');
            return;
        }

        try {
            const chapterData = {
                title: title,
                content: '<p></p>',
                order: number,
                pov: pov,
                wordCount: 0
            };

            const newChapter = await chapterService.create(this.currentBook.id, chapterData);

            console.log('[Editor] Створено нову главу:', newChapter);

            await this.loadChapters();

            await this.onChapterSelected(newChapter.id);

            eventBus.emit('chapter:created', { bookId: this.currentBook.id });

            await bookService.updateBook(this.currentBook.id, {
                updatedAt: new Date().toISOString()
            });

            this.hideNewChapterModal();

            this.showToast('Главу створено успішно!', 'success');
        } catch (error) {
            console.error('[Editor] Помилка створення глави:', error);
            this.showToast('Помилка створення глави', 'error');
        }
    }

    async deleteChapter(chapterId) {
        const confirmed = await this.showConfirm(
            'Видалення глави',
            'Ви впевнені, що хочете видалити цю главу? Цю дію не можна скасувати.'
        );

        if (!confirmed) {
            return;
        }

        try {
            await chapterService.delete(this.currentBook.id, chapterId);

            if (this.currentChapter && this.currentChapter.id === chapterId) {
                this.currentChapter = null;
                this.elements.textEditor.innerHTML = '<p>Оберіть главу для редагування</p>';
                this.elements.chapterTitle.value = '';
                localStorage.removeItem('currentChapterId');
            }

            await this.loadChapters();

            eventBus.emit('chapter:deleted', { bookId: this.currentBook.id });

            await bookService.updateBook(this.currentBook.id, {
                updatedAt: new Date().toISOString()
            });

            this.showToast('Главу видалено', 'success');
        } catch (error) {
            console.error('[Editor] Помилка видалення глави:', error);
            this.showToast('Помилка видалення глави', 'error');
        }
    }

    onTextChanged() {
        this.updateStats();

        this.scheduleAutoSave();
    }

    updateStats() {
        const text = this.elements.textEditor.innerText || '';

        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        this.stats.words = words.length;

        this.stats.characters = text.length;
        this.stats.charactersNoSpaces = text.replace(/\s/g, '').length;

        const paragraphs = this.elements.textEditor.querySelectorAll('p');
        this.stats.paragraphs = paragraphs.length;

        this.stats.readTime = Math.ceil(this.stats.words / 200);

        this.elements.wordCount.textContent = this.stats.words;
        this.elements.charCount.textContent = this.stats.characters;
        this.elements.readTime.textContent = this.stats.readTime + ' хв';

        this.elements.detailedWordCount.textContent = this.stats.words;
        this.elements.detailedCharCountWith.textContent = this.stats.characters;
        this.elements.detailedCharCountWithout.textContent = this.stats.charactersNoSpaces;
        this.elements.paragraphCount.textContent = this.stats.paragraphs;

        this.updateGoalProgress();
    }

    updateGoalProgress() {
        const progress = Math.min((this.stats.words / this.settings.dailyGoal) * 100, 100);
        this.elements.goalProgress.style.width = progress + '%';
        this.elements.currentGoal.textContent = this.stats.words;
        this.elements.targetGoal.textContent = this.settings.dailyGoal;
    }

    scheduleAutoSave() {
        if (!this.settings.autoSave) return;

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.elements.saveStatus.textContent = 'Не збережено';
        this.elements.saveStatus.style.color = '#ffc107';

        this.saveTimeout = setTimeout(() => {
            this.saveChapter();
        }, 3000);
    }

    async saveChapter() {
        if (!this.currentChapter) return;

        try {
            this.currentChapter.title = this.elements.chapterTitle.value;
            this.currentChapter.content = this.elements.textEditor.innerHTML;
            this.currentChapter.order = parseInt(this.elements.chapterNumber.value);
            this.currentChapter.pov = this.elements.chapterPOV.value;
            this.currentChapter.wordCount = this.stats.words;

            await chapterService.update(this.currentBook.id, this.currentChapter.id, this.currentChapter);

            this.elements.saveStatus.textContent = 'Збережено';
            this.elements.saveStatus.style.color = '#28a745';

            const now = new Date();
            this.elements.lastSaved.textContent = now.toLocaleTimeString('uk-UA');

            await this.loadChapters();

            await bookService.updateBook(this.currentBook.id, {
                updatedAt: new Date().toISOString()
            });

            console.log('[Editor] Главу збережено');
        } catch (error) {
            console.error('[Editor] Помилка збереження:', error);
            this.elements.saveStatus.textContent = 'Помилка збереження';
            this.elements.saveStatus.style.color = '#dc3545';
        }
    }

    startAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            if (this.currentChapter) {
                this.saveChapter();
            }
        }, this.settings.autoSaveDelay);

        console.log('[Editor] Автозбереження запущено');
    }

    execCommand(command, value = null) {
        document.execCommand(command, false, value);
        this.elements.textEditor.focus();
    }

    changeHeading(tag) {
        if (tag === 'p') {
            this.execCommand('formatBlock', 'p');
        } else {
            this.execCommand('formatBlock', tag);
        }
    }

    insertBlockquote() {
        this.execCommand('formatBlock', 'blockquote');
    }

    requestCharacter() {
        eventBus.emit('editor:request-character');
    }

    requestTerm() {
        eventBus.emit('editor:request-term');
    }

    requestTimelineEvent() {
        console.log('[Editor] Запит події з хронології');
        eventBus.emit('editor:request-timeline');
    }

    insertCharacterName(name) {
        const span = `<span class="character-mention">${name}</span>&nbsp;`;
        this.execCommand('insertHTML', span);
    }

    insertTermName(name) {
        const span = `<span class="term-mention">${name}</span>&nbsp;`;
        this.execCommand('insertHTML', span);
    }

    insertTimelineReference(event) {
        const formattedDate = event.dateDay || event.dateMonth || event.dateYear
            ? `${event.dateDay || ''} ${event.dateMonth || ''} ${event.dateYear || ''}`.trim()
            : 'Дата невідома';

        const reference = `<span class="timeline-mention" title="${formattedDate}">${event.title}</span>&nbsp;`;
        this.execCommand('insertHTML', reference);
    }

    async showCharacterSelector() {
        if (!this.currentBook) {
            this.showToast('Спочатку оберіть книгу', 'warning');
            return;
        }

        if (!this.currentChapter) {
            this.showToast('Спочатку оберіть главу', 'warning');
            return;
        }

        console.log('[Editor] Відкриваємо вибір персонажа');

        await this.loadCharactersForSelection();

        this.elements.selectCharacterModal.classList.add('active');
    }

    async addCharacterToChapter(character) {
        if (!this.currentChapter) {
            console.warn('[Editor] Немає поточної глави');
            return;
        }

        if (this.linkedCharacters.find(c => c.id === character.id)) {
            this.showToast('Персонаж вже доданий до глави', 'info');
            return;
        }

        this.linkedCharacters.push(character);

        this.renderLinkedCharacters();

        await this.saveLinkedCharacters();

        this.showToast(`Персонаж "${character.name}" додано до глави`, 'success');
    }

    renderLinkedCharacters() {
        const container = this.elements.chapterCharactersContainer;
        if (!container) return;

        container.innerHTML = '';

        this.linkedCharacters.forEach(character => {
            const item = document.createElement('div');
            item.className = 'linked-item';
            item.dataset.characterId = character.id;

            item.innerHTML = `
            <i class="fas fa-user"></i>
            <span>${character.name}</span>
            <button class="remove-link" title="Видалити">×</button>
        `;

            item.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-link')) {
                    this.showCharacterInfo(character);
                }
            });

            const removeBtn = item.querySelector('.remove-link');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeCharacterFromChapter(character.id);
            });

            container.appendChild(item);
        });
    }

    async removeCharacterFromChapter(characterId) {
        this.linkedCharacters = this.linkedCharacters.filter(c => c.id !== characterId);

        this.renderLinkedCharacters();

        await this.saveLinkedCharacters();

        this.showToast('Персонажа видалено з глави', 'success');
    }

    async saveLinkedCharacters() {
        if (!this.currentChapter) return;

        const characterIds = this.linkedCharacters.map(c => c.id);

        try {
            await chapterService.update(this.currentBook.id, this.currentChapter.id, {
                linkedCharacters: characterIds
            });

            console.log('[Editor] Персонажі глави збережено:', characterIds);
        } catch (error) {
            console.error('[Editor] Помилка збереження персонажів:', error);
        }
    }

    async loadLinkedCharacters() {
        if (!this.currentChapter || !this.currentChapter.linkedCharacters) {
            this.linkedCharacters = [];
            this.renderLinkedCharacters();
            return;
        }

        try {
            const { default: characterService } = await import('../../services/CharacterService.js');

            const characters = [];
            for (const charId of this.currentChapter.linkedCharacters) {
                const char = await characterService.get(this.currentBook.id, charId);
                if (char) {
                    characters.push(char);
                }
            }

            this.linkedCharacters = characters;
            this.renderLinkedCharacters();

            console.log('[Editor] Завантажено', characters.length, 'персонажів глави');
        } catch (error) {
            console.error('[Editor] Помилка завантаження персонажів:', error);
            this.linkedCharacters = [];
            this.renderLinkedCharacters();
        }
    }

    showCharacterInfo(character) {
        this.currentInfoCharacter = character;

        const roleLabels = {
            protagonist: 'Головний герой',
            antagonist: 'Антагоніст',
            secondary: 'Другорядний',
            minor: 'Епізодичний'
        };

        document.getElementById('characterInfoName').textContent = character.name;

        const infoBody = document.getElementById('characterInfoBody');
        infoBody.innerHTML = `
        <div class="info-row">
            <label>Роль</label>
            <span class="badge ${character.role}">${roleLabels[character.role] || character.role}</span>
        </div>
        
        ${character.age ? `
        <div class="info-row">
            <label>Вік</label>
            <p>${character.age}</p>
        </div>
        ` : ''}
        
        ${character.occupation ? `
        <div class="info-row">
            <label>Професія</label>
            <p>${character.occupation}</p>
        </div>
        ` : ''}
        
        ${character.description ? `
        <div class="info-row">
            <label>Опис</label>
            <p>${character.description}</p>
        </div>
        ` : ''}
        
        ${character.appearance ? `
        <div class="info-row">
            <label>Зовнішність</label>
            <p>${character.appearance}</p>
        </div>
        ` : ''}
        
        ${character.personality ? `
        <div class="info-row">
            <label>Характер</label>
            <p>${character.personality}</p>
        </div>
        ` : ''}
        
        ${character.goals ? `
        <div class="info-row">
            <label>Цілі</label>
            <p>${character.goals}</p>
        </div>
        ` : ''}
        
        ${character.backstory ? `
        <div class="info-row">
            <label>Передісторія</label>
            <p>${character.backstory}</p>
        </div>
        ` : ''}
    `;

        this.elements.characterInfoOverlay.classList.add('active');
    }

    hideCharacterInfo() {
        this.elements.characterInfoOverlay.classList.remove('active');
        this.currentInfoCharacter = null;
    }

    editCurrentCharacter() {
        if (!this.currentInfoCharacter) return;

        const characterToEdit = this.currentInfoCharacter;

        console.log('[Editor] Зберігаємо ID персонажа для редагування:', characterToEdit.id);

        localStorage.setItem('editCharacterId', characterToEdit.id);

        this.hideCharacterInfo();

        window.location.hash = '#characters';
    }

    async saveLinkedTerms() {
        if (!this.currentChapter) return;

        const termIds = this.linkedTerms.map(t => t.id);

        try {
            await chapterService.update(this.currentBook.id, this.currentChapter.id, {
                linkedTerms: termIds
            });

            console.log('[Editor] Терміни глави збережено:', termIds);
        } catch (error) {
            console.error('[Editor] Помилка збереження термінів:', error);
        }
    }

    async loadLinkedTerms() {
        if (!this.currentChapter || !this.currentChapter.linkedTerms) {
            this.linkedTerms = [];
            this.renderLinkedTerms();
            return;
        }

        try {
            const { default: termService } = await import('../../services/TermService.js');

            const terms = [];
            for (const termId of this.currentChapter.linkedTerms) {
                const term = await termService.get(this.currentBook.id, termId);
                if (term) {
                    terms.push(term);
                }
            }

            this.linkedTerms = terms;
            this.renderLinkedTerms();

            console.log('[Editor] Завантажено', terms.length, 'термінів глави');
        } catch (error) {
            console.error('[Editor] Помилка завантаження термінів:', error);
            this.linkedTerms = [];
            this.renderLinkedTerms();
        }
    }

    async saveLinkedTimeline() {
        if (!this.currentChapter) return;

        const eventIds = this.linkedTimeline.map(e => e.id);

        try {
            await chapterService.update(this.currentBook.id, this.currentChapter.id, {
                linkedTimeline: eventIds
            });

            console.log('[Editor] Події глави збережено:', eventIds);
        } catch (error) {
            console.error('[Editor] Помилка збереження подій:', error);
        }
    }

    async loadLinkedTimeline() {
        if (!this.currentChapter || !this.currentChapter.linkedTimeline) {
            this.linkedTimeline = [];
            this.renderLinkedTimeline();
            return;
        }

        try {
            const { default: timelineService } = await import('../../services/TimelineService.js');

            const events = [];
            for (const eventId of this.currentChapter.linkedTimeline) {
                const event = await timelineService.get(this.currentBook.id, eventId);
                if (event) {
                    events.push(event);
                }
            }

            this.linkedTimeline = events;
            this.renderLinkedTimeline();

            console.log('[Editor] Завантажено', events.length, 'подій глави');
        } catch (error) {
            console.error('[Editor] Помилка завантаження подій:', error);
            this.linkedTimeline = [];
            this.renderLinkedTimeline();
        }
    }

    toggleSidebar() {
        this.elements.sidebar.classList.toggle('hidden');
    }

    toggleFocusMode() {
        document.querySelector('.editor-page').classList.toggle('focus-mode');
    }

    toggleFullscreen() {
        const editorPage = document.querySelector('.editor-page');

        if (!document.fullscreenElement) {
            editorPage.requestFullscreen();
            editorPage.classList.add('fullscreen');
        } else {
            document.exitFullscreen();
            editorPage.classList.remove('fullscreen');
        }
    }

    showSettings() {
        document.getElementById('themeSelect').value = this.settings.theme;
        document.getElementById('fontSelect').value = this.settings.font;
        document.getElementById('fontSizeRange').value = this.settings.fontSize;
        document.getElementById('fontSizeValue').textContent = this.settings.fontSize + 'px';
        document.getElementById('lineHeightRange').value = this.settings.lineHeight;
        document.getElementById('lineHeightValue').textContent = this.settings.lineHeight;
        document.getElementById('autoSaveCheckbox').checked = this.settings.autoSave;
        document.getElementById('spellCheckCheckbox').checked = this.settings.spellCheck;
        document.getElementById('typewriterModeCheckbox').checked = this.settings.typewriterMode;
        document.getElementById('dailyGoalInput').value = this.settings.dailyGoal;

        this.elements.settingsModal.classList.add('active');
    }

    hideSettings() {
        this.elements.settingsModal.classList.remove('active');
    }

    switchSettingsTab(tabName) {
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        document.querySelector(`.settings-tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Panel`).classList.add('active');
    }

    saveSettingsFromModal() {
        this.settings.theme = document.getElementById('themeSelect').value;
        this.settings.font = document.getElementById('fontSelect').value;
        this.settings.fontSize = parseInt(document.getElementById('fontSizeRange').value);
        this.settings.lineHeight = parseFloat(document.getElementById('lineHeightRange').value);
        this.settings.autoSave = document.getElementById('autoSaveCheckbox').checked;
        this.settings.spellCheck = document.getElementById('spellCheckCheckbox').checked;
        this.settings.typewriterMode = document.getElementById('typewriterModeCheckbox').checked;
        this.settings.dailyGoal = parseInt(document.getElementById('dailyGoalInput').value);

        this.applySettings();

        this.saveSettings();

        this.hideSettings();

        this.showToast('Налаштування збережено', 'success');
    }

    applySettings() {
        document.body.className = `theme-${this.settings.theme}`;

        const fontFamily = {
            'serif': 'Georgia, "Times New Roman", serif',
            'sans': '"Helvetica Neue", Arial, sans-serif',
            'mono': '"Courier New", Courier, monospace'
        };
        this.elements.textEditor.style.fontFamily = fontFamily[this.settings.font];

        this.elements.textEditor.style.fontSize = this.settings.fontSize + 'px';

        this.elements.textEditor.style.lineHeight = this.settings.lineHeight;

        this.elements.textEditor.spellcheck = this.settings.spellCheck;

        if (this.settings.typewriterMode) {
            this.elements.textEditor.classList.add('typewriter-mode');
        } else {
            this.elements.textEditor.classList.remove('typewriter-mode');
        }

        if (this.settings.autoSave) {
            this.startAutoSave();
        } else if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }

        this.updateGoalProgress();
    }

    saveSettings() {
        localStorage.setItem('editor-settings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('editor-settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (error) {
                console.error('[Editor] Помилка завантаження налаштувань:', error);
            }
        }
    }

    async exportChapter(format) {
        if (!this.currentChapter) {
            this.showToast('Оберіть главу для експорту', 'warning');
            return;
        }

        const title = this.currentChapter.title || 'Глава';
        const content = this.elements.textEditor.innerText;

        try {
            if (format === 'txt') {
                this.downloadFile(`${title}.txt`, content, 'text/plain');
            } else if (format === 'html') {
                const html = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Georgia, serif; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { text-align: center; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${this.elements.textEditor.innerHTML}
</body>
</html>`;
                this.downloadFile(`${title}.html`, html, 'text/html');
            } else if (format === 'docx') {
                this.showToast('Експорт у .DOCX буде реалізовано пізніше', 'info');
            }

            this.showToast(`Главу експортовано в ${format.toUpperCase()}`, 'success');
        } catch (error) {
            console.error('[Editor] Помилка експорту:', error);
            this.showToast('Помилка експорту', 'error');
        }
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast show';

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        toast.style.cssText = `
        background: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 400px;
        border-left: 4px solid ${colors[type]};
        animation: slideIn 0.3s ease;
    `;

        toast.innerHTML = `
        <span style="font-size: 20px;">${icons[type]}</span>
        <span style="flex: 1; color: #333; font-size: 14px;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #999;">×</button>
    `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);

        console.log(`[Editor] Toast (${type}):`, message);
    }

    showConfirm(title, message) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('confirmOverlay');
            const titleEl = document.getElementById('confirmTitle');
            const messageEl = document.getElementById('confirmMessage');
            const okBtn = document.getElementById('confirmOkBtn');
            const cancelBtn = document.getElementById('confirmCancelBtn');

            titleEl.textContent = title;
            messageEl.textContent = message;

            overlay.classList.add('active');

            const handleOk = () => {
                overlay.classList.remove('active');
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                overlay.removeEventListener('click', handleOverlay);
                resolve(true);
            };

            const handleCancel = () => {
                overlay.classList.remove('active');
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                overlay.removeEventListener('click', handleOverlay);
                resolve(false);
            };

            const handleOverlay = (e) => {
                if (e.target === overlay) {
                    handleCancel();
                }
            };

            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            overlay.addEventListener('click', handleOverlay);
        });
    }

    destroy() {
        console.log('[Editor] Знищення модуля');

        if (this.currentChapter) {
            this.saveChapter();
        }

        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
