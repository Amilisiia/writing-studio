import eventBus from '../../core/EventBus.js';
import bookService from '../../services/BookService.js';
import chapterService from '../../services/ChapterService.js';

export class Statistics {
    constructor() {
        this.container = null;
        this.currentBook = null;
        this.chapters = [];
        this.characters = [];
        this.terms = [];
        this.events = [];
        this.progressChart = null;
        this.charactersChart = null;
    }

    async init(container) {
        console.log('[Statistics] Ініціалізація модуля статистики');
        this.container = container;

        try {
            const response = await fetch('/pages/statistics.html');
            const html = await response.text();
            this.container.innerHTML = html;

            this.initElements();
            this.initEventHandlers();
            this.subscribeToEvents();

            await this.loadCurrentBook();

            console.log('[Statistics] Модуль успішно ініціалізовано');
        } catch (error) {
            console.error('[Statistics] Помилка ініціалізації:', error);
        }
    }

    initElements() {
        this.elements = {
            exportBookBtn: document.getElementById('exportBookBtn'),
            exportModal: document.getElementById('exportModal'),

            totalWords: document.getElementById('totalWords'),
            totalChapters: document.getElementById('totalChapters'),
            totalCharacters: document.getElementById('totalCharacters'),
            totalTerms: document.getElementById('totalTerms'),
            totalEvents: document.getElementById('totalEvents'),
            totalPages: document.getElementById('totalPages'),

            chaptersStatsTable: document.getElementById('chaptersStatsTable')
        };
    }

    initEventHandlers() {
        this.elements.exportBookBtn.addEventListener('click', () => {
            this.showExportModal();
        });

        this.initExportModal();
    }

