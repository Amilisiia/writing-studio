import storageService from './StorageService.js';
import eventBus from '../core/EventBus.js';

class ChapterServiceClass {
    constructor() {
        this.collectionName = 'chapters';
    }

    async getAll(bookId) {
        try {
            const chapters = await storageService.getAll(`books/${bookId}/${this.collectionName}`);
            console.log(`[ChapterService] Завантажено ${chapters.length} глав для книги ${bookId}`);
            return chapters;
        } catch (error) {
            console.error('[ChapterService] Помилка завантаження глав:', error);
            throw error;
        }
    }

    async get(bookId, chapterId) {
        try {
            const chapter = await storageService.get(`books/${bookId}/${this.collectionName}`, chapterId);
            console.log('[ChapterService] Завантажено главу:', chapter.title);
            return chapter;
        } catch (error) {
            console.error('[ChapterService] Помилка завантаження глави:', error);
            throw error;
        }
    }

    async create(bookId, chapterData) {
        try {
            const data = {
                title: chapterData.title || 'Нова глава',
                content: chapterData.content || '<p></p>',
                order: chapterData.order || 1,
                pov: chapterData.pov || '',
                wordCount: chapterData.wordCount || 0,
                characters: chapterData.characters || [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const chapter = await storageService.create(`books/${bookId}/${this.collectionName}`, data);

            console.log('[ChapterService] Створено главу:', chapter);

            eventBus.emit('chapter:created', chapter);

            return chapter;
        } catch (error) {
            console.error('[ChapterService] Помилка створення глави:', error);
            throw error;
        }
    }

    async update(bookId, chapterId, updates) {
        try {
            const data = {
                ...updates,
                updatedAt: new Date()
            };

            const chapter = await storageService.update(`books/${bookId}/${this.collectionName}`, chapterId, data);

            console.log('[ChapterService] Оновлено главу:', chapterId);

            eventBus.emit('chapter:updated', chapter);

            return chapter;
        } catch (error) {
            console.error('[ChapterService] Помилка оновлення глави:', error);
            throw error;
        }
    }

    async delete(bookId, chapterId) {
        try {
            await storageService.delete(`books/${bookId}/${this.collectionName}`, chapterId);

            console.log('[ChapterService] Видалено главу:', chapterId);

            eventBus.emit('chapter:deleted', chapterId);
        } catch (error) {
            console.error('[ChapterService] Помилка видалення глави:', error);
            throw error;
        }
    }

    async reorderChapters(bookId, chapterIds) {
        try {
            const promises = chapterIds.map((chapterId, index) => {
                return this.update(bookId, chapterId, { order: index + 1 });
            });

            await Promise.all(promises);

            console.log('[ChapterService] Глави перенумеровано');
        } catch (error) {
            console.error('[ChapterService] Помилка перенумерації глав:', error);
            throw error;
        }
    }

    getChapterStats(content) {
        const text = content.replace(/<[^>]*>/g, ' ').trim();
        const words = text.split(/\s+/).filter(word => word.length > 0);

        return {
            wordCount: words.length,
            charCount: text.length,
            charCountNoSpaces: text.replace(/\s/g, '').length,
            readTime: Math.ceil(words.length / 200) 
        };
    }
}

const chapterService = new ChapterServiceClass();
export default chapterService;
