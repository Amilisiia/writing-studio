import bookService from '../../services/BookService.js';
import chapterService from '../../services/ChapterService.js';
import eventBus from '../../core/EventBus.js';

class Bookshelf {
    constructor() {
        this.books = [];
        this.isOpen = false;
        this.isImportMode = false;
        this.importedGenres = [];
        this.importedFileData = null;
        this.isImporting = false;
    }

    async init() {
        console.log('📚 Bookshelf ініціалізується...');

        this.findElements();

        this.setupEventListeners();

        await this.loadBooks();

        console.log('✅ Bookshelf готовий');
    }

    findElements() {
        this.bookshelfToggle = document.getElementById('bookshelf-toggle');
        this.bookshelf = document.getElementById('bookshelf');
        this.booksList = document.getElementById('books-list');
        this.addBookBtn = document.getElementById('add-book-btn');
        this.importBookBtn = document.getElementById('import-book-btn');

        this.booksCountEl = document.querySelector('.library-stats .stat-number');
        this.chaptersCountEl = document.querySelectorAll('.library-stats .stat-number')[1];

        this.bookModal = document.getElementById('bookModal');
        this.bookForm = document.getElementById('bookForm');
        this.bookTitleInput = document.getElementById('bookTitle');
        this.bookAuthorInput = document.getElementById('bookAuthor');
        this.bookDescriptionInput = document.getElementById('bookDescription');

        this.selectedGenresContainer = document.getElementById('selectedGenres');
        this.addGenreBtn = document.getElementById('addGenreBtn');
        this.genreSelectModal = document.getElementById('genreSelectModal');
        this.genresGrid = document.getElementById('genresGrid');
        this.selectedGenres = [];

        this.bookDetailsModal = document.getElementById('bookDetailsModal');
        this.detailsBookTitle = document.getElementById('detailsBookTitle');
        this.detailsBookAuthor = document.getElementById('detailsBookAuthor');
        this.detailsBookGenre = document.getElementById('detailsBookGenre');
        this.detailsBookDescription = document.getElementById('detailsBookDescription');
        this.detailsBookCreated = document.getElementById('detailsBookCreated');
        this.detailsBookUpdated = document.getElementById('detailsBookUpdated');

        this.confirmDeleteBookOverlay = document.getElementById('confirmDeleteBookOverlay');
        this.confirmDeleteBookMessage = document.getElementById('confirmDeleteBookMessage');
        this.deleteBookResolve = null;

        if (this.confirmDeleteBookOverlay) {
            this.confirmDeleteBookOverlay.style.display = 'none';
            this.confirmDeleteBookOverlay.classList.remove('active');
            console.log('[findElements] Модальне вікно підтвердження видалення ініціалізовано');
        }
    }

