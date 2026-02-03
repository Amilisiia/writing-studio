class EventBusClass {
    constructor() {
        this.events = {};
    }

    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);

        return () => this.off(eventName, callback);
    }

    off(eventName, callback) {
        if (!this.events[eventName]) return;

        this.events[eventName] = this.events[eventName].filter(
            cb => cb !== callback
        );
    }

    emit(eventName, data) {
        if (!this.events[eventName]) return;

        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
            }
        });
    }

    clear() {
        this.events = {};
    }
}

const eventBus = new EventBusClass();
export default eventBus;