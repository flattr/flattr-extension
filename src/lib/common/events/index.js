"use strict";

const symListenerMap = Symbol("listener map");

class EventEmitter
{
  constructor()
  {
    this[symListenerMap] = new Map();
  }

  emit(name, ...args)
  {
    if (!this[symListenerMap].has(name))
      return;

    let listeners = this[symListenerMap].get(name).slice();
    let promises = [];
    for (let listener of listeners)
    {
      promises.push(listener(...args));
    }
    return Promise.all(promises);
  }

  once(name, listener)
  {
    let off = this.off.bind(this);

    this.on(name, function onceListener(...args)
    {
      off(name, onceListener);
      return listener(...args);
    });
  }

  on(name, listener)
  {
    if (!this[symListenerMap].has(name))
    {
      this[symListenerMap].set(name, []);
    }

    let listeners = this[symListenerMap].get(name);
    listeners.push(listener);
  }

  off(name, listener)
  {
    let listeners = this[symListenerMap].get(name);
    if (!listeners)
      return;

    let idx = listeners.indexOf(listener);
    if (idx == -1)
      return;

    listeners.splice(idx, 1);
  }

  reset()
  {
    this[symListenerMap].clear();
  }
}
exports.EventEmitter = EventEmitter;

let emitter = new EventEmitter();
exports.emit = emitter.emit.bind(emitter);
exports.on = emitter.on.bind(emitter);
exports.once = emitter.once.bind(emitter);
exports.off = emitter.off.bind(emitter);
exports.reset = emitter.reset.bind(emitter);
