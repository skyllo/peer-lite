type ListenerFunction = (...args: any[]) => void;

export class EventEmitter {
  private listeners: Record<string, ListenerFunction[]> = {};

  public on(eventName: string, listener: ListenerFunction) {
    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push(listener);
    return this;
  }

  public off(eventName: string, listener: ListenerFunction) {
    const currListener = this.listeners[eventName];
    if (!currListener) return this;
    for (let i = currListener.length; i > 0; i -= 1) {
      if (currListener[i] === listener) {
        currListener.splice(i, 1);
        break;
      }
    }
    return this;
  }

  public emit(eventName: string, ...args: any[]) {
    const callbacks = this.listeners[eventName];
    if (!callbacks) return false;
    callbacks.forEach((callback) => {
      callback(...args);
    });
    return true;
  }
}
