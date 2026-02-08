import eventBus from '../../core/EventBus.js';
import bookService from '../../services/BookService.js';
import timelineService from '../../services/TimelineService.js';

export class Timeline {
    constructor() {
        this.container = null;
        this.currentBook = null;
        this.events = [];
        this.filteredEvents = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
    }

    async init(container) {
        console.log('[Timeline] Ініціалізація модуля хронології');
        this.container = container;

        try {
            const response = await fetch('/pages/timeline.html');
            const html = await response.text();
            this.container.innerHTML = html;

            this.initElements();

            this.initEventHandlers();

            this.subscribeToEvents();

            await this.loadCurrentBook();

            console.log('[Timeline] Модуль успішно ініціалізовано');
        } catch (error) {
            console.error('[Timeline] Помилка ініціалізації:', error);
        }
    }

    initElements() {
        this.elements = {
            filterButtons: document.querySelectorAll('.filter-btn'),
            searchInput: document.getElementById('eventSearch'),

            timelineList: document.getElementById('timelineList'),

            addEventBtn: document.getElementById('addEventBtn'),

            eventModal: document.getElementById('eventModal'),
            eventForm: document.getElementById('eventForm'),

            eventTitle: document.getElementById('eventTitle'),
            eventType: document.getElementById('eventType'),
            eventDateYear: document.getElementById('eventDateYear'),
            eventDateMonth: document.getElementById('eventDateMonth'),
            eventDateDay: document.getElementById('eventDateDay'),
            eventDescription: document.getElementById('eventDescription'),
            eventLocation: document.getElementById('eventLocation'),

            totalCount: document.getElementById('totalCount'),
            plotCount: document.getElementById('plotCount'),
            historicalCount: document.getElementById('historicalCount'),
            personalCount: document.getElementById('personalCount')
        };
    }

