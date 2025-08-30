// services/queue.js
export class SharedQueue {
    constructor() {
        this.queue = [];
        this.seenLinks = new Set();
        this.producersFinished = false;
        this.consumers = [];
    }

    addLink(link) {
        if (!this.seenLinks.has(link)) {
            this.seenLinks.add(link);
            this.queue.push(link);
            this.notifyConsumer();
        }
    }

    async getLink() {
        if (this.queue.length > 0) {
            return this.queue.shift();
        }
        if (this.producersFinished) {
            return null; // No more links will ever be added
        }
        // Wait for a new link to be added
        return new Promise(resolve => {
            this.consumers.push(resolve);
        });
    }

    notifyConsumer() {
        if (this.consumers.length > 0 && this.queue.length > 0) {
            const consumer = this.consumers.shift();
            const link = this.queue.shift();
            consumer(link);
        }
    }

    notifyProducersFinished() {
        this.producersFinished = true;
        // Notify any waiting consumers that no more links are coming
        this.consumers.forEach(consumer => consumer(null));
        this.consumers = [];
    }
}