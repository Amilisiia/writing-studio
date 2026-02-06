import storageService from './StorageService.js';
import eventBus from '../core/EventBus.js';

class TermServiceClass {
    constructor() {
        this.collectionName = 'terms';
    }

    async getAll(bookId) {
        try {
            const result = await storageService.readAll(this.collectionName);

            if (!result.success) {
                return [];
            }

            const terms = result.data.filter(term => term.bookId === bookId);

            console.log(`[TermService] Завантажено ${terms.length} термінів для книги ${bookId}`);
            return terms;
        } catch (error) {
            console.error('[TermService] Помилка завантаження термінів:', error);
            throw error;
        }
    }

    async get(bookId, termId) {
        try {
            const result = await storageService.read(this.collectionName, termId);
            if (!result.success) {
                throw new Error('Term not found');
            }
            const term = result.data;
            console.log('[TermService] Завантажено термін:', term.name);
            return term;
        } catch (error) {
            console.error('[TermService] Помилка завантаження терміну:', error);
            throw error;
        }
    }

    async create(bookId, termData) {
        try {
            const termId = 'term_' + Date.now();

            const data = {
                bookId: bookId,
                name: termData.name || 'Новий термін',
                category: termData.category || 'other',
                description: termData.description || '',
                usage: termData.usage || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await storageService.create(this.collectionName, termId, data);

            if (!result.success) {
                throw new Error('Failed to create term');
            }

            const term = { id: termId, ...data };

            console.log('[TermService] Створено термін:', term);

            eventBus.emit('term:created', term);

            return term;
        } catch (error) {
            console.error('[TermService] Помилка створення терміну:', error);
            throw error;
        }
    }

    async update(bookId, termId, updates) {
        try {
            const data = {
                ...updates,
                updatedAt: new Date()
            };

            const result = await storageService.update(this.collectionName, termId, data);

            if (!result.success) {
                throw new Error('Failed to update term');
            }

            console.log('[TermService] Оновлено термін:', termId);

            eventBus.emit('term:updated', { id: termId, ...data });

            return { id: termId, ...data };
        } catch (error) {
            console.error('[TermService] Помилка оновлення терміну:', error);
            throw error;
        }
    }

    async delete(bookId, termId) {
        try {
            await storageService.delete(this.collectionName, termId);

            console.log('[TermService] Видалено термін:', termId);

            eventBus.emit('term:deleted', termId);
        } catch (error) {
            console.error('[TermService] Помилка видалення терміну:', error);
            throw error;
        }
    }

    filterByCategory(terms, category) {
        if (!category || category === 'all') {
            return terms;
        }
        return terms.filter(term => term.category === category);
    }

    searchByName(terms, query) {
        if (!query) {
            return terms;
        }
        const lowerQuery = query.toLowerCase();
        return terms.filter(term =>
            term.name.toLowerCase().includes(lowerQuery) ||
            (term.description && term.description.toLowerCase().includes(lowerQuery))
        );
    }

    getStats(terms) {
        const stats = {
            total: terms.length,
            place: 0,
            object: 0,
            magic: 0,
            technology: 0,
            other: 0
        };

        terms.forEach(term => {
            if (stats.hasOwnProperty(term.category)) {
                stats[term.category]++;
            }
        });

        return stats;
    }
}

const termService = new TermServiceClass();
export default termService;