    initEventHandlers() {
        this.elements.addEventBtn.addEventListener('click', () => {
            this.showEventModal();
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
        const modal = this.elements.eventModal;

        document.getElementById('closeEventModal').addEventListener('click', () => {
            this.hideEventModal();
        });

        document.getElementById('cancelEventBtn').addEventListener('click', () => {
            this.hideEventModal();
        });

        document.getElementById('saveEventBtn').addEventListener('click', () => {
            this.saveEvent();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideEventModal();
            }
        });
    }

    subscribeToEvents() {
        eventBus.on('book:selected', (book) => {
            console.log('[Timeline] Отримано подію book:selected:', book);
            this.selectBook(book.id);
        });
    }

    async loadCurrentBook() {
        try {
            this.currentBook = bookService.getCurrentBook();

            if (this.currentBook) {
                await this.loadEvents();
            } else {
                this.showEmptyState('Оберіть книгу зі списку');
            }
        } catch (error) {
            console.error('[Timeline] Помилка завантаження книги:', error);
        }
    }

    async selectBook(bookId) {
        try {
            const result = await bookService.getBook(bookId);
            if (result.success) {
                this.currentBook = result.data;
                await this.loadEvents();
            }
        } catch (error) {
            console.error('[Timeline] Помилка вибору книги:', error);
        }
    }

    async loadEvents() {
        if (!this.currentBook) return;

        try {
            this.events = await timelineService.getAll(this.currentBook.id);
            this.applyFilters();
            this.updateStats();

            console.log('[Timeline] Завантажено', this.events.length, 'подій');
        } catch (error) {
            console.error('[Timeline] Помилка завантаження подій:', error);
            this.showEmptyState('Помилка завантаження подій');
        }
    }

    applyFilters() {
        let filtered = [...this.events];

        filtered = timelineService.filterByType(filtered, this.currentFilter);

        filtered = timelineService.searchByTitle(filtered, this.searchQuery);

        this.filteredEvents = filtered;
        this.renderEvents();
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

    renderEvents() {
        const list = this.elements.timelineList;

        if (this.filteredEvents.length === 0) {
            if (this.events.length === 0) {
                this.showEmptyState('Ще немає подій. Додайте першу!');
            } else {
                this.showEmptyState('Подій не знайдено за цими фільтрами');
            }
            return;
        }

        list.innerHTML = '';

      
        const sortedEvents = this.sortEventsByDate([...this.filteredEvents]);

        sortedEvents.forEach((event, index) => {
            const card = this.createEventCard(event, index);
            list.appendChild(card);
        });
    }

    sortEventsByDate(events) {
        return events.sort((a, b) => {
            const yearA = a.dateYear ? (isNaN(a.dateYear) ? 9999 : parseInt(a.dateYear)) : 9999;
            const yearB = b.dateYear ? (isNaN(b.dateYear) ? 9999 : parseInt(b.dateYear)) : 9999;

            const monthA = a.dateMonth ? parseInt(a.dateMonth) : 99;
            const monthB = b.dateMonth ? parseInt(b.dateMonth) : 99;

            const dayA = a.dateDay ? parseInt(a.dateDay) : 99;
            const dayB = b.dateDay ? parseInt(b.dateDay) : 99;

            if (yearA !== yearB) {
                return yearA - yearB;
            }

            if (monthA !== monthB) {
                return monthA - monthB;
            }

            return dayA - dayB;
        });
    }

    createEventCard(event, index) {
        const card = document.createElement('div');
        card.className = 'timeline-item';
        card.dataset.eventId = event.id;

        const typeLabels = {
            plot: 'Сюжетна подія',
            historical: 'Історична подія',
            personal: 'Особиста подія'
        };

        const typeIcons = {
            plot: '📖',
            historical: '🏛️',
            personal: '👤'
        };

        const formattedDate = timelineService.formatDate(event);

        card.innerHTML = `
            <div class="timeline-marker ${event.type}">
                <span class="timeline-icon">${typeIcons[event.type] || '📅'}</span>
            </div>
            <div class="timeline-content">
                <div class="timeline-card">
                    <div class="timeline-card-header">
                        <div class="timeline-main-info">
                            <h3 class="timeline-title">${event.title}</h3>
                            <span class="timeline-type-badge ${event.type}">${typeLabels[event.type] || event.type}</span>
                        </div>
                        <div class="timeline-actions">
                            <button class="btn-icon edit-event" data-id="${event.id}" title="Редагувати">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-event" data-id="${event.id}" title="Видалити">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="timeline-card-body">
                        <div class="timeline-date">
                            <i class="fas fa-calendar"></i>
                            ${formattedDate}
                        </div>
                        ${event.description ? `<p class="timeline-description">${event.description}</p>` : ''}
                        ${event.location ? `<div class="timeline-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>` : ''}
                    </div>
                </div>
            </div>
        `;

        card.querySelector('.edit-event').addEventListener('click', (e) => {
            e.stopPropagation();
            this.editEvent(event.id);
        });

        card.querySelector('.delete-event').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteEvent(event.id);
        });

        return card;
    }

    showEmptyState(message) {
        this.elements.timelineList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⏰</div>
                <p>${message}</p>
            </div>
        `;
    }

    updateStats() {
        const stats = timelineService.getStats(this.events);

        this.elements.totalCount.textContent = stats.total;
        this.elements.plotCount.textContent = stats.plot;
        this.elements.historicalCount.textContent = stats.historical;
        this.elements.personalCount.textContent = stats.personal;
    }

    showEventModal(event = null) {
        if (!this.currentBook) {
            alert('Спочатку оберіть книгу');
            return;
        }

        this.currentEvent = event;

        const title = event ? 'Редагувати подію' : 'Нова подія';
        document.querySelector('#eventModal .modal-header h3').textContent = title;

        if (event) {
            this.elements.eventTitle.value = event.title || '';
            this.elements.eventType.value = event.type || 'plot';
            this.elements.eventDateYear.value = event.dateYear || '';
            this.elements.eventDateMonth.value = event.dateMonth || '';
            this.elements.eventDateDay.value = event.dateDay || '';
            this.elements.eventDescription.value = event.description || '';
            this.elements.eventLocation.value = event.location || '';
        } else {
            this.elements.eventForm.reset();
        }

        this.elements.eventModal.classList.add('active');
    }

    hideEventModal() {
        this.elements.eventModal.classList.remove('active');
        this.currentEvent = null;
    }

    async saveEvent() {
        const title = this.elements.eventTitle.value.trim();

        if (!title) {
            alert('Введіть назву події');
            return;
        }

        const eventData = {
            title: title,
            type: this.elements.eventType.value,
            dateYear: this.elements.eventDateYear.value.trim(),
            dateMonth: this.elements.eventDateMonth.value.trim(),
            dateDay: this.elements.eventDateDay.value.trim(),
            description: this.elements.eventDescription.value.trim(),
            location: this.elements.eventLocation.value.trim(),
            order: this.events.length
        };

        try {
            if (this.currentEvent) {
                await timelineService.update(this.currentBook.id, this.currentEvent.id, eventData);
                console.log('[Timeline] Подію оновлено');
            } else {
                await timelineService.create(this.currentBook.id, eventData);
                console.log('[Timeline] Подію створено');
            }

            await this.loadEvents();

            this.hideEventModal();

        } catch (error) {
            console.error('[Timeline] Помилка збереження події:', error);
            alert('Помилка збереження події');
        }
    }

    async editEvent(eventId) {
        try {
            const event = await timelineService.get(this.currentBook.id, eventId);
            this.showEventModal(event);
        } catch (error) {
            console.error('[Timeline] Помилка завантаження події:', error);
            alert('Помилка завантаження події');
        }
    }

    async deleteEvent(eventId) {
        if (!confirm('Ви впевнені, що хочете видалити цю подію?')) {
            return;
        }

        try {
            await timelineService.delete(this.currentBook.id, eventId);
            await this.loadEvents();
            console.log('[Timeline] Подію видалено');
        } catch (error) {
            console.error('[Timeline] Помилка видалення події:', error);
            alert('Помилка видалення події');
        }
    }

    destroy() {
        console.log('[Timeline] Знищення модуля');

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
