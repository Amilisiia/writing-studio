import storageService from './StorageService.js';
import eventBus from '../core/EventBus.js';
import chapterService from './ChapterService.js';

class BookService {
    constructor() {
        this.collectionName = 'books';
        this.currentBook = null;
    }

    async createBook(bookData) {
        try {
            const bookId = 'book_' + Date.now();

            const book = {
                id: bookId,
                title: bookData.title || 'Нова книга',
                description: bookData.description || '',
                author: bookData.author || '',
                genre: bookData.genre || '',
                status: 'draft',
                chaptersCount: 0,
                wordsCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const result = await storageService.create(this.collectionName, bookId, book);

            if (result.success) {
                console.log('📚 Книгу створено:', book.title);
                eventBus.emit('book:created', book);
                return { success: true, book };
            } else {
                return result;
            }

        } catch (error) {
            console.error('❌ Помилка створення книги:', error);
            return { success: false, error: error.message };
        }
    }

    async getAllBooks() {
        try {
            const result = await storageService.readAll(this.collectionName);

            if (result.success) {
                const books = result.data;

                const chaptersResult = await storageService.readAll('chapters');
                const allChapters = chaptersResult.success ? chaptersResult.data : [];

                const booksWithStats = books.map(book => {
                    const bookChapters = allChapters.filter(chapter => chapter.bookId === book.id);
                    return {
                        ...book,
                        chaptersCount: bookChapters.length,
                        wordsCount: bookChapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
                    };
                });

                console.log(`📚 Завантажено ${booksWithStats.length} книг`);
                return { success: true, data: booksWithStats };
            } else {
                return result;
            }

        } catch (error) {
            console.error('❌ Помилка завантаження книг:', error);
            return { success: false, error: error.message };
        }
    }

    async getBook(bookId) {
        try {
            const result = await storageService.read(this.collectionName, bookId);

            if (result.success) {
                this.currentBook = result.data;
                console.log('📖 Книгу завантажено:', result.data.title);
                eventBus.emit('book:loaded', result.data);
                return result;
            } else {
                return result;
            }

        } catch (error) {
            console.error('❌ Помилка завантаження книги:', error);
            return { success: false, error: error.message };
        }
    }

    async updateBook(bookId, updates) {
        try {
            const dataToUpdate = {
                ...updates,
                updatedAt: new Date().toISOString()
            };

            const result = await storageService.update(
                this.collectionName,
                bookId,
                dataToUpdate
            );

            if (result.success) {
                console.log('📝 Книгу оновлено:', bookId);
                eventBus.emit('book:updated', { bookId, updates });
                return result;
            } else {
                return result;
            }

        } catch (error) {
            console.error('❌ Помилка оновлення книги:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteBook(bookId) {
        try {
            const chaptersResult = await storageService.readAll('chapters');
            if (chaptersResult.success) {
                const bookChapters = chaptersResult.data.filter(ch => ch.bookId === bookId);

                for (const chapter of bookChapters) {
                    await storageService.delete('chapters', chapter.id);
                    console.log('🗑️ Видалено главу:', chapter.id);
                }
            }

            const result = await storageService.delete(this.collectionName, bookId);

            if (result.success) {
                console.log('🗑️ Книгу видалено:', bookId);
                eventBus.emit('book:deleted', bookId);

                if (this.currentBook && this.currentBook.id === bookId) {
                    this.currentBook = null;
                }

                return result;
            } else {
                return result;
            }

        } catch (error) {
            console.error('❌ Помилка видалення книги:', error);
            return { success: false, error: error.message };
        }
    }

    getCurrentBook() {
        return this.currentBook;
    }

    setCurrentBook(book) {
        this.currentBook = book;
        eventBus.emit('book:selected', book);
    }

    async getBookStats(bookId) {
        try {
            const result = await this.getBook(bookId);

            if (result.success) {
                const book = result.data;
                return {
                    success: true,
                    stats: {
                        chaptersCount: book.chaptersCount || 0,
                        wordsCount: book.wordsCount || 0,
                        status: book.status || 'draft',
                        lastUpdated: book.updatedAt
                    }
                };
            } else {
                return result;
            }

        } catch (error) {
            console.error('❌ Помилка отримання статистики:', error);
            return { success: false, error: error.message };
        }
    }

    async updateBookStats(bookId, stats) {
        try {
            const updates = {};

            if (stats.chaptersCount !== undefined) {
                updates.chaptersCount = stats.chaptersCount;
            }

            if (stats.wordsCount !== undefined) {
                updates.wordsCount = stats.wordsCount;
            }

            return await this.updateBook(bookId, updates);

        } catch (error) {
            console.error('❌ Помилка оновлення статистики:', error);
            return { success: false, error: error.message };
        }
    }
}

const bookService = new BookService();

export default bookService;