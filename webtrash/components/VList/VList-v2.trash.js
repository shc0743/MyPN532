/*
The MIT License (MIT)
Copyright © 2023 shc0743

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// VList v2
// supports very big data
//


// 能力有限实在做不好了，就这样吧

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
overflow: hidden;
position: relative;
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
    position: absolute;
    left: 0; right: 0; top: 0; bottom: 0;
    z-index: 1;
    display: flex;
    flex-direction: row;
}
#wrapper {
    padding: var(--padding);
    flex: 1;
    overflow: hidden;
    touch-action: none;
}
#content {
    position: relative;
}
#vscroll {
    position: absolute;
    left: 0; top: 0;
    display: block;
    width: 1px;
    height: 200%;
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
    #divWrapper = null;
    #divContent = null;
    #scrollbar = null;
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
        this.#divWrapper = document.createElement('div');
        this.#divWrapper.id = 'wrapper';
        this.#divContent = document.createElement('div');
        this.#divContent.id = 'content';
        this.#scrollbar = document.createElement('v-list-scrollbar');
        this.#scrollbar.id = 'scrollbar';
        this.#scrollbar.type = 'vertical';
        this.#shadowRoot.append(this.#divContainer);
        this.#divWrapper.append(this.#divContent);
        this.#divContainer.append(this.#divWrapper);
        this.#divContainer.append(this.#scrollbar);
        this.#shadowRoot.append(vListStyle.cloneNode(true));
        this.#resizeObserver = new ResizeObserver(() => {
            globalThis.requestAnimationFrame(() => this.updateOnScroll());
        });

        this.on('contextmenu', this.#oncontextmenu);
        this.on('focus', this.#onfocus);
        this.on('keydown', this.#onkeydown);
        // this.on('scroll', this.#onscroll, { passive: true });
        this.on('click', this.#onContainerClick, { capture: true });
        this.#divContent.addEventListener('click', ev => {
            if (ev.target !== this.#divContent) return;
            // clear selection
            this.selection = null;
        });
        this.on('wheel', this.#onwheel, { passive: true });
        this.#scrollbar.addEventListener('scrolling', this.#onScrollbarScroll.bind(this));
        this.#scrollbar.addEventListener('scroll', this.#onScrollbarScroll.bind(this));

        
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
        this.#resizeObserver?.unobserve(this);

    }


    #oncontextmenu(ev) {
        ev.preventDefault();


    }

    #onfocus(ev) {
        if (!this.#divContent.querySelector('.checked')) {
            this.#setPfocus();
            return;
        }
    }

    #onkeydown(ev) {
        if (ev.key === 'Tab') return;

        if (ev.key === ' ') {
            ev.preventDefault();
            const el = this.#divContent.querySelector('v-list-row.pfocus');
            el?.classList.remove('pfocus');
            el?.classList.add('checked');
            return;
        }
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            let el = this.#divContent.querySelector('v-list-row.current');
            if (!el) el = this.#divContent.querySelector('v-list-row.checked,v-list-row.pfocus');
            if (!el) el = this.#divContent.querySelector('v-list-row');
            if (!el) return;
            let elTarget = (ev.key === 'ArrowUp') ? el.previousElementSibling : el.nextElementSibling;
            if (!elTarget) {
                this.#scrollbar.value += ((this.#line_height + rowMarginBottom) * ((ev.key === 'ArrowUp') ? -1 : 1));
                globalThis.requestAnimationFrame(() =>this.#onkeydown(ev));
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
        // console.log(ev.key);
    }


    #onwheel(ev) {
        // console.log(ev);
        this.#scrollbar.value += ev.deltaY;
    }

    // #onscroll() {
    //    globalThis.requestAnimationFrame(() => this.updateOnScroll());
    // }

    #onScrollbarScroll(ev) {
        this.updateOnScroll();
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
        
        return false
    }
    clearSelection(clearPfocus = false) {
        this.#divContent.querySelectorAll('v-list-row.checked').forEach(el => el.classList.remove('checked'));
        this.#divContent.querySelectorAll('v-list-row.pfocus').forEach(el => el.classList.remove('pfocus'));
        if (!clearPfocus) this.#setPfocus();
    }

    #setPfocus() {
        this.#divContent.querySelector('v-list-row')?.classList.add('pfocus');
    }


    #computeHeight() {
        const row = document.createElement('v-list-row');
        row.innerHTML = 'test';
        this.#divContent.append(row);
        const style = globalThis.getComputedStyle(row);
        const h = parseInt(style.height) + parseInt(style.paddingTop) + parseInt(style.paddingBottom);
        this.#line_height = h + rowMarginBottom;
        this.#height = (this.#data.length * (this.#line_height)) - rowMarginBottom;
        row.remove();
    }
    updateHeight() {
        this.#computeHeight();
        this.#scrollbar.min = 0;
        this.#scrollbar.max = this.#height;
        // this.#divPseudoContent.setAttribute('style', `height: ${this.#height}px;`);
    }

    #updating = false;
    update() {
        if (this.#updating) return;

        this.#updating = true;
        this.#divContent.innerHTML = '';

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
            
            globalThis.queueMicrotask(() => {
                this.updateHeight();
                this.updateOnScroll(true);
            });
        };
        if (this.#data instanceof Promise) this.#data.then(f.bind(this)).catch(() => { });
        else globalThis.setTimeout(f.bind(this), 4, this.#data);
    }


    updateOnScroll(forceRedraw = false) {
        const rangeOverlay = 10; // 渲染可视范围内的 ± 10 条数据

        if (!this.#data) return;

        const scrollPos = this.#scrollbar.value;

        let begin = Math.max(0, Math.floor((scrollPos) / this.#line_height) - rangeOverlay);
        let end = Math.min(this.#data.length, Math.floor((scrollPos + this.clientHeight) / this.#line_height) + rangeOverlay);
        // let beginRaw = (scrollPos) / (this.#line_height);
        // let begin = Math.floor(beginRaw);
        // let end = (Math.floor((scrollPos + this.clientHeight) / this.#line_height));
        let itemCount = this.#data.length;
        const numInRange = function (num, min, max) {
            return num >= min && num <= max;
        };

        if (forceRedraw) {
            this.#el.clear();
            this.#divContent.innerHTML = '';
        }

        let offset = 0;
        if (scrollPos !== 0) {
            offset = -rangeOverlay;
        }
        this.#divContent.style.top = offset + 'px';

        let createdElementsIndex = [];
        for (let i of this.#el) {
            // 元素已存在
            if (!numInRange(i[0], begin, end)) {
                // 移除不需要的元素
                i[1].remove();
                this.#el.delete(i[0]);
            }
        }
        for (let i = begin; i < end; ++i){
            const el = this.#el.get(i);
            if (!el) {
                // 创建新行
                const data = this.#data[i];
                const el = this.#createRow(data, i);
                // el.style.top = offset + 'px';
                this.#el.set(i, el);
                createdElementsIndex.push(i);
            }
        }
        

        // 整体添加新创建的元素
        if (createdElementsIndex.length) {
            const _locator = document.createElement('div');
            let _row1n = parseInt(this.#divContent.querySelector('v-list-row')?.dataset.n);
            if (!isNaN(_row1n) && createdElementsIndex[0] < _row1n)
                this.#divContent.prepend(_locator);
            else
                this.#divContent.append(_locator);
            for (let i of createdElementsIndex) {
                const el = this.#el.get(i);
                if (!el) continue;
                _locator.before(el);
            }
            _locator.remove();
        }


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

    /*

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
    }*/


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


