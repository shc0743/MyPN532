/*
The MIT License (MIT)
Copyright © 2023 shc0743

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


export class TickManager {
    #map = null;
    #timerId = -1;
    #nextTick = new Set;
    #nextTickPromise = null;
    #nextTickPromiseResolve = null;
    #tickHandlers = new Set;
    #destroyed = false;

    constructor(tickSpeed = 1000, type = Map) {
        this.#map = new type; // can be Map or WeakMap

        this.#timerId = globalThis.setInterval(this.#tickIt.bind(this), tickSpeed);

    }

    destroy() {
        globalThis.clearInterval(this.#timerId);
        return (this.#destroyed = true);
    }

    static get maxTickCount() { return Number.MAX_SAFE_INTEGER - 1 }
    static #microfiler(val) {
        return val > TickManager.maxTickCount ? 0 : val;
    }

    #tickIt() {
        for (const i of this.#map) {
            this.#map.set(i[0], TickManager.#microfiler(++i[1]));
        }
        if (this.#nextTickPromiseResolve) {
            this.#nextTickPromiseResolve();
            this.#nextTickPromise = this.#nextTickPromiseResolve = null;
        }
        for (const i of this.#nextTick) queueMicrotask(i);
        this.#nextTick.clear();
        for (const i of this.#tickHandlers) queueMicrotask(i);
    }

    add(data) {
        if (this.#destroyed) throw new TypeError('the object has been destroyed');
        return this.#map.set(data, 0);
    }

    reset(data) {
        return this.add.apply(this, arguments);
    }

    get(data) {
        return this.#map.get(data);
    }

    delete(data) {
        return this.#map.delete(data);
    }

    clear() {
        this.#map.clear();
        this.#tickHandlers.clear();
    }

    nextTick(func = undefined) {
        if (this.#destroyed) throw new TypeError('the object has been destroyed');
        if (func) {
            this.#nextTick.add(func);
            const cancelNextTick = () => this.#nextTick.delete(func);
            return cancelNextTick;
        }
        return this.#nextTickPromise || (this.#nextTickPromise =
            new Promise(resolve => this.#nextTickPromiseResolve = resolve));
    }

    ontick(cb) {
        if (this.#destroyed) throw new TypeError('the object has been destroyed');
        if (typeof cb !== 'function') return false;
        this.#tickHandlers.add(cb);
        return this.cancel_ontick.bind(this, cb);
    }
    cancel_ontick(cb) {
        return this.#tickHandlers.delete(cb);
    }

};