    initExportModal() {
        const modal = this.elements.exportModal;

        document.getElementById('closeExportModal').addEventListener('click', () => {
            this.hideExportModal();
        });

        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            this.hideExportModal();
        });

        document.getElementById('confirmExportBtn').addEventListener('click', () => {
            this.exportBook();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideExportModal();
            }
        });
    }

    subscribeToEvents() {
        eventBus.on('book:selected', (book) => {
            console.log('[Statistics] Отримано подію book:selected:', book);
            this.selectBook(book.id);
        });
    }

    async loadCurrentBook() {
        try {
            this.currentBook = bookService.getCurrentBook();

            if (this.currentBook) {
                await this.loadAllData();
                this.calculateStatistics();
                this.renderChaptersTable();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('[Statistics] Помилка завантаження книги:', error);
        }
    }

    async selectBook(bookId) {
        try {
            const result = await bookService.getBook(bookId);
            if (result.success) {
                this.currentBook = result.data;
                await this.loadAllData();
                this.calculateStatistics();
                this.renderChaptersTable();
            }
        } catch (error) {
            console.error('[Statistics] Помилка вибору книги:', error);
        }
    }

    async loadAllData() {
        if (!this.currentBook) return;

        try {
            this.chapters = await chapterService.getAll(this.currentBook.id);

            const { default: characterService } = await import('../../services/CharacterService.js');
            this.characters = await characterService.getAll(this.currentBook.id);

            const { default: termService } = await import('../../services/TermService.js');
            this.terms = await termService.getAll(this.currentBook.id);

            const { default: timelineService } = await import('../../services/TimelineService.js');
            this.events = await timelineService.getAll(this.currentBook.id);

            console.log('[Statistics] Завантажено всі дані');
        } catch (error) {
            console.error('[Statistics] Помилка завантаження даних:', error);
        }
    }

    calculateStatistics() {
        const totalWords = this.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
        this.elements.totalWords.textContent = totalWords.toLocaleString('uk-UA');

        this.elements.totalChapters.textContent = this.chapters.length;

        this.elements.totalCharacters.textContent = this.characters.length;

        this.elements.totalTerms.textContent = this.terms.length;

        this.elements.totalEvents.textContent = this.events.length;

        const totalPages = Math.ceil(totalWords / 250);
        this.elements.totalPages.textContent = totalPages;

        console.log('[Statistics] Статистика розрахована:', {
            totalWords,
            chapters: this.chapters.length,
            characters: this.characters.length,
            terms: this.terms.length,
            events: this.events.length,
            pages: totalPages
        });

        this.renderProgressChart();

        this.renderCharactersChart();
    }

    renderChaptersTable() {
        const table = this.elements.chaptersStatsTable;

        if (this.chapters.length === 0) {
            table.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Немає глав для відображення</p>';
            return;
        }

        const sortedChapters = [...this.chapters].sort((a, b) => (a.order || 0) - (b.order || 0));

        table.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Назва глави</th>
                        <th>Слів</th>
                        <th>Символів</th>
                        <th>Час читання</th>
                        <th>POV</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedChapters.map(chapter => {
            const words = chapter.wordCount || 0;
            const chars = chapter.content ? chapter.content.length : 0;
            const readTime = Math.ceil(words / 200);

            return `
                            <tr>
                                <td><strong>${chapter.order || '—'}</strong></td>
                                <td>${chapter.title || 'Без назви'}</td>
                                <td>${words.toLocaleString('uk-UA')}</td>
                                <td>${chars.toLocaleString('uk-UA')}</td>
                                <td>${readTime} хв</td>
                                <td>${chapter.pov || '—'}</td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    }

    renderProgressChart() {
        const canvas = document.getElementById('progressChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.progressChart) {
            this.progressChart.destroy();
        }

        const sortedChapters = [...this.chapters].sort((a, b) => (a.order || 0) - (b.order || 0));

        const labels = sortedChapters.map((ch, index) => ch.title || `Глава ${index + 1}`);
        const wordCounts = sortedChapters.map(ch => ch.wordCount || 0);

        const cumulativeWords = [];
        let sum = 0;
        wordCounts.forEach(count => {
            sum += count;
            cumulativeWords.push(sum);
        });

        this.progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Слів у главі',
                        data: wordCounts,
                        backgroundColor: 'rgba(212, 175, 55, 0.2)',
                        borderColor: 'rgba(212, 175, 55, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Загальний прогрес',
                        data: cumulativeWords,
                        backgroundColor: 'rgba(101, 67, 33, 0.2)',
                        borderColor: 'rgba(101, 67, 33, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return value.toLocaleString('uk-UA');
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    renderCharactersChart() {
        const canvas = document.getElementById('charactersChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charactersChart) {
            this.charactersChart.destroy();
        }

        const roleCounts = {
            protagonist: 0,
            antagonist: 0,
            secondary: 0,
            minor: 0
        };

        this.characters.forEach(char => {
            if (roleCounts.hasOwnProperty(char.role)) {
                roleCounts[char.role]++;
            }
        });

        const roleLabels = {
            protagonist: 'Головні герої',
            antagonist: 'Антагоністи',
            secondary: 'Другорядні',
            minor: 'Епізодичні'
        };

        const data = Object.keys(roleCounts).map(role => roleCounts[role]);
        const labels = Object.keys(roleCounts).map(role => roleLabels[role]);

        this.charactersChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(212, 175, 55, 0.8)',
                        'rgba(220, 53, 69, 0.8)',
                        'rgba(23, 162, 184, 0.8)',
                        'rgba(108, 117, 125, 0.8)'
                    ],
                    borderColor: [
                        'rgba(212, 175, 55, 1)',
                        'rgba(220, 53, 69, 1)',
                        'rgba(23, 162, 184, 1)',
                        'rgba(108, 117, 125, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }

    showEmptyState() {
        this.elements.chaptersStatsTable.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
                <h3>Оберіть книгу для перегляду статистики</h3>
            </div>
        `;
    }

    showExportModal() {
        if (!this.currentBook) {
            alert('Спочатку оберіть книгу');
            return;
        }

        this.elements.exportModal.classList.add('active');
    }

    hideExportModal() {
        this.elements.exportModal.classList.remove('active');
    }

    async exportBook() {
        const format = document.querySelector('input[name="exportFormat"]:checked').value;
        const includeTitle = document.getElementById('includeTitle').checked;
        const includeAuthor = document.getElementById('includeAuthor').checked;
        const includeTableOfContents = document.getElementById('includeTableOfContents').checked;
        const includeChapterNumbers = document.getElementById('includeChapterNumbers').checked;

        console.log('[Statistics] Експорт книги:', { format, includeTitle, includeAuthor, includeTableOfContents, includeChapterNumbers });

        try {
            let content = '';
            const sortedChapters = [...this.chapters].sort((a, b) => (a.order || 0) - (b.order || 0));

            if (format === 'txt') {
                content = this.exportToTxt(sortedChapters, { includeTitle, includeAuthor, includeTableOfContents, includeChapterNumbers });
                this.downloadFile(`${this.currentBook.title}.txt`, content, 'text/plain');
            } else if (format === 'html') {
                content = this.exportToHtml(sortedChapters, { includeTitle, includeAuthor, includeTableOfContents, includeChapterNumbers });
                this.downloadFile(`${this.currentBook.title}.html`, content, 'text/html');
            } else if (format === 'md') {
                content = this.exportToMarkdown(sortedChapters, { includeTitle, includeAuthor, includeTableOfContents, includeChapterNumbers });
                this.downloadFile(`${this.currentBook.title}.md`, content, 'text/markdown');
            }

            this.hideExportModal();
            this.showToast('Книгу успішно експортовано!', 'success');
        } catch (error) {
            console.error('[Statistics] Помилка експорту:', error);
            this.showToast('Помилка експорту книги', 'error');
        }
    }

    exportToTxt(chapters, options) {
        let content = '';

        if (options.includeTitle) {
            content += `${this.currentBook.title.toUpperCase()}\n`;
            content += '='.repeat(this.currentBook.title.length) + '\n\n';
        }

        if (options.includeAuthor) {
            content += `Автор: ${this.currentBook.author || 'Не вказано'}\n\n`;
        }

        if (options.includeTableOfContents) {
            content += 'ЗМІСТ\n';
            content += '------\n\n';
            chapters.forEach((ch, index) => {
                content += `${index + 1}. ${ch.title || `Глава ${index + 1}`}\n`;
            });
            content += '\n\n';
        }

        chapters.forEach((chapter, index) => {
            content += '\n\n' + '='.repeat(60) + '\n\n';

            if (options.includeChapterNumbers) {
                content += `ГЛАВА ${index + 1}\n`;
            }

            content += `${chapter.title || `Глава ${index + 1}`}\n\n`;

            const textContent = this.stripHtml(chapter.content || '');
            content += textContent + '\n';
        });

        return content;
    }

    exportToHtml(chapters, options) {
        let html = `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.currentBook.title}</title>
    <style>
        body {
            font-family: Georgia, serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }
        h1 {
            text-align: center;
            color: #654321;
            border-bottom: 3px solid #d4af37;
            padding-bottom: 20px;
        }
        .author {
            text-align: center;
            font-style: italic;
            color: #666;
            margin-bottom: 40px;
        }
        .toc {
            background: #f9f7f4;
            padding: 30px;
            border-left: 4px solid #d4af37;
            margin-bottom: 40px;
        }
        .toc h2 {
            color: #654321;
            margin-top: 0;
        }
        .toc ul {
            list-style: none;
            padding: 0;
        }
        .toc li {
            padding: 8px 0;
        }
        .toc a {
            color: #654321;
            text-decoration: none;
        }
        .toc a:hover {
            color: #d4af37;
        }
        .chapter {
            page-break-before: always;
            margin-top: 60px;
        }
        .chapter-title {
            color: #654321;
            border-bottom: 2px solid #d4af37;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .chapter-number {
            color: #d4af37;
            font-size: 0.8em;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        p {
            text-align: justify;
            margin-bottom: 1.2em;
        }
    </style>
</head>
<body>
`;

        if (options.includeTitle) {
            html += `    <h1>${this.currentBook.title}</h1>\n`;
        }

        if (options.includeAuthor) {
            html += `    <p class="author">Автор: ${this.currentBook.author || 'Не вказано'}</p>\n`;
        }

        if (options.includeTableOfContents) {
            html += `    <div class="toc">\n`;
            html += `        <h2>Зміст</h2>\n`;
            html += `        <ul>\n`;
            chapters.forEach((ch, index) => {
                html += `            <li><a href="#chapter-${index + 1}">${ch.title || `Глава ${index + 1}`}</a></li>\n`;
            });
            html += `        </ul>\n`;
            html += `    </div>\n`;
        }

        chapters.forEach((chapter, index) => {
            html += `    <div class="chapter" id="chapter-${index + 1}">\n`;
            if (options.includeChapterNumbers) {
                html += `        <div class="chapter-number">Глава ${index + 1}</div>\n`;
            }
            html += `        <h2 class="chapter-title">${chapter.title || `Глава ${index + 1}`}</h2>\n`;
            html += `        ${chapter.content || '<p>Немає вмісту</p>'}\n`;
            html += `    </div>\n`;
        });

        html += `</body>\n</html>`;

        return html;
    }

    exportToMarkdown(chapters, options) {
        let content = '';

        if (options.includeTitle) {
            content += `# ${this.currentBook.title}\n\n`;
        }

        if (options.includeAuthor) {
            content += `**Автор:** ${this.currentBook.author || 'Не вказано'}\n\n`;
        }

        if (options.includeTableOfContents) {
            content += `## Зміст\n\n`;
            chapters.forEach((ch, index) => {
                const slug = this.slugify(ch.title || `Глава ${index + 1}`);
                content += `${index + 1}. [${ch.title || `Глава ${index + 1}`}](#${slug})\n`;
            });
            content += '\n---\n\n';
        }

        chapters.forEach((chapter, index) => {
            const slug = this.slugify(chapter.title || `Глава ${index + 1}`);

            if (options.includeChapterNumbers) {
                content += `## Глава ${index + 1}\n\n`;
            }

            content += `## ${chapter.title || `Глава ${index + 1}`} {#${slug}}\n\n`;

            const textContent = this.stripHtml(chapter.content || '');
            content += textContent + '\n\n---\n\n';
        });

        return content;
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
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
    }

    destroy() {
        console.log('[Statistics] Знищення модуля');

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}