class HTMLVirtualListItemElement extends HTMLElement {
    constructor() {
        super();

        
    }

}


const scrollbarSize = 6;
const vScrollStyle = document.createElement('style');
vScrollStyle.textContent = `
#container {
    display: block;
    width: var(--scrollbar-width);
    height: var(--scrollbar-height);
    overflow: hidden;

    --scrollbar-size: ${scrollbarSize}px;
}
#container.is-horizontal {
    --scrollbar-width: 100%;
    --scrollbar-height: var(--scrollbar-size);
    cursor: w-resize;
}
#container.is-vertical {
    --scrollbar-width: var(--scrollbar-size);
    --scrollbar-height: 100%;
    cursor: n-resize;
}

#thumb {
    display: block;
    position: absolute;
    background: #cecfd1;
    border-radius: 3px;
    cursor: default;
    transition: background 0.1s;
    touch-action: none;

    visibility: hidden;
}
#thumb:hover {
    background: #c0c1c3;
}
#thumb:focus {
    outline: 1px solid #aaaaaa;
}
#thumb.visible {
    visibility: visible;
}
#thumb.moving {
    background: /*#c8c9cc*/#aeafb2;
    cursor: inherit;
}
`;
class HTMLVirtualListScrollbarElement extends HTMLElement {
    #shadowRoot = null;
    #container = null;
    #thumb = null;
    #resizeObserver = null;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        this.#container = document.createElement('div');
        this.#container.id = 'container';
        this.#thumb = document.createElement('v-list-scroll-thumb');
        this.#thumb.id = 'thumb';
        this.#container.append(this.#thumb);
        this.#shadowRoot.append(this.#container);
        this.#shadowRoot.append(vScrollStyle.cloneNode(true));
        this.#resizeObserver = new ResizeObserver(() => {
            globalThis.requestAnimationFrame(() => this.update());
        });

        this.#thumb.addEventListener('pointerdown', this.#thumb_pointerDown.bind(this));
        this.#thumb.addEventListener('pointermove', this.#thumb_pointerMove.bind(this));
        this.#thumb.addEventListener('pointerup', this.#thumb_pointerUpOrCancel.bind(this));
        this.#thumb.addEventListener('pointercancel', this.#thumb_pointerUpOrCancel.bind(this));
        this.#thumb.addEventListener('contextmenu', () => false);

        this.#thumb.addEventListener('poschange', this.#thumb_poschange.bind(this));

    }

    get type() { return this.getAttribute('type') }
    set type(value) { this.setAttribute('type', value); return true }

    #min = 0;
    get min() { return this.#min }
    set min(value) { this.#min = value; this.update(); return true }

    #max = 1;
    get max() { return this.#max }
    set max(value) { this.#max = value; this.update(); return true }

    #value = 0;
    get value() { return this.#value }
    set value(value) { this.#value = value; this.update(); return true }

    connectedCallback() {
        globalThis.requestAnimationFrame(() => this.update());
        this.#resizeObserver?.observe(this);
    }

    disconnectedCallback() {
        this.#resizeObserver?.unobserve(this);
    }

    static get observedAttributes() { return ['type'] }
    attributeChangedCallback(name, oldValue, newValue) {
        globalThis.requestAnimationFrame(() => this.update());
    }


    update() {
        {
            let a = 'remove', b = 'add';
            if (this.type === 'horizontal') [a, b] = [b, a];
            this.#container.classList[a]('is-horizontal');
            this.#container.classList[b]('is-vertical');
        }

        if (isNaN(this.min) || isNaN(this.max)) return;
        if (isNaN(this.#value) || this.#value < this.min) this.#value = this.min;
        if (this.#value > this.max) this.#value = this.max;

        let client_size = (this.type === 'horizontal') ? this.#container.clientWidth : this.#container.clientHeight;

        let sum = this.max - this.min;
        let current = this.#value - this.min;

        let thumbsize = Math.max(scrollbarSize, Math.floor((client_size ** 2) / sum));
        if (thumbsize > client_size) {
            this.#thumb.classList.remove('visible');
        } else {
            this.#thumb.classList.add('visible');
        }
        
        let pos = (this.#value * (client_size - thumbsize)) / sum;
        

        {
            let a = 'width', b = 'height';
            if (this.type === 'horizontal') [a, b] = [b, a];
            this.#thumb.style[a] = 'var(--scrollbar-size)';
            this.#thumb.style[b] = thumbsize + 'px';

            a = 'left', b = 'top';
            if (this.type === 'horizontal') [a, b] = [b, a];
            this.#thumb.style[a] = '';
            this.#thumb.style[b] = pos + 'px';
        }

        this.dispatchEvent(new CustomEvent('scroll'));
    }


    #thumbMoving = false;
    #thumbMoveOffset = 0;
    #thumb_pointerDown(ev) {
        this.#thumb.setPointerCapture(ev.pointerId);
        this.#thumbMoving = true;
        this.#thumb.classList.add('moving');
        this.#thumbMoveOffset = (this.type === 'horizontal') ? ev.offsetX : ev.offsetY;
    }
    #thumb_pointerMove(ev) {
        if (!this.#thumbMoving) return;
        let client_size = (this.type === 'horizontal') ? this.#container.clientWidth : this.#container.clientHeight;
        let offset = (this.type === 'horizontal') ? ev.offsetX : ev.offsetY;
        let sum = this.max - this.min;
        let thumbsize = Math.max(scrollbarSize, Math.floor((client_size ** 2) / sum));
        let pos = (this.#value * (client_size - thumbsize)) / sum;
        let currentTop = Math.min(client_size - thumbsize,
            Math.max(0, (pos + offset) - this.#thumbMoveOffset));

        let a, b;
        a = 'left', b = 'top';
        if (this.type === 'horizontal') [a, b] = [b, a];
        this.#thumb.style[a] = '';
        this.#thumb.style[b] = currentTop + 'px';

        this.dispatchEvent(new CustomEvent('scrolling'));
        this.#value = this.min + (currentTop * sum) / (client_size - thumbsize);
    }
    #thumb_pointerUpOrCancel(ev) {
        if (!this.#thumbMoving) return;
        this.#thumbMoving = false;
        this.#thumb.classList.remove('moving');
        this.update();
    }

    #thumb_poschange(ev) {
        let client_size = (this.type === 'horizontal') ? this.#container.clientWidth : this.#container.clientHeight;
        let sum = this.max - this.min;
        let thumbsize = Math.max(scrollbarSize, Math.floor((client_size ** 2) / sum));
        switch (ev.detail.type) {
            case 'update':
                this.value += ev.detail.data * (ev.detail.altKey ? 1 : 20);
                break;
            case 'updatepage':
                this.value += ev.detail.data * client_size;
                break;
            case 'go':
                if (ev.detail.data === 1) this.value = this.max;
                else if (ev.detail.data === 0) this.value = this.min;
                break;
        
            default:
                break;
        }
    }

}

class HTMLVirtualListScrollThumbElement extends HTMLElement {
    constructor() {
        super();

        this.addEventListener('keydown', this.#onkeydown.bind(this), { capture: true });
    }
    connectedCallback() {
        this.tabIndex = 0;
    }
    #onkeydown(ev) {
        switch (ev.key) {
            case 'ArrowDown':
            case 'ArrowUp':
            case 'ArrowLeft':
            case 'ArrowRight':
                this.dispatchEvent(new CustomEvent('poschange', {
                    detail: {
                        type: 'update',
                        data: ev.key === 'ArrowUp' || ev.key === 'ArrowLeft' ? -1 : 1,
                        altKey: ev.altKey,
                    }
                }));
                break;
            case 'PageDown':
            case 'PageUp':
                this.dispatchEvent(new CustomEvent('poschange', {
                    detail: {
                        type: 'updatepage',
                        data: ev.key === 'PageUp' ? -1 : 1,
                        altKey: ev.altKey,
                    }
                }));
                break;
            case 'Home':
            case 'End':
                this.dispatchEvent(new CustomEvent('poschange', {
                    detail: {
                        type: 'go',
                        data: ev.key === 'End' ? 1 : 0,
                        altKey: ev.altKey,
                    }
                }));
                break;
        
            default: return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        return false;
    }
}




customElements.define('v-list-scrollbar', HTMLVirtualListScrollbarElement);
customElements.define('v-list-scroll-thumb', HTMLVirtualListScrollThumbElement);
customElements.define('v-list-item', HTMLVirtualListItemElement);
customElements.define('v-list-row', HTMLVirtualListRowElement);
customElements.define('v-list-view', HTMLVirtualListElement);




export {
    HTMLVirtualListElement,
    HTMLVirtualListRowElement,
    HTMLVirtualListItemElement,
    HTMLVirtualListScrollbarElement,
    HTMLVirtualListScrollThumbElement,
};
    
    

    
    
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