    setupEventListeners() {
        if (this.bookshelfToggle) {
            this.bookshelfToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }

        document.addEventListener('click', (e) => {
            if (this.isOpen &&
                this.bookshelf &&
                !this.bookshelf.contains(e.target) &&
                !this.bookshelfToggle.contains(e.target)) {
                this.close();
            }
        });

        if (this.addBookBtn) {
            this.addBookBtn.addEventListener('click', () => this.showAddBookModal());
        }

        document.getElementById('closeBookModal')?.addEventListener('click', () => {
            this.hideBookModal();
        });

        document.getElementById('cancelBookBtn')?.addEventListener('click', () => {
            this.hideBookModal();
        });

        document.getElementById('saveBookBtn')?.addEventListener('click', () => {
            this.saveBook();
        });

        this.bookModal?.addEventListener('click', (e) => {
            if (e.target === this.bookModal) {
                this.hideBookModal();
            }
        });

        document.getElementById('closeBookDetailsModal')?.addEventListener('click', () => {
            this.hideBookDetailsModal();
        });

        document.getElementById('closeDetailsBtn')?.addEventListener('click', () => {
            this.hideBookDetailsModal();
        });

        document.getElementById('editBookFromDetailsBtn')?.addEventListener('click', () => {
            console.log('[editBookFromDetailsBtn] Натиснуто кнопку редагування');
            console.log('[editBookFromDetailsBtn] currentViewingBook:', this.currentViewingBook);

            const bookToEdit = this.currentViewingBook;
            console.log('[editBookFromDetailsBtn] Збережено копію книги:', bookToEdit);

            this.hideBookDetailsModal();

            this.showBookModal(bookToEdit);
        });

        this.bookDetailsModal?.addEventListener('click', (e) => {
            if (e.target === this.bookDetailsModal) {
                this.hideBookDetailsModal();
            }
        });

        this.addGenreBtn?.addEventListener('click', () => {
            this.showGenreSelectModal();
        });

        document.getElementById('closeGenreSelectModal')?.addEventListener('click', () => {
            this.hideGenreSelectModal();
        });

        this.genreSelectModal?.addEventListener('click', (e) => {
            if (e.target === this.genreSelectModal) {
                this.hideGenreSelectModal();
            }
        });

        this.genresGrid?.querySelectorAll('.genre-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const genre = e.currentTarget.dataset.genre;
                this.toggleGenre(genre);
            });
        });

        document.getElementById('cancelDeleteBookBtn')?.addEventListener('click', () => {
            this.hideConfirmDeleteBook(false);
        });

        document.getElementById('confirmDeleteBookBtn')?.addEventListener('click', () => {
            this.hideConfirmDeleteBook(true);
        });

        document.getElementById('import-book-btn')?.addEventListener('click', () => {
            this.showImportDialog();
        });

        this.confirmDeleteBookOverlay?.addEventListener('click', (e) => {
            if (e.target === this.confirmDeleteBookOverlay) {
                this.hideConfirmDeleteBook(false);
            }
        });

        eventBus.on('book:created', () => this.loadBooks());
        eventBus.on('book:updated', () => this.loadBooks());
        eventBus.on('book:deleted', () => this.loadBooks());

        eventBus.on('chapter:created', () => {
            console.log('[Bookshelf] Отримано подію chapter:created');
            this.loadBooks();
        });

        eventBus.on('chapter:deleted', () => {
            console.log('[Bookshelf] Отримано подію chapter:deleted');
            this.loadBooks();
        });
    }

    async loadBooks() {
        try {
            const result = await bookService.getAllBooks();

            if (result.success) {
                this.books = result.data;
                this.renderBooks();
                this.updateStats();
            } else {
                console.error('❌ Помилка завантаження книг:', result.error);
                this.showToast('Помилка завантаження книг', 'error');
            }

        } catch (error) {
            console.error('❌ Помилка завантаження книг:', error);
        }
    }

    renderBooks() {
        if (!this.booksList) return;

        if (this.books.length === 0) {
            this.booksList.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #999;">
                    <i class="fas fa-book" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p>Книг поки немає</p>
                    <p style="font-size: 14px; margin-top: 10px;">Додайте вашу першу книгу!</p>
                </div>
            `;
            return;
        }

        this.booksList.innerHTML = '';

        this.books.forEach(book => {
            const bookElement = this.createBookElement(book);
            this.booksList.appendChild(bookElement);
        });
    }

    createBookElement(book) {
        const bookDiv = document.createElement('div');
        bookDiv.className = 'book-item';
        bookDiv.dataset.bookId = book.id;

        const timeAgo = this.getTimeAgo(book.updatedAt);
        const chaptersText = book.chaptersCount === 1 ? 'глава' :
            book.chaptersCount < 5 ? 'глави' : 'глав';

        bookDiv.innerHTML = `
    <div class="book-spine">
        <strong>${book.title}</strong>
        <div class="book-meta">${book.chaptersCount || 0} ${chaptersText} • Змінено ${timeAgo}</div>
    </div>
    <div class="book-actions">
        <button class="book-info-btn" data-book-id="${book.id}" title="Інформація про книгу">
            <i class="fas fa-info-circle"></i>
        </button>
        <button class="book-delete-btn" data-book-id="${book.id}" title="Видалити книгу">
            <i class="fas fa-trash"></i>
        </button>
    </div>
`;

        bookDiv.addEventListener('click', () => this.selectBook(book));

        const infoBtn = bookDiv.querySelector('.book-info-btn');
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showBookDetails(book);
        });

        const deleteBtn = bookDiv.querySelector('.book-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteBook(book);
        });

        return bookDiv;
    }

    getTimeAgo(dateValue) {
        if (!dateValue) {
            return 'Нещодавно';
        }

        const now = new Date();
        let date;

        if (dateValue.toDate && typeof dateValue.toDate === 'function') {
            date = dateValue.toDate();
        } else if (dateValue.seconds) {
            date = new Date(dateValue.seconds * 1000);
        } else {
            date = new Date(dateValue);
        }

        console.log('[getTimeAgo] Input:', dateValue);
        console.log('[getTimeAgo] Parsed date:', date);

        if (isNaN(date.getTime())) {
            return 'Нещодавно';
        }

        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        console.log('[getTimeAgo] Diff days:', diffDays);

        if (diffDays === 0) return 'Сьогодні';
        if (diffDays === 1) return 'Вчора';
        if (diffDays < 7) return `${diffDays} дні тому`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} тижні тому`;

        return `${Math.floor(diffDays / 30)} місяці тому`;
    }

    selectBook(book) {
        console.log('📖 Вибрано книгу:', book.title);
        bookService.setCurrentBook(book);
        this.showToast(`Відкрито: ${book.title}`, 'success');
        this.close();
    }

    showAddBookModal() {
        this.showBookModal(null);
    }

    showBookModal(book = null) {
        console.log('[showBookModal] ========== ПОЧАТОК ==========');
        console.log('[showBookModal] Отримано книгу:', book);

        this.currentEditingBook = book;

        const title = book ? 'Редагувати книгу' : 'Нова книга';
        const modalTitle = document.querySelector('#bookModal .modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = `📚 ${title}`;
            console.log('[showBookModal] Встановлено заголовок:', title);
        }

        if (book) {
            console.log('[showBookModal] РЕЖИМ РЕДАГУВАННЯ');
            console.log('[showBookModal] - Назва:', book.title);
            console.log('[showBookModal] - Автор:', book.author);
            console.log('[showBookModal] - Опис:', book.description);
            console.log('[showBookModal] - Жанри:', book.genres);
            console.log('[showBookModal] - Жанр (старий):', book.genre);

            if (this.bookTitleInput) {
                this.bookTitleInput.value = book.title || '';
                console.log('[showBookModal] ✅ Назву встановлено:', this.bookTitleInput.value);
            } else {
                console.error('[showBookModal] ❌ bookTitleInput не знайдено!');
            }

            if (this.bookAuthorInput) {
                this.bookAuthorInput.value = book.author || '';
                console.log('[showBookModal] ✅ Автора встановлено:', this.bookAuthorInput.value);
            } else {
                console.error('[showBookModal] ❌ bookAuthorInput не знайдено!');
            }

            if (this.bookDescriptionInput) {
                this.bookDescriptionInput.value = book.description || '';
                console.log('[showBookModal] ✅ Опис встановлено');
            } else {
                console.error('[showBookModal] ❌ bookDescriptionInput не знайдено!');
            }

            this.selectedGenres = [];
            if (book.genres && Array.isArray(book.genres)) {
                this.selectedGenres = [...book.genres];
                console.log('[showBookModal] ✅ Завантажено жанри (новий формат):', this.selectedGenres);
            } else if (book.genre) {
                this.selectedGenres = [book.genre];
                console.log('[showBookModal] ✅ Завантажено жанр (старий формат):', this.selectedGenres);
            } else {
                console.log('[showBookModal] ⚠️ Жанри відсутні');
            }

            this.renderSelectedGenres();
        } else {
            console.log('[showBookModal] РЕЖИМ СТВОРЕННЯ НОВОЇ КНИГИ');
            if (this.bookForm) {
                this.bookForm.reset();
            }
            this.renderSelectedGenres();
            this.updateGenreOptions();
        }

        this.bookModal.classList.add('active');
        console.log('[showBookModal] ========== КІНЕЦЬ ==========');
    }

    hideBookModal() {
        console.log('[hideBookModal] Закриваємо модальне вікно редагування');

        this.bookModal.classList.remove('active');
        this.currentEditingBook = null;
        this.currentViewingBook = null;
        this.selectedGenres = [];
        this.renderSelectedGenres();

        console.log('[hideBookModal] Книги та жанри скинуто');
    }

    async saveBook() {
        const title = this.bookTitleInput.value.trim();

        if (!title) {
            this.showToast('Введіть назву книги', 'error');
            return;
        }

        const bookData = {
            title: title,
            author: this.bookAuthorInput.value.trim() || 'Невідомий автор',
            genres: this.selectedGenres.length > 0 ? this.selectedGenres : ['other'],
            description: this.bookDescriptionInput.value.trim()
        };

        console.log('[saveBook] ===== ЗБЕРЕЖЕННЯ =====');
        console.log('[saveBook] this.selectedGenres:', this.selectedGenres);
        console.log('[saveBook] bookData.genres:', bookData.genres);

        try {
            let result;
            if (this.currentEditingBook) {
                result = await bookService.updateBook(this.currentEditingBook.id, bookData);
                if (result.success) {
                    this.showToast(`Книгу "${title}" оновлено!`, 'success');
                }
            } else {
                result = await bookService.createBook(bookData);
                if (result.success) {
                    this.showToast(`Книгу "${title}" створено!`, 'success');
                }
            }

            if (result.success) {
                this.hideBookModal();
                await this.loadBooks();
                this.currentViewingBook = null;
            } else {
                this.showToast('Помилка збереження книги', 'error');
            }
        } catch (error) {
            console.error('❌ Помилка збереження книги:', error);
            this.showToast('Помилка збереження книги', 'error');
        }
    }

    showBookDetails(book) {
        console.log('[showBookDetails] Показуємо деталі книги:', book);

        this.currentViewingBook = book;

        const genreLabels = {
            fantasy: '✨ Фентезі',
            scifi: '🚀 Наукова фантастика',
            mystery: '🔍 Детектив',
            romance: '💕 Романтика',
            thriller: '😱 Трилер',
            horror: '👻 Жахи',
            adventure: '🗺️ Пригоди',
            historical: '🏛️ Історична проза',
            drama: '🎭 Драма',
            comedy: '😄 Комедія',
            other: '📖 Інше'
        };

        this.detailsBookTitle.textContent = book.title || 'Без назви';
        this.detailsBookAuthor.textContent = book.author || 'Невідомий автор';

        let genresText = '—';
        if (book.genres && Array.isArray(book.genres) && book.genres.length > 0) {
            genresText = book.genres
                .map(genre => genreLabels[genre] || genre)
                .join(', ');
            console.log('[showBookDetails] Жанри (новий формат):', book.genres, '→', genresText);
        } else if (book.genre) {
            genresText = genreLabels[book.genre] || book.genre;
            console.log('[showBookDetails] Жанр (старий формат):', book.genre, '→', genresText);
        } else {
            console.log('[showBookDetails] Жанри відсутні');
        }
        this.detailsBookGenre.textContent = genresText;

        this.detailsBookDescription.textContent = book.description || 'Опис відсутній';

        if (book.createdAt) {
            const created = book.createdAt.toDate ? book.createdAt.toDate() : new Date(book.createdAt);
            this.detailsBookCreated.textContent = created.toLocaleDateString('uk-UA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            this.detailsBookCreated.textContent = '—';
        }

        if (book.updatedAt) {
            const updated = book.updatedAt.toDate ? book.updatedAt.toDate() : new Date(book.updatedAt);
            this.detailsBookUpdated.textContent = updated.toLocaleDateString('uk-UA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            this.detailsBookUpdated.textContent = '—';
        }

        this.bookDetailsModal.classList.add('active');

        console.log('[showBookDetails] Деталі відображено, currentViewingBook:', this.currentViewingBook);
    }

    hideBookDetailsModal() {
        console.log('[hideBookDetailsModal] Закриваємо модальне вікно деталей');
        console.log('[hideBookDetailsModal] currentViewingBook (до закриття):', this.currentViewingBook);

        this.bookDetailsModal.classList.remove('active');

        console.log('[hideBookDetailsModal] currentViewingBook (після закриття):', this.currentViewingBook);
    }

    async deleteBook(book) {
        console.log('[deleteBook] Запит на видалення книги:', book.title);

        const confirmed = await this.showConfirmDeleteBook(book.title);

        if (!confirmed) {
            return;
        }

        try {
            const result = await bookService.deleteBook(book.id);

            if (result.success) {
                this.showToast(`Книгу "${book.title}" видалено`, 'success');
                await this.loadBooks();
            } else {
                this.showToast('Помилка видалення книги', 'error');
            }

        } catch (error) {
            console.error('❌ Помилка видалення книги:', error);
            this.showToast('Помилка видалення книги', 'error');
        }
    }

    updateStats() {
        const totalBooks = this.books.length;
        const totalChapters = this.books.reduce((sum, book) => sum + (book.chaptersCount || 0), 0);

        if (this.booksCountEl) {
            this.booksCountEl.textContent = totalBooks;
        }

        if (this.chaptersCountEl) {
            this.chaptersCountEl.textContent = totalChapters;
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.bookshelf) {
            this.bookshelf.classList.add('open');
            this.isOpen = true;
            console.log('📂 Bookshelf відкрито');
        }
    }

    close() {
        if (this.bookshelf) {
            this.bookshelf.classList.remove('open');
            this.isOpen = false;
            console.log('📁 Bookshelf закрито');
        }
    }

    showConfirmDeleteBook(bookTitle) {
        return new Promise((resolve) => {
            this.deleteBookResolve = resolve;

            this.confirmDeleteBookMessage.innerHTML = `
            Ви впевнені, що хочете видалити книгу <strong>"${bookTitle}"</strong>?<br>
            <br>
            <strong style="color: #dc3545;">⚠️ УВАГА:</strong> Ця дія <strong>незворотна</strong>!<br>
            <br>
            Буде видалено:<br>
            • Всі глави цієї книги<br>
            • Весь текстовий вміст<br>
            • Зв'язки з персонажами та термінами<br>
            <br>
            <em style="font-size: 0.9em; color: #666;">Відновити видалену книгу буде неможливо.</em>
        `;

            this.confirmDeleteBookOverlay.style.display = 'flex';

            this.confirmDeleteBookOverlay.offsetHeight;

            this.confirmDeleteBookOverlay.classList.add('active');
        });
    }

    hideConfirmDeleteBook(confirmed) {
        this.confirmDeleteBookOverlay.classList.remove('active');

        setTimeout(() => {
            this.confirmDeleteBookOverlay.style.display = 'none';
            if (this.deleteBookResolve) {
                this.deleteBookResolve(confirmed);
                this.deleteBookResolve = null;
            }
        }, 300);
    }

    showImportDialog() {
        console.log('[showImportDialog] ====== ВІДКРИВАЄМО ІМПОРТ ======');

        const modal = document.getElementById('importBookModal');

        if (!modal) {
            console.error('[showImportDialog] ❌ Модальне вікно НЕ ЗНАЙДЕНО!');
            this.showToast('Помилка: модальне вікно імпорту не знайдено', 'error');
            return;
        }

        console.log('[showImportDialog] ✅ Модальне вікно знайдено');

        this.resetImportDialog();

        this.initImportHandlers();

        modal.classList.add('active');

        console.log('[showImportDialog] ✅ Модальне вікно показано');
        console.log('[showImportDialog] ==== КІНЕЦЬ ====');
    }

    hideImportDialog() {
        const modal = document.getElementById('importBookModal');
        if (modal) {
            modal.classList.remove('active');
            this.resetImportDialog();
        }
    }

    resetImportDialog() {
        console.log('[resetImportDialog] Скидаємо діалог імпорту');

        const fileDropZone = document.getElementById('fileDropZone');
        const importProgress = document.getElementById('importProgress');
        const importPreview = document.getElementById('importPreview');
        const confirmImportBtn = document.getElementById('confirmImportBtn');
        const fileInput = document.getElementById('fileInput');

        if (fileDropZone) fileDropZone.style.display = 'block';
        if (importProgress) importProgress.style.display = 'none';
        if (importPreview) importPreview.style.display = 'none';
        if (confirmImportBtn) confirmImportBtn.style.display = 'none';
        if (fileInput) fileInput.value = '';

        this.importedFileData = null;
        this.importedGenres = [];
        this.isImportMode = false;

        this.renderImportSelectedGenres();

        console.log('[resetImportDialog] Діалог скинуто. Жанри:', this.importedGenres);
    }

    initImportHandlers() {
        console.log('[initImportHandlers] Ініціалізація обробників імпорту');

        const selectFileBtn = document.getElementById('selectFileBtn');
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('fileDropZone');
        const closeBtn = document.getElementById('closeImportModal');
        const cancelBtn = document.getElementById('cancelImportBtn');
        const confirmBtn = document.getElementById('confirmImportBtn');
        const importSelectGenresBtn = document.getElementById('importSelectGenresBtn');

        console.log('[initImportHandlers] Елементи:', {
            selectFileBtn: !!selectFileBtn,
            fileInput: !!fileInput,
            dropZone: !!dropZone,
            closeBtn: !!closeBtn,
            cancelBtn: !!cancelBtn,
            confirmBtn: !!confirmBtn,
            importSelectGenresBtn: !!importSelectGenresBtn
        });

        if (selectFileBtn && fileInput) {
            selectFileBtn.onclick = null;
            selectFileBtn.addEventListener('click', (e) => {
                console.log('[selectFileBtn] ===== КЛІК НА КНОПКУ =====');
                e.preventDefault();
                e.stopPropagation();

                const input = document.getElementById('fileInput');
                console.log('[selectFileBtn] Input знайдено:', !!input);

                if (input) {
                    input.click();
                    console.log('[selectFileBtn] ✅ Провідник відкрито');
                }
            });
        }

        if (fileInput) {
            fileInput.onchange = null;
            fileInput.addEventListener('change', (e) => {
                console.log('[fileInput] ===== CHANGE EVENT =====');

                const file = e.target.files[0];

                if (file) {
                    console.log('[fileInput] Файл обрано:', file.name);
                    console.log('[fileInput] Розмір:', file.size, 'байт');
                    console.log('[fileInput] Тип:', file.type);

                    this.handleFileSelect(file);

                    setTimeout(() => {
                        e.target.value = '';
                        console.log('[fileInput] ✅ Input очищено');
                    }, 100);
                } else {
                    console.log('[fileInput] ⚠️ Файл не обрано');
                }
            });
        }

        if (dropZone) {
            dropZone.ondragover = null;
            dropZone.ondragleave = null;
            dropZone.ondrop = null;

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');

                const file = e.dataTransfer.files[0];
                if (file) {
                    console.log('[dropZone] Файл перетягнуто:', file.name);
                    this.handleFileSelect(file);
                }
            });
        }

        if (closeBtn) {
            closeBtn.onclick = null;
            closeBtn.addEventListener('click', () => {
                console.log('[closeBtn] Закриваємо');
                this.hideImportDialog();
            });
        }

        if (cancelBtn) {
            cancelBtn.onclick = null;
            cancelBtn.addEventListener('click', () => {
                console.log('[cancelBtn] Скасовуємо');
                this.hideImportDialog();
            });
        }

        if (confirmBtn) {
            confirmBtn.onclick = null;
            confirmBtn.addEventListener('click', () => {
                console.log('[confirmBtn] Імпортуємо');
                this.confirmImport();
            });
        }

        if (importSelectGenresBtn) {
            importSelectGenresBtn.onclick = null;
            importSelectGenresBtn.addEventListener('click', () => {
                console.log('[importSelectGenresBtn] Вибір жанрів');
                this.showGenreSelectForImport();
            });
        }

        console.log('[initImportHandlers] ✅ Всі обробники додано!');
    }

    async handleFileSelect(file) {
        console.log('[handleFileSelect] ===== ОБРОБКА ФАЙЛУ =====');
        console.log('[handleFileSelect] Файл:', file.name);
        console.log('[handleFileSelect] Тип:', file.type);
        console.log('[handleFileSelect] Розмір:', file.size);

        const extension = file.name.split('.').pop().toLowerCase();

        if (!['txt', 'md', 'html'].includes(extension)) {
            this.showToast('Непідтримуваний формат', 'error');
            return;
        }

        document.getElementById('fileDropZone').style.display = 'none';
        document.getElementById('importProgress').style.display = 'block';
        this.updateImportProgress(0, 'Читання файлу...');

        try {
            let content = '';

            if (extension === 'txt') {
                content = await this.readTextFile(file);
            } else if (extension === 'md') {
                content = await this.readMarkdownFile(file);
            } else if (extension === 'html') {
                content = await this.readHtmlFile(file);
            }

            console.log('[handleFileSelect] Контент після читання:', content.length, 'символів');
            console.log('[handleFileSelect] Перші 200 символів:', content.substring(0, 200));

            const metadata = this.extractMetadata(content, extension);

            console.log('[handleFileSelect] Метадані:', metadata);
            console.log('[handleFileSelect] Контент після витягування метаданих:', metadata.content.length, 'символів');

            const stats = {
                size: (file.size / 1024).toFixed(2),
                chars: metadata.content.length,
                words: this.countWords(metadata.content)
            };

            this.importedFileData = {
                content: metadata.content,
                fileName: file.name,
                fileType: extension,
                stats: stats,
                metadata: metadata
            };

            this.showImportPreview();

        } catch (error) {
            console.error('[handleFileSelect] Помилка:', error);
            this.showToast('Помилка читання файлу', 'error');
            this.resetImportDialog();
        }
    }

    async readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const html = `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
                resolve(html);
            };
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        });
    }

    async readMarkdownFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const markdown = e.target.result;
                const html = this.convertMarkdownToHtml(markdown);
                resolve(html);
            };
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        });
    }

    async readHtmlFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                let html = e.target.result;

                html = html.replace(/<html[^>]*>/gi, '');
                html = html.replace(/<\/html>/gi, '');
                html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
                html = html.replace(/<body[^>]*>/gi, '');
                html = html.replace(/<\/body>/gi, '');

                html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

                html = html.trim();

                resolve(html);
            };
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        });
    }

    convertMarkdownToHtml(markdown) {
        let html = markdown;

        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');

        html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
        html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

        html = html.replace(/^---$/gim, '<hr>');
        html = html.replace(/^\*\*\*$/gim, '<hr>');

        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');

        if (!html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }

        return html;
    }

    countWords(text) {
        const plainText = text.replace(/<[^>]*>/g, ' ');
        return plainText.split(/\s+/).filter(w => w.length > 0).length;
    }

    updateImportProgress(percent, message) {
        document.getElementById('importProgressBar').style.width = percent + '%';
        document.getElementById('importStatus').textContent = message;
    }

    showImportPreview() {
        document.getElementById('importProgress').style.display = 'none';
        document.getElementById('importPreview').style.display = 'block';
        document.getElementById('confirmImportBtn').style.display = 'inline-flex';

        let defaultTitle = this.importedFileData.fileName.replace(/\.(txt|html|md)$/, '');
        let defaultAuthor = '';

        if (this.importedFileData.metadata) {
            if (this.importedFileData.metadata.bookTitle) {
                defaultTitle = this.importedFileData.metadata.bookTitle;
            }
            if (this.importedFileData.metadata.author) {
                defaultAuthor = this.importedFileData.metadata.author;
            }
        }

        document.getElementById('importedBookTitle').value = defaultTitle;
        document.getElementById('importedBookAuthor').value = defaultAuthor;

        document.getElementById('importFileSize').textContent = this.importedFileData.stats.size;
        document.getElementById('importCharCount').textContent = this.importedFileData.stats.chars.toLocaleString();
        document.getElementById('importWordCount').textContent = this.importedFileData.stats.words.toLocaleString();
    }

    showGenreSelectForImport() {
        this.isImportMode = true;
        this.showGenreSelectModal();
    }

    renderImportSelectedGenres() {
        const container = document.getElementById('importSelectedGenres');
        if (!container) return;

        container.innerHTML = '';

        if (this.importedGenres.length === 0) {
            container.innerHTML = '<span style="color: var(--text-light); font-size: 12px;">Жанри не обрані</span>';
            return;
        }

        const genreLabels = {
            fantasy: 'Фентезі',
            scifi: 'Наукова фантастика',
            mystery: 'Детектив',
            romance: 'Романтика',
            thriller: 'Трилер',
            horror: 'Жахи',
            historical: 'Історична',
            adventure: 'Пригоди',
            drama: 'Драма',
            other: 'Інше'
        };

        this.importedGenres.forEach(genre => {
            const chip = document.createElement('span');
            chip.className = 'genre-chip selected';
            chip.innerHTML = `
            ${genreLabels[genre] || genre}
            <i class="fas fa-times" onclick="window.bookshelf.removeImportGenre('${genre}')"></i>
        `;
            container.appendChild(chip);
        });
    }

    removeImportGenre(genre) {
        this.importedGenres = this.importedGenres.filter(g => g !== genre);
        this.renderImportSelectedGenres();
    }

    async confirmImport() {
        if (this.isImporting) {
            console.log('[confirmImport] ⚠️ Імпорт вже виконується!');
            return;
        }

        this.isImporting = true;

        const title = document.getElementById('importedBookTitle').value.trim();
        const author = document.getElementById('importedBookAuthor').value.trim() || 'Невідомий автор';

        if (!title) {
            this.showToast('Введіть назву книги', 'warning');
            this.isImporting = false;
            return;
        }

        if (!this.importedFileData) {
            this.showToast('Файл не завантажено', 'error');
            this.isImporting = false;
            return;
        }

        document.getElementById('importPreview').style.display = 'none';
        document.getElementById('importProgress').style.display = 'block';
        this.updateImportProgress(30, 'Створення книги...');

        try {
            const bookData = {
                title: title,
                author: author,
                genres: this.importedGenres.length > 0 ? this.importedGenres : ['other'],
                description: `Імпортовано з файлу ${this.importedFileData.fileType.toUpperCase()}: ${this.importedFileData.fileName}`
            };

            console.log('[confirmImport] ===== СТВОРЕННЯ КНИГИ =====');
            console.log('[confirmImport] Дані:', bookData);

            const result = await bookService.createBook(bookData);

            console.log('[confirmImport] Результат:', result);

            if (!result.success) {
                throw new Error('Не вдалося створити книгу');
            }

            let bookId;

            if (result.data && result.data.id) {
                bookId = result.data.id;
            } else if (result.id) {
                bookId = result.id;
            } else {
                await this.loadBooks();
                const newBook = this.books.find(b => b.title === title);
                if (newBook) {
                    bookId = newBook.id;
                } else {
                    throw new Error('Не вдалося отримати ID створеної книги');
                }
            }

            console.log('[confirmImport] ✅ ID книги:', bookId);

            this.updateImportProgress(50, 'Розділення на глави...');

            const chapters = this.splitContentIntoChapters(
                this.importedFileData.content,
                this.importedFileData.fileType
            );

            console.log('[confirmImport] ===== ГЛАВИ =====');
            console.log('[confirmImport] Кількість:', chapters.length);
            chapters.forEach((ch, i) => {
                console.log(`[confirmImport] Глава ${i + 1}: "${ch.title}" (${ch.content.length} символів)`);
            });

            for (let i = 0; i < chapters.length; i++) {
                const chapter = chapters[i];

                const chapterData = {
                    title: chapter.title,
                    content: chapter.content,
                    order: i + 1,
                    wordCount: this.countWords(chapter.content)
                };

                console.log(`[confirmImport] Створюємо главу ${i + 1}: "${chapterData.title}"`);

                await chapterService.create(bookId, chapterData);

                const progress = 50 + Math.floor((i + 1) / chapters.length * 40);
                this.updateImportProgress(progress, `Створено ${i + 1} з ${chapters.length}`);
            }

            this.updateImportProgress(100, 'Готово!');

            await this.loadBooks();

            const chaptersWord = chapters.length === 1 ? 'главу' :
                chapters.length < 5 ? 'глави' : 'глав';

            this.showToast(`Книгу "${title}" успішно імпортовано! Створено ${chapters.length} ${chaptersWord}.`, 'success');

            setTimeout(() => {
                this.hideImportDialog();
                this.isImporting = false;
            }, 1500);

        } catch (error) {
            console.error('[Bookshelf] Помилка імпорту:', error);
            this.showToast(`Помилка: ${error.message}`, 'error');
            this.resetImportDialog();
            this.isImporting = false;
        }
    }

    splitContentIntoChapters(content, fileType) {
        console.log('[splitContentIntoChapters] ===== РОЗДІЛЕННЯ =====');
        console.log('[splitContentIntoChapters] Тип файлу:', fileType);
        console.log('[splitContentIntoChapters] Довжина контенту:', content.length);

        if (fileType === 'html' || fileType === 'md') {
            const chapterRegex = /<h[23][^>]*>(.*?)<\/h[23]>/gi;
            const matches = [...content.matchAll(chapterRegex)];

            console.log('[splitContentIntoChapters] Знайдено H2/H3:', matches.length);

            if (matches.length > 0) {
                const chapters = [];

                const firstMatch = matches[0];
                if (firstMatch.index > 50) {
                    const prologueContent = content.substring(0, firstMatch.index).trim();
                    console.log('[splitContentIntoChapters] Пролог:', prologueContent.substring(0, 100) + '...');

                    chapters.push({
                        title: 'Пролог',
                        content: prologueContent
                    });
                }

                matches.forEach((match, index) => {
                    const chapterTitle = match[1].replace(/<[^>]*>/g, '').trim() || `Глава ${index + 1}`;
                    const startIndex = match.index;
                    const nextMatch = matches[index + 1];
                    const endIndex = nextMatch ? nextMatch.index : content.length;
                    const chapterContent = content.substring(startIndex, endIndex).trim();

                    console.log(`[splitContentIntoChapters] Глава ${index + 1}: "${chapterTitle}" (${chapterContent.length} символів)`);

                    if (chapterContent.length > 100) {
                        chapters.push({
                            title: chapterTitle,
                            content: chapterContent
                        });
                    }
                });

                console.log('[splitContentIntoChapters] Результат:', chapters.length, 'глав');
                return chapters;
            }
        }

        if (fileType === 'txt') {
            console.log('[splitContentIntoChapters] Обробка TXT файлу...');

            const longSeparatorRegex = /^[=\-]{10,}$/gm;
            const parts = content.split(longSeparatorRegex);

            console.log('[splitContentIntoChapters] Розділено на частин:', parts.length);

            if (parts.length > 1) {
                const chapters = [];

                parts.forEach((part, index) => {
                    const trimmed = part.trim();

                    if (trimmed.length > 100) {
                        const lines = trimmed.split('\n');
                        let chapterTitle = `Глава ${index + 1}`;
                        let contentStart = 0;

                        if (lines.length > 0) {
                            const firstLine = lines[0].trim();
                            if (/^(ГЛАВА|Глава|Chapter)\s+\d+/i.test(firstLine) ||
                                (firstLine.length < 100 && firstLine.length > 3)) {
                                chapterTitle = firstLine;
                                contentStart = 1;
                            }
                        }

                        const chapterContent = lines.slice(contentStart).join('\n').trim();

                        const htmlContent = `<p>${chapterContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;

                        console.log(`[splitContentIntoChapters] Глава ${index + 1}: "${chapterTitle}" (${htmlContent.length} символів)`);

                        chapters.push({
                            title: chapterTitle,
                            content: htmlContent
                        });
                    }
                });

                if (chapters.length > 0) {
                    console.log('[splitContentIntoChapters] Результат:', chapters.length, 'глав');
                    return chapters;
                }
            }
        }

        console.log('[splitContentIntoChapters] Розділювачів не знайдено. Створюємо одну главу.');
        return [{
            title: 'Глава 1',
            content: content
        }];
    }

    extractMetadata(content, fileType) {
        console.log('[extractMetadata] Витягуємо метадані з', fileType);

        let bookTitle = null;
        let author = null;
        let cleanContent = content;

        if (fileType === 'txt') {
            const lines = content.split('\n');
            let startIndex = 0;

            if (lines.length > 0 && lines[0].trim().length > 0) {
                const firstLine = lines[0].trim();
                if (!/^[=\-]{3,}$/.test(firstLine) && firstLine.length < 100) {
                    bookTitle = firstLine;
                    startIndex = 1;
                    console.log('[extractMetadata] Назва книги (TXT):', bookTitle);
                }
            }

            for (let i = startIndex; i < Math.min(lines.length, 10); i++) {
                const line = lines[i].trim();
                const authorMatch = line.match(/^Автор:?\s*(.+)$/i);
                if (authorMatch) {
                    author = authorMatch[1].trim();
                    lines.splice(i, 1);
                    console.log('[extractMetadata] Автор (TXT):', author);
                    break;
                }
            }

            let inTOC = false;
            const cleanLines = [];

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();

                if (/^(ЗМІСТ|Зміст|CONTENTS|Contents)$/i.test(line)) {
                    inTOC = true;
                    console.log('[extractMetadata] Знайдено секцію змісту на рядку', i);
                    continue;
                }

                if (/^[=\-]{10,}$/.test(line)) {
                    if (inTOC) {
                        inTOC = false;
                        console.log('[extractMetadata] Кінець секції змісту на рядку', i);
                    }
                    continue;
                }

                if (i < 10 && /^[=\-]{3,9}$/.test(line)) {
                    continue;
                }

                if (inTOC && /^\d+\.\s+/.test(line)) {
                    continue;
                }

                if (!inTOC) {
                    cleanLines.push(lines[i]);
                }
            }

            cleanContent = cleanLines.join('\n').trim();

            cleanContent = `<p>${cleanContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;

        } else if (fileType === 'html' || fileType === 'md') {
            const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (h1Match) {
                bookTitle = h1Match[1].replace(/<[^>]*>/g, '').trim();
                console.log('[extractMetadata] Назва книги:', bookTitle);
                cleanContent = cleanContent.replace(h1Match[0], '');
            }

            const authorMatch = content.match(/<p[^>]*>.*?Автор:?\s*([^<]+)<\/p>/i);
            if (authorMatch) {
                author = authorMatch[1].trim();
                console.log('[extractMetadata] Автор:', author);
                cleanContent = cleanContent.replace(authorMatch[0], '');
            }

            const tocRegex = /<h2[^>]*>.*?(Зміст|Table of Contents|Contents).*?<\/h2>[\s\S]*?(?=<h[12]|$)/i;
            if (tocRegex.test(cleanContent)) {
                console.log('[extractMetadata] Видаляємо секцію змісту');
                cleanContent = cleanContent.replace(tocRegex, '');
            }

            cleanContent = cleanContent.replace(/<ul>[\s\S]*?\[.*?\]\(#\d+\)[\s\S]*?<\/ul>/g, '');
            cleanContent = cleanContent.replace(/\[.*?\]\(#\d+\)/g, '');

            cleanContent = cleanContent.replace(/<p>\s*<\/p>/g, '');
            cleanContent = cleanContent.replace(/<p><br><\/p>/g, '');
        }

        cleanContent = cleanContent.trim();

        console.log('[extractMetadata] Результат:');
        console.log('  - Назва:', bookTitle);
        console.log('  - Автор:', author);
        console.log('  - Довжина контенту:', cleanContent.length);

        return {
            bookTitle: bookTitle,
            author: author,
            content: cleanContent
        };
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;

        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle'
        };

        toast.innerHTML = `
            <i class="fas fa-${icons[type] || icons.success}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    showGenreSelectModal() {
        this.genreSelectModal.classList.add('active');
        this.updateGenreOptions();
    }

    hideGenreSelectModal() {
        this.genreSelectModal.classList.remove('active');

        if (this.isImportMode) {
            this.isImportMode = false;
            console.log('[hideGenreSelectModal] Режим імпорту скинуто. Обрані жанри:', this.importedGenres);
        }
    }

    updateGenreOptions() {
        console.log('[updateGenreOptions] Оновлюємо опції жанрів. Режим імпорту:', this.isImportMode);

        const genresToCheck = this.isImportMode ? this.importedGenres : this.selectedGenres;

        this.genresGrid.querySelectorAll('.genre-option').forEach(option => {
            const genre = option.dataset.genre;
            if (genresToCheck.includes(genre)) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    toggleGenre(genre) {
        console.log('[toggleGenre] Перемикання жанру:', genre, 'Режим імпорту:', this.isImportMode);

        if (this.isImportMode) {
            const importIndex = this.importedGenres.indexOf(genre);
            if (importIndex > -1) {
                this.importedGenres.splice(importIndex, 1);
            } else {
                this.importedGenres.push(genre);
            }
            console.log('[toggleGenre] Жанри імпорту оновлено:', this.importedGenres);
            this.renderImportSelectedGenres();
        } else {
            const index = this.selectedGenres.indexOf(genre);
            if (index > -1) {
                this.selectedGenres.splice(index, 1);
            } else {
                this.selectedGenres.push(genre);
            }
            console.log('[toggleGenre] Жанри книги оновлено:', this.selectedGenres);
            this.renderSelectedGenres();
        }

        this.updateGenreOptions();
    }

    removeGenre(genre) {
        const index = this.selectedGenres.indexOf(genre);
        if (index > -1) {
            this.selectedGenres.splice(index, 1);
            this.renderSelectedGenres();
        }
    }

    renderSelectedGenres() {
        const genreLabels = {
            fantasy: '✨ Фентезі',
            scifi: '🚀 Наукова фантастика',
            mystery: '🔍 Детектив',
            romance: '💕 Романтика',
            thriller: '😱 Трилер',
            horror: '👻 Жахи',
            adventure: '🗺️ Пригоди',
            historical: '🏛️ Історична проза',
            drama: '🎭 Драма',
            comedy: '😄 Комедія',
            other: '📖 Інше'
        };

        if (this.selectedGenres.length === 0) {
            this.selectedGenresContainer.innerHTML = '';
            return;
        }

        this.selectedGenresContainer.innerHTML = this.selectedGenres.map(genre => `
        <div class="genre-tag">
            <span>${genreLabels[genre] || genre}</span>
            <span class="genre-remove" onclick="window.bookshelf.removeGenre('${genre}')">
                <i class="fas fa-times"></i>
            </span>
        </div>
    `).join('');
    }
}

export default Bookshelf;