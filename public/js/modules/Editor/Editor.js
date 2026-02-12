import eventBus from '../../core/EventBus.js';
import bookService from '../../services/BookService.js';
import chapterService from '../../services/ChapterService.js';

export class Editor {
    constructor() {
        this.container = null;
        this.currentBook = null;
        this.currentChapter = null;
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
            chapterCharacters: document.getElementById('chapterCharacters'),

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
            newChapterModal: document.getElementById('newChapterModal')
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
            this.requestCharacter();
        });

        document.getElementById('insertTermBtn').addEventListener('click', () => {
            this.requestTerm();
        });

        document.getElementById('insertTimelineBtn').addEventListener('click', () => {
            this.requestTimelineEvent();
        });

        this.initNewChapterModal();

        this.initSettingsModal();

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
    }

    async selectBook(bookId) {
        if (!bookId) return;

        if (this.currentBook && this.currentBook.id !== bookId) {
            this.currentChapter = null;
            this.elements.textEditor.innerHTML = '<p>Оберіть главу для редагування</p>';
            this.elements.chapterTitle.value = '';
            this.elements.chapterNumber.value = 1;
            this.elements.chapterPOV.value = '';
            localStorage.removeItem('currentChapterId');
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
    }

    showNewChapterModal() {
        if (!this.currentBook) {
            alert('Спочатку оберіть книгу');
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
            alert('Введіть назву глави');
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
            alert('Помилка створення глави');
        }
    }

    async deleteChapter(chapterId) {
        if (!confirm('Ви впевнені, що хочете видалити цю главу?')) {
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
            alert('Помилка видалення глави');
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
            alert('Оберіть главу для експорту');
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
                alert('Експорт у .DOCX буде реалізовано пізніше');
            }

            this.showToast(`Главу експортовано в ${format.toUpperCase()}`, 'success');
        } catch (error) {
            console.error('[Editor] Помилка експорту:', error);
            alert('Помилка експорту');
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
        console.log(`[Editor] Toast (${type}):`, message);
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
