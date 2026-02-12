import bookService from '../../services/BookService.js';
import eventBus from '../../core/EventBus.js';

class Bookshelf {
    constructor() {
        this.books = [];
        this.isOpen = false;
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

        if (this.importBookBtn) {
            this.importBookBtn.addEventListener('click', () => this.importBook());
        }

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
    <button class="book-delete-btn" data-book-id="${book.id}" title="Видалити книгу">
        <i class="fas fa-trash"></i>
    </button>
    `;

        bookDiv.addEventListener('click', () => this.selectBook(book));

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
        const title = prompt('Введіть назву нової книги:');

        if (title && title.trim()) {
            this.createNewBook(title.trim());
        }
    }

    async createNewBook(title) {
        try {
            const result = await bookService.createBook({
                title: title,
                description: '',
                author: '',
                genre: ''
            });

            if (result.success) {
                this.showToast(`Книгу "${title}" створено!`, 'success');
                await this.loadBooks();
            } else {
                this.showToast('Помилка створення книги', 'error');
            }

        } catch (error) {
            console.error('❌ Помилка створення книги:', error);
            this.showToast('Помилка створення книги', 'error');
        }
    }

    async deleteBook(book) {
        const confirmed = confirm(`Ви впевнені, що хочете видалити книгу "${book.title}"?\n\nЦя дія також видалить всі глави цієї книги!`);

        if (!confirmed) return;

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

    importBook() {
        this.showToast('Функція імпорту буде додана пізніше', 'info');
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
}

export default Bookshelf;