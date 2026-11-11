class ProcessingQueue {
  private tail: Promise<void> = Promise.resolve();
  private waiting = 0;

  get pendingCount() {
    return this.waiting;
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    this.waiting += 1;
    const result = this.tail.then(task);
    this.tail = result.then(
      () => { this.waiting -= 1; },
      () => { this.waiting -= 1; }
    );
    return result;
  }
}

export const processingQueue = new ProcessingQueue();
