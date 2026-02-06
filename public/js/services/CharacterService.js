import storageService from './StorageService.js';
import eventBus from '../core/EventBus.js';

class CharacterServiceClass {
    constructor() {
        this.collectionName = 'characters';
    }

    async getAll(bookId) {
        try {
            const result = await storageService.readAll(this.collectionName);

            if (!result.success) {
                return [];
            }

            const characters = result.data.filter(char => char.bookId === bookId);

            console.log(`[CharacterService] Завантажено ${characters.length} персонажів для книги ${bookId}`);
            return characters;
        } catch (error) {
            console.error('[CharacterService] Помилка завантаження персонажів:', error);
            throw error;
        }
    }

    async get(bookId, characterId) {
        try {
            const result = await storageService.read(this.collectionName, characterId);
            if (!result.success) {
                throw new Error('Character not found');
            }
            const character = result.data;
            console.log('[CharacterService] Завантажено персонажа:', character.name);
            return character;
        } catch (error) {
            console.error('[CharacterService] Помилка завантаження персонажа:', error);
            throw error;
        }
    }

    async create(bookId, characterData) {
        try {
            const characterId = 'character_' + Date.now();

            const data = {
                bookId: bookId,
                name: characterData.name || 'Новий персонаж',
                role: characterData.role || 'secondary',
                description: characterData.description || '',
                appearance: characterData.appearance || '',
                personality: characterData.personality || '',
                goals: characterData.goals || '',
                relationships: characterData.relationships || [],
                age: characterData.age || '',
                occupation: characterData.occupation || '',
                backstory: characterData.backstory || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await storageService.create(this.collectionName, characterId, data);

            if (!result.success) {
                throw new Error('Failed to create character');
            }

            const character = { id: characterId, ...data };

            console.log('[CharacterService] Створено персонажа:', character);

            eventBus.emit('character:created', character);

            return character;
        } catch (error) {
            console.error('[CharacterService] Помилка створення персонажа:', error);
            throw error;
        }
    }

    async update(bookId, characterId, updates) {
        try {
            const data = {
                ...updates,
                updatedAt: new Date()
            };

            const result = await storageService.update(this.collectionName, characterId, data);

            if (!result.success) {
                throw new Error('Failed to update character');
            }

            console.log('[CharacterService] Оновлено персонажа:', characterId);

            eventBus.emit('character:updated', { id: characterId, ...data });

            return { id: characterId, ...data };
        } catch (error) {
            console.error('[CharacterService] Помилка оновлення персонажа:', error);
            throw error;
        }
    }

    async delete(bookId, characterId) {
        try {
            await storageService.delete(this.collectionName, characterId);

            console.log('[CharacterService] Видалено персонажа:', characterId);

            eventBus.emit('character:deleted', characterId);
        } catch (error) {
            console.error('[CharacterService] Помилка видалення персонажа:', error);
            throw error;
        }
    }

    filterByRole(characters, role) {
        if (!role || role === 'all') {
            return characters;
        }
        return characters.filter(char => char.role === role);
    }

    searchByName(characters, query) {
        if (!query) {
            return characters;
        }
        const lowerQuery = query.toLowerCase();
        return characters.filter(char =>
            char.name.toLowerCase().includes(lowerQuery)
        );
    }

    getStats(characters) {
        const stats = {
            total: characters.length,
            protagonist: 0,
            antagonist: 0,
            secondary: 0,
            minor: 0
        };

        characters.forEach(char => {
            if (stats.hasOwnProperty(char.role)) {
                stats[char.role]++;
            }
        });

        return stats;
    }
}

const characterService = new CharacterServiceClass();
export default characterService;