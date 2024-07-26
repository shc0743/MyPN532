/*
The MIT License (MIT)
Copyright © 2023 shc0743

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// VList v1


{
    const globStyle = document.createElement('style');
    globStyle.textContent = `
v-list-view {
--v-list-row-color: #000000;
--v-list-row-bg: #ffffff;
--v-list-row-outline: none;
--v-list-row-hover-color: #000000;
--v-list-row-hover-bg: #e5f3ff;
--v-list-row-hover-outline: none;
--v-list-row-pf-color: #000000;
--v-list-row-pf-bg: #ffffff;
--v-list-row-pf-outline: 1px solid #99d1ff;
--v-list-row-focus-color: #000000;
--v-list-row-focus-bg: #cce8ff;
--v-list-row-focus-outline: 1px solid #99d1ff;
--padding: 5px;
}
v-list-view {
display: block;
box-sizing: border-box;
overflow: auto;
}
v-list-view:focus {
outline: none;
}
`;
    (document.head || document.documentElement).append(globStyle);
}

const rowMarginBottom = 6;
const vListStyle = document.createElement('style');
vListStyle.textContent = `
#container {
    padding: var(--padding);
    box-sizing: content-box;
    position: relative;
}
v-list-row {
    position: relative;
    top: var(--offset);
    display: block;
    margin-bottom: ${rowMarginBottom}px;
    --padding: 5px;
    padding: var(--padding);
    border-radius: 2px;
    cursor: default;
    user-select: none;
    box-sizing: border-box;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    box-sizing: content-box;
    color: var(--v-list-row-color);
    background: var(--v-list-row-bg);
    outline: var(--v-list-row-outline);
}
v-list-row:nth-last-child(1) {
    margin-bottom: 0;
}
v-list-row.pfocus {
    color: var(--v-list-row-pf-color);
    background: var(--v-list-row-pf-bg);
    outline: var(--v-list-row-pf-outline);
}
v-list-row:hover {
    color: var(--v-list-row-hover-color);
    background: var(--v-list-row-hover-bg);
    outline: var(--v-list-row-hover-outline);
}
v-list-row.checked {
    color: var(--v-list-row-focus-color);
    background: var(--v-list-row-focus-bg);
    outline: var(--v-list-row-focus-outline);
}
`;


class HTMLVirtualListElement extends HTMLElement {
    #shadowRoot = null;
    #divContainer = null;
    #data = null;
    #selection = [];
    #el = new Map();
    #height = 0;
    #line_height = 0;
    #resizeObserver = null;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#divContainer = document.createElement('div');
        this.#divContainer.id = 'container';
        this.#shadowRoot.append(this.#divContainer);
        this.#shadowRoot.append(vListStyle.cloneNode(true));
        if (!this.#divContainer) throw new Error(`Error in constructor: Failed to find divContainer`);
        this.#resizeObserver = new ResizeObserver(() => {
            globalThis.requestAnimationFrame(() => this.updateOnScroll());
        });

        this.on('contextmenu', this.#oncontextmenu);
        this.on('focus', this.#onfocus);
        this.on('keydown', this.#onkeydown, { capture: true });
        this.on('scroll', this.#onscroll, { passive: true });
        this.on('click', this.#onContainerClick, { capture: true });
        this.#divContainer.addEventListener('click', ev => {
            if (ev.target !== this.#divContainer) return;
            // clear selection
            this.selection = null;
        });


    }

    #dataFunc = null;
    get data() {
        return this.#dataFunc || function () { return [] };
    }
    set data(value) {
        if (!(value.call)) throw new TypeError('Unable to call data function');
        this.#dataFunc = value;
        globalThis.queueMicrotask(() => this.update());
        return true;
    }


    on(ev, fn, opt = {}, target = null) {
        (target || this).addEventListener(ev, fn.bind(target || this), opt);
    }

    connectedCallback() {
        this.tabIndex = 0;

        this.#resizeObserver?.observe(this);

    }

    disconnectedCallback() {
        this.tabIndex = 0;

        this.#resizeObserver?.unobserve(this);

    }


    #oncontextmenu(ev) {
        ev.preventDefault();


    }

    #onfocus(ev) {
        if (!this.#divContainer.querySelector('.checked')) {
            this.#setPfocus();
            return;
        }
    }

    #onkeydown(ev) {
        if (ev.key === 'Tab') return;

        if (ev.key === ' ') {
            ev.preventDefault();
            const el = this.#divContainer.querySelector('v-list-row.pfocus');
            el?.classList.remove('pfocus');
            el?.classList.add('checked');
            return;
        }
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            let el = this.#divContainer.querySelector('v-list-row.current');
            if (!el) el = this.#divContainer.querySelector('v-list-row.checked,v-list-row.pfocus');
            if (!el) el = this.#divContainer.querySelector('v-list-row');
            if (!el) return;
            let elTarget = (ev.key === 'ArrowUp') ? el.previousElementSibling : el.nextElementSibling;
            if (!elTarget) {
                this.scrollBy(0, (this.#line_height + rowMarginBottom) * ((ev.key === 'ArrowUp') ? -1 : 1));
                return;
            }

            if (ev.ctrlKey) {

            }
            else if (ev.shiftKey) {

            }
            else {
                this.clearSelection(true);
                elTarget.classList.add('checked');
            }
            return;
        }
        if (ev.key === 'Escape') {
            ev.preventDefault();
            this.selection = null;
            return;
        }
        console.log(ev.key);
    }

    #onscroll() {
        globalThis.requestAnimationFrame(() => this.updateOnScroll());
    }

    #onContainerClick(ev) {
        if (ev.ctrlKey || ev.shiftKey) {

            return;
        }

        const path = ev.composedPath();
        for (const i of path) {
            if (i?.tagName?.toLowerCase() === 'v-list-row') {
                this.clearSelection(true);
                i.classList.add('checked');
                break;
            }
        }

    }


    get selection() {
        return this.#selection;
    }
    set selection(value) {
        if (value == null) {
            this.clearSelection();
            return true;
        }

        return this.#updateSelection(value);
    }
    #updateSelection(newSelection) {

    }
    clearSelection(clearPfocus = false) {
        this.#divContainer.querySelectorAll('v-list-row.checked').forEach(el => el.classList.remove('checked'));
        this.#divContainer.querySelectorAll('v-list-row.pfocus').forEach(el => el.classList.remove('pfocus'));
        if (!clearPfocus) this.#setPfocus();
    }

    #setPfocus() {
        this.#divContainer.querySelector('v-list-row')?.classList.add('pfocus');
    }

    #computeHeight() {
        const row = document.createElement('v-list-row');
        row.innerHTML = 'test';
        this.#divContainer.append(row);
        const style = globalThis.getComputedStyle(row);
        const h = parseInt(style.height) + parseInt(style.paddingTop) + parseInt(style.paddingBottom);
        this.#line_height = h + rowMarginBottom;
        this.#height = (this.#data.length * (this.#line_height)) - rowMarginBottom;
        row.remove();
    }
    updateHeight() {
        this.#computeHeight();
        this.#divContainer.style.height = this.#height.toString() + 'px';
    }

    #updating = false;
    update() {
        if (this.#updating) return;

        this.#updating = true;
        this.#divContainer.innerHTML = '';

        this.#data = this.data();
        if (!(this.#data instanceof Array) && !(this.#data instanceof Promise)) {
            throw new TypeError(`data function returned an incorrect result`);
        }
        function f(data) {
            if (this.#data !== data) this.#data = data;
            if (!(this.#data instanceof Array)) {
                throw new TypeError(`data promise returned an incorrect result`);
            }
            this.#updating = false;

            this.updateHeight();
            this.updateOnScroll(true);
        };
        if (this.#data instanceof Promise) this.#data.then(f.bind(this)).catch(() => { });
        else setTimeout(f.bind(this), 4, this.#data);
    }

    #updateOnScrollLock = false;
    // #updateOnScroll_debounced = null;
    updateOnScroll() {
        // if (!this.#updateOnScroll_debounced) this.#updateOnScroll_debounced = debounce(this.#updateOnScroll, 20, this);
        // return this.#updateOnScroll_debounced.apply(this, arguments);
        return this.#updateOnScroll.apply(this, arguments);
    }
    async #updateOnScroll(forceRedraw = false) {
        const rangeOverlay = 10; // 渲染可视范围内的 ± 10 条数据

        if (!this.#data) return;
        // console.debug(new Date().getTime(), 'scroll before');
        if (this.#updateOnScrollLock) return;
        this.#updateOnScrollLock = true;
        // console.debug(new Date().getTime(), 'scroll execute');
        // console.log('-- scroll executed; time:' + new Date().getTime());

        await Promise.resolve();

        const scrollPos = this.scrollTop;

        let begin = Math.max(0, Math.floor((scrollPos) / this.#line_height) - rangeOverlay);
        let end = Math.min(this.#data.length, Math.floor((scrollPos + this.clientHeight) / this.#line_height) + rangeOverlay);
        //let current = Math.floor(scrollPos / this.#line_height);
        let itemCount = this.#data.length;
        const numInRange = function (num, min, max) {
            return num >= min && num <= max;
        };

        if (forceRedraw) {
            this.#el.clear();
            this.#divContainer.innerHTML = '';
        }

        let offset = (begin) * this.#line_height;
        offset < 0 ? offset = 0 : (
            offset > this.#divContainer.clientHeight ? offset = this.#divContainer.clientHeight : 0
        );
        this.#divContainer.style.setProperty('--offset', offset + 'px');

        let createdElementsIndex = [];
        for (let i = 0; i < itemCount; ++i) {
            const el = this.#el.get(i);
            if (!el) {
                // 如果需要，创建新行
                if (numInRange(i, begin, end)) {
                    const data = this.#data[i];
                    const el = this.#createRow(data, i);
                    // el.style.top = offset + 'px';
                    this.#el.set(i, el);
                    createdElementsIndex.push(i);
                }
            }
            else {
                // 元素已存在
                if (!numInRange(i, begin, end)) {
                    // 移除不需要的元素
                    el.remove();
                    this.#el.delete(i);
                } else {
                    // el.style.top = offset + 'px';
                }
            }
        }

        // 整体添加新创建的元素
        if (createdElementsIndex.length) {
            const _locator = document.createElement('div');
            let _row1n = parseInt(this.#divContainer.querySelector('v-list-row')?.dataset.n);
            if (!isNaN(_row1n) && createdElementsIndex[0] < _row1n)
                this.#divContainer.prepend(_locator);
            else
                this.#divContainer.append(_locator);
            for (let i of createdElementsIndex) {
                const el = this.#el.get(i);
                if (!el) continue;
                _locator.before(el);
            }
            _locator.remove();
        }

        // console.debug(new Date().getTime(), 'scroll finish');
        // console.log('-- scroll finished; time:' + new Date().getTime())
        this.#updateOnScrollLock = false;
    }

    #createRow(data, n) {
        const el = document.createElement('v-list-row');
        el.dataset.n = n;

        for (const i of data) {
            const d = document.createElement('v-list-item');
            (i.html) ? (d.innerHTML = i.html) :
                (d.innerText = i.text || i);
            el.append(d);
        }

        return el;
    }


}


class HTMLVirtualListRowElement extends HTMLElement {
    constructor() {
        super();

        // this.setAttribute('tabindex', '0');
    }

    connectedCallback() {
        this.draggable = true;

    }

}




customElements.define('v-list-view', HTMLVirtualListElement);
customElements.define('v-list-row', HTMLVirtualListRowElement);




export { HTMLVirtualListElement, HTMLVirtualListRowElement };





export function debounce(fn, delay, thisArg = globalThis) {
    let timeId = null;
    return function () {
        if (timeId) clearTimeout(timeId);
        timeId = setTimeout(function (args) {
            return fn.apply(thisArg, args);
        }, delay, arguments);
        return timeId;
    };
}

