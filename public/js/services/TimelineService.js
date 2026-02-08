import storageService from './StorageService.js';
import eventBus from '../core/EventBus.js';

class TimelineServiceClass {
    constructor() {
        this.collectionName = 'timeline';
    }

    async getAll(bookId) {
        try {
            const result = await storageService.readAll(this.collectionName);

            if (!result.success) {
                return [];
            }

            const events = result.data.filter(event => event.bookId === bookId);

            events.sort((a, b) => (a.order || 0) - (b.order || 0));

            console.log(`[TimelineService] Завантажено ${events.length} подій для книги ${bookId}`);
            return events;
        } catch (error) {
            console.error('[TimelineService] Помилка завантаження подій:', error);
            throw error;
        }
    }

    async get(bookId, eventId) {
        try {
            const result = await storageService.read(this.collectionName, eventId);
            if (!result.success) {
                throw new Error('Event not found');
            }
            const event = result.data;
            console.log('[TimelineService] Завантажено подію:', event.title);
            return event;
        } catch (error) {
            console.error('[TimelineService] Помилка завантаження події:', error);
            throw error;
        }
    }

    async create(bookId, eventData) {
        try {
            const eventId = 'event_' + Date.now();

            const data = {
                bookId: bookId,
                title: eventData.title || 'Нова подія',
                dateYear: eventData.dateYear || '',
                dateMonth: eventData.dateMonth || '',
                dateDay: eventData.dateDay || '',
                type: eventData.type || 'plot',
                description: eventData.description || '',
                characters: eventData.characters || [],
                location: eventData.location || '',
                order: eventData.order || 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await storageService.create(this.collectionName, eventId, data);

            if (!result.success) {
                throw new Error('Failed to create event');
            }

            const event = { id: eventId, ...data };

            console.log('[TimelineService] Створено подію:', event);

            eventBus.emit('timeline:created', event);

            return event;
        } catch (error) {
            console.error('[TimelineService] Помилка створення події:', error);
            throw error;
        }
    }

    async update(bookId, eventId, updates) {
        try {
            const data = {
                ...updates,
                updatedAt: new Date()
            };

            const result = await storageService.update(this.collectionName, eventId, data);

            if (!result.success) {
                throw new Error('Failed to update event');
            }

            console.log('[TimelineService] Оновлено подію:', eventId);

            eventBus.emit('timeline:updated', { id: eventId, ...data });

            return { id: eventId, ...data };
        } catch (error) {
            console.error('[TimelineService] Помилка оновлення події:', error);
            throw error;
        }
    }

    async delete(bookId, eventId) {
        try {
            await storageService.delete(this.collectionName, eventId);

            console.log('[TimelineService] Видалено подію:', eventId);

            eventBus.emit('timeline:deleted', eventId);
        } catch (error) {
            console.error('[TimelineService] Помилка видалення події:', error);
            throw error;
        }
    }

    filterByType(events, type) {
        if (!type || type === 'all') {
            return events;
        }
        return events.filter(event => event.type === type);
    }

    searchByTitle(events, query) {
        if (!query) {
            return events;
        }
        const lowerQuery = query.toLowerCase();
        return events.filter(event =>
            event.title.toLowerCase().includes(lowerQuery) ||
            (event.description && event.description.toLowerCase().includes(lowerQuery))
        );
    }

    getStats(events) {
        const stats = {
            total: events.length,
            plot: 0,
            historical: 0,
            personal: 0
        };

        events.forEach(event => {
            if (stats.hasOwnProperty(event.type)) {
                stats[event.type]++;
            }
        });

        return stats;
    }

    formatDate(event) {
        const parts = [];

        if (event.dateDay) {
            const day = event.dateDay.toString().padStart(2, '0');
            parts.push(day);
        }

        if (event.dateMonth) {
            parts.push(event.dateMonth);
        }

        if (event.dateYear) {
            parts.push(event.dateYear);
        }

        return parts.length > 0 ? parts.join('.') : 'Дата не вказана';
    }

    async reorderEvents(bookId, eventIds) {
        try {
            const promises = eventIds.map((eventId, index) => {
                return this.update(bookId, eventId, { order: index });
            });

            await Promise.all(promises);

            console.log('[TimelineService] Події перенумеровано');
        } catch (error) {
            console.error('[TimelineService] Помилка перенумерації подій:', error);
            throw error;
        }
    }
}

const timelineService = new TimelineServiceClass();
export default timelineService;
