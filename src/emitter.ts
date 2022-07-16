type ListenerFunction = (...args: any[]) => void;

export class EventEmitter {
  private eventMap: Record<string, ListenerFunction[]> = {};

  public emit(event: string, ...args: any[]) {
    const listeners = this.eventMap[event];
    if (!listeners) return false;
    listeners.forEach((callback) => {
      callback(...args);
    });
    return true;
  }

  public on(event: string, listener: ListenerFunction) {
    this.eventMap[event] = this.eventMap[event] ?? [];
    this.eventMap[event].push(listener);
    return this;
  }

  public off(event: string, listener: ListenerFunction) {
    const listeners = this.eventMap[event] ?? [];
    for (let i = listeners.length - 1; i >= 0; i -= 1) {
      if (listeners[i] === listener) {
        listeners.splice(i, 1);
        break;
      }
    }
    return this;
  }

  public offAll(event?: string) {
    if (event) {
      const listeners = this.eventMap[event];
      if (!listeners) return this;
      delete this.eventMap[event];
    } else {
      this.eventMap = {};
    }
    return this;
  }
}
