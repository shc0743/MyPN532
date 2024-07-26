/*
The MIT License (MIT)
Copyright © 2023 shc0743

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// VList v3

/*
Documentation

class HTMLVirtualListElement
Properties:
    get/set data    Set the function that returns the data shown in the list. If source data changed but data function is not changed, call update() to update it manually.
    get $data       Get the cached data. If data function is not set, this is null.
    (normal property) customDragMimeType    Set the drag data's mime type. See "Drag&Drop" to learn more.
    (normal property) customDragData        A function. See "Drag&Drop" to learn more.
    (normal property) customCheckDrag       A function. See "Drag&Drop" to learn more.
    get/set selection                       VList Selection data. See "Selection" to learn more.

    shadowRoot      Return the shadow root. Maybe useful in some schemes?

Attributes:
    click-to-open (interface: get/set clickToOpen)      If this is true, just single click posts a "open" message. The behavior is "Click to open, hover to select".
    allow-drag (interface: get/set allowDrag)           If this is true, all items are draggable. See "Drag&Drop" to learn more.
    no-multiple (interface: get/set noMultiple)         If this is true, user (and selection API) can only select one item at the same time.

APIs:
    - public APIs
    update()        Queue a update. See "Data" to learn more.
    filter(fn)      Filter the data with fn. Return the length of filter result. To get the result, use $data property. See also: [Array.prototype.filter](developer.mozilla.net)
    getFilter()     Get the current filter using by VList. This is useful when your user tried to filter something but it's difficult to save the filter.
    setLineHeight(px, shouldAutoFix = true)     Set line height. In the VList control, all line's height is same. Use this api to set your own line height (just a item's clientHeight,
                                                if you disabled auto-fix, you should use a <v-list-row> element and get its offsetHeight and add paddingTop and add paddingBottom. so, we suggested you to enable auto fix.)
    - internal APIs
    updateHeight()      Re-compute row height and container height. It's not necessary to call it manually, because a update() calls it too.
    updateOnScroll(forceRedraw = false) Useless unless you're using a custom scroll framework such as better-scroll. Call this in a scroll event listener. Also, if there's some strange bug (after a long running), try to call with forceRedraw = true.

Data:
    the data function should return the array contains the data to be displayed.
    Example:
    (HTML)<v-list-view id=demo1></v-list-view>
    (JS) demo1.data = () => [
        ['text1', 'text2', 'text3'], // common text rendering. Each item will be put in a <v-list-item>.
        [{html: '<b>Hello World!</b>It works!'}], // HTML is also supported. But notice, DO NOT use untrusted data such as user given!!
        [{html: '<img src="eee" onerror=javascript:alert("HELLO")>'}], // Look, if you do this, user can execute JavaScript!
    ]
    Of course, this is a simple demo, so there is no dynamic load. But: You can also use a async function or a common function return a Promise. Async is supported, it's good for dynamic data download.

Drag&Drop
    VList provide good supports for native drag&drop. To enable it:
    - Set allow-drag attribute or set allowDrag property to true
    - (optional) set a (long) mime type for your data. This can prevent conflicts with other app (example: you set "text/uri-list" as the type, now user can open a meaningless webpage.)
    - (optional) set customDragData to a function. The function will be call with arg: selection index. you can do nothing, in this case custom drag data is {the data you provided to show}[index]. Remember: This will be stringify, so DO NOT add a loop reference.
    - (optional) set customCheckDrag to a function. You can check the arguments[0], these are types of this drop. e.g. ['application/x-vlist-item-drag'] (this is default if you didn't change customDragMimeType) return true to allow this drop, return false to disallow.
    - Add a {ondrop} event handler. This is the final data after customCheckDrag's verify. You can get the data in event.dataTransfer. See also: MDN

Selection
    a Set with selection utility. This means you can simply enum it.
    Example: 
        (HTML)<v-list-view id=demo1></v-list-view>
        (JS) for (const i of demo1.selection) console.log(i);
    APIs:
    (Tip: n is the index in $data)
        selection.toArray()     Convert the Set to a Array.
        selection = n           Set the selection to n.
        selection.add(n)        Add a selection at n.
        selection.delete(n)     Delete the selection at n.
        selection.toggle(n)     Toggle the selection at n.
        selection.has(n)        Check if n is selected.
        selection.addRange(start : Number, end : Number)    Select items between start and end.
        selection.extend(n)     Extend selection to n. If nothing selected, select n.

Custom Events
    open        User (double) clicked (depends on [click-to-open] attribute) items or pressed Enter to open them. You should open selection items.
    openBlank   User pressed the middle button of the mouse or Ctrl+Enter keyshortcut. You should open selection items in a new window.


====

class HTMLVirtualListScrollbarElement

A scrollbar to emulate native scrollbar but can accept very large integer. Used in v2, but in v3 it is no longer used.
If you need this, you can also use. Element: <v-list-scrollbar></v-list-scrollbar>

[Optional property] type    can be 'vertical' or 'horizontal'.
[property] min(max)         Get or set the min (or max) value of the scrollbar.
[property] value            Get or set the current value.



*/



addCSS(`
v-list-view {
display: block;
box-sizing: border-box;
overflow: auto;
background: var(--background);
--padding: 5px;
}
v-list-view:focus {
outline: none;
}
`);


// themes

import { theme_dark, theme_autoCompute } from './themes.js';
export const theme_default = `
v-list-view {
--background: #ffffff;
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
--v-list-row-dragging-color: rgba(0, 0, 0, 0.5);
}
`;
addCSS(theme_autoCompute(theme_default, theme_dark));



const rowMarginBottom = 6;
// const vListStyle = document.//////createElement('style');
// vListStyle.textContent =
const vListStyleText = `
#container {
    padding: var(--padding);
    box-sizing: content-box;
    position: relative;
}
#header {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: var(--padding);
    border-bottom: 1px solid #ccc;
    background: var(--background);
}
#header.empty {
    padding: 0;
    border: none;
}
#header, v-list-row {
    user-select: none;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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
    box-sizing: border-box;
    box-sizing: content-box;
    color: var(--v-list-row-color);
    background: var(--v-list-row-bg);
    outline: var(--v-list-row-outline);
    white-space: /*break-spaces*/pre;
}
.click-to-open v-list-row {
    cursor: pointer;
}
.click-to-open v-list-row:hover {
    text-decoration: underline;
}
v-list-row:nth-last-child(1) {
    margin-bottom: 0;
}
v-list-row.pfocus {
    color: var(--v-list-row-pf-color);
    background: var(--v-list-row-pf-bg);
}
v-list-row:hover {
    color: var(--v-list-row-hover-color);
    background: var(--v-list-row-hover-bg);
    outline: var(--v-list-row-hover-outline);
}
v-list-row.pfocus {
    outline: var(--v-list-row-pf-outline);
}
v-list-row.checked, v-list-row.dragging, v-list-row.dropping {
    color: var(--v-list-row-focus-color);
    background: var(--v-list-row-focus-bg);
}
v-list-row.current, v-list-row.dragging {
    outline: var(--v-list-row-focus-outline);
}
v-list-row:hover:not(.checked) {
    outline: var(--v-list-row-hover-outline);
}
v-list-row.dragging, v-list-row.dropping,
#container:has(v-list-row.dragging) v-list-row.checked
{
    color: var(--v-list-row-dragging-color);
}
#container:has(v-list-row.pfocus) v-list-row.current:not(.pfocus) {
    outline: var(--v-list-row-outline);
}
`;



import { TickManager } from './TickManager.js';

export const tickManager = new TickManager(500);




class HTMLVirtualListElement extends HTMLElement {
    #shadowRoot = null;
    #divContainer = null;
    #header = null;
    #data = null;
    #el = new Map();
    #selection = new Set();
    #height = 0;
    #line_height = 0;
    #mutationObserver = null;
    #resizeObserver = null;

    get [Symbol.toStringTag]() {
        return 'HTMLVirtualListElement';
    }

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#header = document.createElement('header');
        this.#header.id = 'header';
        {
            let slot1 = document.createElement('slot');
            slot1.name = 'header';
            this.#header.append(slot1);
        }
        this.#shadowRoot.append(this.#header);
        this.#divContainer = document.createElement('div');
        this.#divContainer.id = 'container';
        this.#shadowRoot.append(this.#divContainer);
        if ('adoptedStyleSheets' in this.#shadowRoot) {
            const vListStyle = new CSSStyleSheet();
            vListStyle.replace(vListStyleText);
            this.#shadowRoot.adoptedStyleSheets.push(vListStyle);
        } else {
            const vListStyle = document.createElement('style');
            vListStyle.innerHTML = vListStyleText;
            this.#shadowRoot.append(vListStyle);
        }
        if (!this.#divContainer) throw new Error(`Error in constructor: Failed to find divContainer`);
        this.#resizeObserver = new ResizeObserver(() => {
            globalThis.requestAnimationFrame(() => this.updateOnScroll());
        });
        this.#mutationObserver = new MutationObserver(this.#mutationFn.bind(this));

        this.#registerEventHandlers();

        this.#selection._add = this.#selection.add;
        this.#selection._delete = this.#selection.delete;
        this.#selection._has = this.#selection.has;
        this.#selection.add = this.#addSelection.bind(this);
        this.#selection.delete = this.#deleteSelection.bind(this);
        this.#selection.toggle = this.#toggleSelection.bind(this);
        this.#selection.has = this.#hasSelection.bind(this);
        this.#selection.extend = this.#extendSelection.bind(this);
        this.#selection.addRange = this.#selectionAddRange.bind(this);
        this.#selection.toArray = function () {
            const r = [];
            for (const i of this) r.push(i);
            return r;
        };


    }

    on(ev, fn, opt = {}, target = null) {
        (target || this).addEventListener(ev, fn.bind(this), opt);
    }

    #registerEventHandlers() {
        this.on('contextmenu', this.#oncontextmenu);
        this.on('focus', this.#onfocus);
        this.on('keydown', this.#onkeydown, { capture: true });
        this.on('scroll', this.#onscroll, { passive: true });
        this.on('click', this.#onclick);
        this.on('dblclick', this.#ondblclick);
        this.on('mousedown', this.#onmousedown);
        this.on('dragstart', this.#ondragstart);
        this.on('dragend', this.#ondragend);
        this.on('dragenter', this.#ondragenter);
        this.on('dragover', this.#ondragover);
        this.on('dragleave', this.#ondragleave);
        this.on('drop', this.#ondrop);
        this.on('dragend', this.#handleDragEndAndDrop);
        this.on('drop', this.#handleDragEndAndDrop);
        this.on('pointerover', this.#onpointerover, { capture: true }, this.#divContainer);
        this.on('pointerout', this.#onpointerout, { capture: true }, this.#divContainer);

    }


// data start
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
    get $data() {
        return this.#data;
    }
// data end


// custom elements lifecycle start
    #cancelOnTick = null;

    connectedCallback() {
        this.tabIndex = 0;

        this.role = 'tree';
        this.ariaMultiSelectable = !this.noMultiple;

        this.#mutationObserver?.observe(this, {
            attributes: true,
            subtree: true,
            childList: true,
        });
        this.#resizeObserver?.observe(this);

        globalThis.queueMicrotask(() => {
            this.#mutationFn();
            for (const i of HTMLVirtualListElement.observedAttributes)
                this.#attrChanged(i);
        })

        tickManager.add(this);
        this.#cancelOnTick = tickManager.ontick(this.#ontick.bind(this));
    }

    disconnectedCallback() {
        this.tabIndex = 0;

        this.#mutationObserver?.disconnect();
        this.#resizeObserver?.unobserve(this);

        this.#cancelOnTick();
        tickManager.delete(this);
    }


    #mutationFn() {
        this.#header.classList[(this.querySelector('[slot="header"]') ? 'remove' : 'add')]('empty');

    }

    static get observedAttributes() { return ['no-multiple', 'click-to-open'] }
    attributeChangedCallback(name, oldValue, newValue) {
        globalThis.queueMicrotask(() => this.#attrChanged(name, oldValue, newValue));
    }

    #attrChanged(name) {
        switch (name) {
            case 'no-multiple':
                this.ariaMultiSelectable = !this.noMultiple;
                break;
            
            case 'click-to-open':
                this.#divContainer.classList[this.clickToOpen ? 'add' : 'remove']('click-to-open');
                break;
        
            default:
                break;
        }
    }

// custom elements lifecycle end


// common event handlers start
    #oncontextmenu(ev) {
        ev.preventDefault();


    }

    #onfocus(ev) {
        if (!this.#divContainer.querySelector('.checked')) {
            this.#setPfocus();
            return;
        }
    }

    #lastSelection = null;
    #onkeydown(ev) {
        if (ev.key === 'Tab') return;

        if (ev.key === ' ') {
            ev.preventDefault();
            if (!this.dispatchEvent(new CustomEvent('beforechange', { target: this, bubbles: true, cancelable: true }))) return;
            const el = this.#divContainer.querySelector('v-list-row.pfocus') || this.#divContainer.querySelector('v-list-row.current');
            if (el) {
                el.classList.contains('current') && el.classList.remove('current');
                // el.classList.contains('pfocus') && el.classList.remove('pfocus');
                // this.#lastSelection = el.dataset.n;
                this.selection.toggle(+el.dataset.n);
            } else {
                const el = this.#divContainer.querySelector(`v-list-row[data-n="${this.#lastSelection}"]`);
                el && el.classList.add('pfocus'); el && el.classList.contains('current') && el.classList.remove('current');
                this.selection.delete(this.#lastSelection);
            }
            this.dispatchEvent(new CustomEvent('change', { target: this }));
            return;
        }
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            if (!this.dispatchEvent(new CustomEvent('beforechange', { target: this, bubbles: true, cancelable: true }))) return;
            const handler = nocall => {
                let el = this.#divContainer.querySelector(`v-list-row[data-n="${this.#lastSelection}"]`);
                if (!el) el =
                    this.#divContainer.querySelector('v-list-row.current') ||
                    this.#divContainer.querySelector('v-list-row.checked,v-list-row.pfocus') ||
                    this.#divContainer.querySelector('v-list-row');
                // else if (ev.shiftKey) {
                //     el = this.#divContainer.querySelectorAll(`v-list-row.checked`);
                //     el = ev.key === 'ArrowUp' ? el[0] : el[el.length - 1];
                // }
                else if (ev.ctrlKey) {
                    let newEl = this.#divContainer.querySelectorAll(`v-list-row.pfocus`);
                    if (!newEl.length) newEl = [el];
                    el = ev.key === 'ArrowUp' ? newEl[0] : newEl[newEl.length - 1];
                }
                    
                if (!el) return;
                let elTarget = (ev.key === 'ArrowUp') ? el.previousElementSibling : el.nextElementSibling;
                if (!elTarget || !this.#isElementInView_h(elTarget)) {
                    // if (ev.shiftKey) {
                    //     const arr = this.selection.toArray().sort((a, b) => a - b);
                    //     let newSelection = (ev.key === 'ArrowUp') ? arr[0] - 1 : arr[arr.length - 1] + 1;
                    //     if (!this.#isRectInView(newSelection * this.#line_height, (newSelection + 1) * this.#line_height)) {
                    //         this.scrollTop = newSelection * this.#line_height;
                    //     }
                    //     return;
                    // }
                    this.scrollBy(0, (this.#line_height) * ((ev.key === 'ArrowUp') ? -1 : 1));
                    return nocall ? undefined : globalThis.queueMicrotask(handler.bind(this, true));
                }

                if (ev.ctrlKey) {
                    this.#clearPfocus();
                    elTarget.classList.add('pfocus');
                    this.#lastSelection = +elTarget.dataset.n;
                }
                else if (ev.shiftKey) {
                    this.#clearPfocus();
                    this.selection.add(elTarget.dataset.n);
                    // this.#lastSelection = elTarget.dataset.n;
                }
                else {
                    this.selection = elTarget.dataset.n;
                }
                this.dispatchEvent(new CustomEvent('change', { target: this }));
            };
            return handler(false);
        }
        if (ev.key === 'PageDown' || ev.key === 'PageUp') {
            ev.preventDefault();
            if (!this.dispatchEvent(new CustomEvent('beforechange', { target: this, bubbles: true, cancelable: true }))) return;
            let currentSelection = this.#lastSelection || this.#selection.values().next().value;
            if (!currentSelection) currentSelection = 0;
            const _fix = this.#header.offsetHeight;
            const height = this.clientHeight - _fix;
            let newSelection = currentSelection + ((ev.key === 'PageDown' ? 1 : -1) * (Math.floor(height / this.#line_height)));
            newSelection = Math.max(0, Math.min(newSelection, this.#data.length - 1));
            if (ev.ctrlKey || ev.shiftKey)
                this.selection[ev.ctrlKey ? 'add' : 'extend'](newSelection);
            else this.selection = newSelection;
            this.dispatchEvent(new CustomEvent('change', { target: this }));

            return;
        }
        if (ev.key === 'Enter' && this.selection.size) {
            ev.preventDefault();
            this.dispatchEvent(new CustomEvent(ev.ctrlKey ? 'openblank' : 'open', { target: this }));
            return;
        }
        if (ev.key === 'Escape') {
            ev.preventDefault();
            if (!this.dispatchEvent(new CustomEvent('beforechange', { target: this, bubbles: true, cancelable: true }))) return;
            this.selection = null;
            this.dispatchEvent(new CustomEvent('change', { target: this }));
            return;
        }
        if ((ev.key === 'a' || ev.key === 'A') && ev.ctrlKey) {
            ev.preventDefault();
            if (!this.dispatchEvent(new CustomEvent('beforechange', { target: this, bubbles: true, cancelable: true }))) return;
            this.selection = 'all';
            this.dispatchEvent(new CustomEvent('change', { target: this }));
            return;
        }
        if ((ev.key === 'Home' || ev.key === 'End') && (this.#data.length)) {
            ev.preventDefault();
            if (!this.dispatchEvent(new CustomEvent('beforechange', { target: this, bubbles: true, cancelable: true }))) return;
            const shouldSelection = (ev.key === 'Home') ? 0 : this.#data.length - 1;
            if (ev.shiftKey) {
                this.selection.extend(shouldSelection);
            } else if (ev.ctrlKey) {
                this.selection.add(shouldSelection);
            }
            else this.selection = shouldSelection;
            // this.#lastSelection = shouldSelection;
            this.dispatchEvent(new CustomEvent('change', { target: this }));
            return;
        }
        // console.log(ev.key);
    }

    #onscroll() {
        globalThis.requestAnimationFrame(() => this.updateOnScroll());
    }

    get clickToOpen() { return (this.getAttribute('click-to-open') != null) }
    set clickToOpen(val) {
        val ? this.setAttribute('click-to-open', '') : this.removeAttribute('click-to-open');
        return true;
    }
    #onclick(ev, _internal_just_test_dont_open = false) {
        // handle selection
        do {
            const path = ev.composedPath();
            if (!path.length) break;
            const last = path[0];
            if (last !== this && last !== this.#divContainer) break;
            if (ev.ctrlKey) return;
            // clear selection
            if (!this.dispatchEvent(new CustomEvent('beforechange', { target: this, bubbles: true, cancelable: true }))) return;
            this.selection = null;
            this.dispatchEvent(new CustomEvent('change', { target: this }));
            return;
        } while (0);


        // handle selection
        const path = ev.composedPath();
        for (const i of path) {
            if (i?.tagName?.toLowerCase() === 'v-list-row') {
                if (!this.dispatchEvent(new CustomEvent('beforechange', { target: this, bubbles: true, cancelable: true }))) return;
                if (ev.ctrlKey || ev.shiftKey) {
                    if (ev.ctrlKey) {
                        this.selection.toggle(i.dataset.n);
                        // this.#lastSelection = (this.selection.has(i.dataset.n) ? i.dataset.n : null);
                    }
                    else if (ev.shiftKey && this.#lastSelection != null) {
                        const rangeStart = this.#lastSelection, rangeEnd = i.dataset.n;
                        this.selection.addRange(rangeStart, rangeEnd);
                    }
                    this.dispatchEvent(new CustomEvent('change', { target: this }));
                    return;
                }
                this.selection = i.dataset.n;
                this.dispatchEvent(new CustomEvent('change', { target: this }));
                if ((!_internal_just_test_dont_open) && this.clickToOpen) {
                    this.dispatchEvent(new CustomEvent('open', { target: i }));
                }
                break;
            }
        }
    }

    #ondblclick(ev) {
        const path = ev.composedPath();

        for (const i of path) {
            if (i?.tagName?.toLowerCase() === 'v-list-row') {
                this.dispatchEvent(new CustomEvent(ev.button === 1 ? 'openblank' : 'open', { target: i }));
                break;
            }
        }
    }

    #onmousedown(ev) {
        if (ev.button === 1) {
            this.#onclick(ev, true);
            if (this.selection.size) {
                ev.preventDefault();
                return this.#ondblclick(ev);
            }
            return true;
        }

    }

    #hovern = null;
    #hovert = null;
    #onpointerover(ev) {
        const path = ev.composedPath();
        for (const i of path) {
            if (i?.tagName?.toLowerCase() === 'v-list-row' && (!ev.ctrlKey) && (!ev.shiftKey)) {
                this.#hovern = i.dataset.n;
                this.#hovert = tickManager.get(this);
            }
        }
    }
    #onpointerout(ev) {
        this.#hovern = this.#hovert = null;
    }

    #ontick() {
        // 1. select when hover for serval seconds in Click-To-Open mode
        if (this.clickToOpen && this.#hovern != null && !isNaN(this.#hovert)) {
            const currentTick = tickManager.get(this);
            if (currentTick - this.#hovert > 1) {
                if (!this.dispatchEvent(new CustomEvent('beforechange', { target: this, bubbles: true, cancelable: true }))) return;
                this.selection = this.#hovern;
                this.#hovern = this.#hovert = null;
                this.dispatchEvent(new CustomEvent('change', { target: this }));
            }
        }

        
    }
// common event handlers end


// drag&drop event handlers start
    get allowDrag() { return (this.getAttribute('allow-drag') != null) }
    set allowDrag(val) {
        val ?
            this.setAttribute('allow-drag', '') :
            this.removeAttribute('allow-drag');
        return true;
    }

    customDragMimeType = 'application/x-vlist-item-drag';
    customDragData = function (i) {
        return this.#data[i];
    }
    customCheckDrag = function (types) {
        const typesarr = [
            'application/x-vlist-item-drag',
            'application/octet-stream',
        ];
        for (const i of types) {
            if (typesarr.includes(i)) return true;
            if (i === 'Files') return { dropEffect: 'copy' };
        }
        return false;
    }
    #ondragstart(ev) {
        const el = this.#checkIfDragAllowed(ev, false);
        if (!el) return;
        el.classList.add('dragging');
        const n = el.dataset.n;
        const result = [];
        let mimeType = this.customDragMimeType;
        if (this.selection.has(n)) {
            // 拖动一个已经选中的文件，相当于用户想要对所有选中对象进行操作
            for (const i of this.selection.keys()) {
                result.push(this.customDragData(i));
            }
        } else {
            // 拖动一个未选中的文件，相当于只对这个文件进行操作
            result.push(this.customDragData(n));
        }
        if (!mimeType) mimeType = 'application/octet-stream';
        try {
            ev.dataTransfer.setData(mimeType, JSON.stringify(result));
            ev.dataTransfer.setData('text/plain', el.innerText);
        } catch (error) {
            console.warn('[VList]', 'Error during stringify drag data:', error,
                '\nPlease note that customDragData function must return a stringifyable object.');
        }
    }
    #ondragend(ev) {
        // const el = this.#checkIfDragAllowed(ev, false);
        // if (!el) return;
        // el.classList.remove('dragging');

    }
    #ondragenter(ev) {
        
    }
    #ondragover(ev) {
        const el = this.#checkIfDragAllowed(ev, false);
        if (!el) return;
        const checkResult = this.customCheckDrag(ev.dataTransfer.types);
        if (!checkResult) return;
        // if (ev.dataTransfer.items?.[0]?.kind === 'file') return;
        ev.preventDefault();
        this.#divContainer.querySelectorAll('.dropping').forEach(el => {
            el.classList.remove('dropping');
        });
        el.classList.add('dropping');
        let dropEffect = "none";
        if (checkResult.dropEffect) dropEffect = checkResult.dropEffect;
        else if (ev.shiftKey) dropEffect = "move";
        else if (ev.ctrlKey) dropEffect = "copy";
        else if (ev.altKey) dropEffect = "link";
        else dropEffect = "move";
        ev.dataTransfer.dropEffect = dropEffect;
        this.lastDropEffect = dropEffect;
    }
    #ondragleave(ev) {
        this.classList.remove('dropping');

    }
    #ondrop(ev) {
        if (!this.#checkIfDragAllowed(ev)) return;
        this.classList.remove('dropping');
        // user custom event handlers should do something
        // else this do no effect
    }
    #checkIfDragAllowed(ev, prevent = true) {
        if (!this.allowDrag) return false;
        for (const i of ev.composedPath()) {
            if (i?.tagName?.toLowerCase() === 'v-list-row' || i?.tagName?.toLowerCase() === 'v-list-view') {
                prevent && ev.preventDefault();
                return i;
            }
        }
        return false;
    }
    
    #handleDragEndAndDrop(ev) {
        for (let i of ['dragging', 'dropping'])
            this.#divContainer.querySelectorAll('.' + i).forEach(el => el.classList.remove(i));
    }
// drag&drop event handlers end


// selection managing start
    get selection() {
        return this.#selection;
    }
    set selection(value) {
        if (value == null) {
            this.clearSelection();
            return true;
        }

        this.clearSelection(true);
        const r = this.#updateSelection(value);
        if (r) this.dispatchEvent(new CustomEvent('selectionchanged', { target: this }));
        return r;
    }
    #updateSelection(newSelection) {
        this.#selection.clear();

        if (newSelection instanceof Array || newSelection instanceof Set) {
            for (let i of newSelection) {
                this.#selection.add(i);
            }
            this.#updateSelectionElement();
            this.#selectionCleanup();
            return true;
        }
        if (!isNaN(newSelection)) {
            newSelection = Number(newSelection);
            this.#selection.add(newSelection);
            this.#updateSelectionElement();
            if (!this.#isRectInView(newSelection * this.#line_height,
                (newSelection + 1) * this.#line_height)) {
                this.scrollTop = newSelection * this.#line_height;
            }
            this.#selectionCleanup();
            return true;
        }

        if (newSelection === 'all') {
            let scrollTop = this.scrollTop;
            let datalen = this.#data.length;
            // for (let i = 0; i < datalen; ++i) this.#selection.add(i);
            this.selection.addRange(0, datalen - 1); // better performance
            this.#updateSelectionElement();
            this.scrollTop = scrollTop;
            this.#selectionCleanup();
            return true;
        }

        return false;
    }
    #updateSelectionElement() {
        for (const el of this.#divContainer.querySelectorAll('v-list-row')) {
            if (this.#selection.has(parseInt(el.dataset.n))) {
                el.classList.add('checked');
            } else {
                el.classList.remove('checked');
            }
        }
    }
    #selectionCleanup() {
        this.dispatchEvent(new CustomEvent('changedbycode', { target: this }));
    }
    clearSelection(clearPfocus = false) {
        this.#selection.clear();
        this.#divContainer.querySelectorAll('v-list-row.current').forEach(el => el.classList.remove('current'));
        this.#divContainer.querySelectorAll('v-list-row.checked').forEach(el => el.classList.remove('checked'));
        this.#divContainer.querySelectorAll('v-list-row.pfocus').forEach(el => el.classList.remove('pfocus'));
        if (!clearPfocus) this.#setPfocus();
        this.#lastSelection = null;
        this.#selectionCleanup();
    }
    #addSelection(i) {
        if (isNaN(i)) return false;
        if (this.noMultiple) this.clearSelection(true);
        i = +i;
        this.#selection._add.call(this.#selection, i);
        this.#divContainer.querySelector(`v-list-row.current`)?.classList.remove('current');
        this.#lastSelection = i;
        this.#divContainer.querySelector(`v-list-row[data-n="${i}"]`)?.classList.add('current');
        this.#updateSelectionElement();
        if (!this.#isRectInView(i * this.#line_height, (i + 1) * this.#line_height)) {
            this.scrollTop = i * this.#line_height;
        }
        this.#selectionCleanup();
        return true;
    }
    #deleteSelection(i) {
        if (isNaN(i)) return false;
        if (!this.#selection._delete.call(this.#selection, Number(i))) return false;
        this.#updateSelectionElement();
        this.#selectionCleanup();
        return true;
    }
    #toggleSelection(i) {
        if (isNaN(i)) return false;
        i = Number(i);
        return this.selection.has(i) ? this.selection.delete(i) : this.selection.add(i);;
    }
    #hasSelection(i) {
        if (isNaN(i)) return false;
        return this.#selection._has.call(this.#selection, Number(i));
    }
    #selectionAddRange(start, end) {
        if (isNaN(start) || isNaN(end)) return false;
        start = Number(start), end = Number(end);
        const raw_end = end;
        if (start > end) [start, end] = [end, start];
        if (this.noMultiple) {
            if (end - start > 0) return false;
            this.clearSelection(true);
        }
        for (let i = start, j = end + 1; i < j; ++i){
            this.#selection._add.call(this.#selection, Number(i));
        }
        this.#divContainer.querySelector(`v-list-row.current`)?.classList.remove('current');
        this.#lastSelection = raw_end;
        this.#divContainer.querySelector(`v-list-row[data-n="${raw_end}"]`)?.classList.add('current');
        this.#updateSelectionElement();
        this.#selectionCleanup();
        return true;
    }
    #extendSelection(i) {
        if (isNaN(i)) return false;
        i = Number(i);
        const currentSelection = this.#lastSelection || this.#selection.values().next().value;
        if (null == currentSelection) return this.selection = i;
        let start = currentSelection, end = i;
        if (end < start) [start, end] = [end, start];
        this.selection.addRange(start, end);
        if (!this.#isRectInView(i * this.#line_height, (i + 1) * this.#line_height)) {
            this.scrollTop = i * this.#line_height;
        }
    }

    #setPfocus() {
        this.#divContainer.querySelector('v-list-row')?.classList.add('pfocus');
    }
    #clearPfocus() {
        this.#divContainer.querySelectorAll('v-list-row.pfocus').forEach(el => el.classList.remove('pfocus'));
        // this.#divContainer.querySelectorAll('v-list-row.current').forEach(el => el.classList.remove('current'));
    }


// multiple handling start
    get noMultiple() { return (this.getAttribute('no-multiple') != null) }
    set noMultiple(val) {
        val ?
            (this.setAttribute('no-multiple', ''), this.ariaMultiSelectable = false) :
            (this.removeAttribute('no-multiple'), this.ariaMultiSelectable = true);
        return true;
    }
// multiple handling end
    
// selection managing end
    
    
// filter start
    #filter = null;
    getFilter() {
        return this.#filter;
    }
    async filter(fn) {
        await this.update();
        if (!fn || !fn.call) return;
        this.#filter = fn;
        this.#data = this.#data.filter(fn);
        this.updateHeight();
        await this.#updateOnScroll(true);
        return this.#data.length;
    }
// filter end

    
// painting start
    #m_lineheight_computed = false;
    #computeHeight() {
        if (!this.#m_lineheight_computed) {
            const row = document.createElement('v-list-row');
            row.innerHTML = 'test';
            this.#divContainer.append(row);
            const style = globalThis.getComputedStyle(row);
            const h = parseInt(style.height) + parseInt(style.paddingTop) + parseInt(style.paddingBottom);
            this.#line_height = h + rowMarginBottom;
            this.#m_lineheight_computed = true;
            row.remove();
        }
        this.#height = Math.max(0, (this.#data.length * (this.#line_height)) - rowMarginBottom);
    }
    updateHeight() {
        this.#computeHeight();
        this.#divContainer.style.height = this.#height.toString() + 'px';
    }
    setLineHeight(px, shouldAutoFix = true) {
        if (isNaN(px)) throw new TypeError('Cannot set line height to NaN');
        if (px <= 0) throw new TypeError('Cannot set line height smaller than 0');
        this.#m_lineheight_computed = true;
        this.#line_height = px + (shouldAutoFix ? 13 : 0);
    }

    #updating = false;
    async update() {
        if (this.#updating) return;

        this.#updating = true;
        this.#divContainer.innerHTML = '';
        this.#filter = null;

        this.#data = this.data();
        if (!(this.#data instanceof Array) && !(this.#data instanceof Promise)) {
            this.#updating = false;
            throw new TypeError(`data function returned an incorrect result`);
        }
        const f = (data) => {
            this.#updating = false;
            if (this.#data !== data) this.#data = data;
            if (!(this.#data instanceof Array)) {
                throw new TypeError(`data promise returned an incorrect result`);
            }
            if (this.#data.length > 200_001) {
                throw new Error(`Too more data`);
            }

            this.selection = null;
            this.updateHeight();
            this.updateOnScroll(true);
        };
        if (this.#data instanceof Promise) try {
            this.#data = await this.#data;
            f.call(this, this.#data);
        } catch (error) {}
        else f.call(this, this.#data);
    }

    //#updateOnScrollLock = false;
    updateOnScroll() {
        return this.#updateOnScroll.apply(this, arguments);
    }
    #rangeOverlay = 10;
    async #updateOnScroll(forceRedraw = false) {
        // 渲染可视范围内的 ± rangeOverlay 条数据
        const rangeOverlay = this.#rangeOverlay;

        if (!this.#data) return;
        // console.debug(new Date().getTime(), 'scroll before');
        //if (this.#updateOnScrollLock) return;
        //this.#updateOnScrollLock = true;
        // console.debug(new Date().getTime(), 'scroll execute');
        // console.log('-- scroll executed; time:' + new Date().getTime());

        await Promise.resolve();

        const scrollPos = this.scrollTop;

        let begin = Math.max(0, Math.floor((scrollPos) / this.#line_height) - rangeOverlay);
        let end = Math.min(this.#data.length, Math.floor((scrollPos + this.clientHeight) / this.#line_height) + rangeOverlay);
        //let current = Math.floor(scrollPos / this.#line_height);
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
        for (let i of this.#el) {
            // 元素已存在
            if (!numInRange(i[0], begin, end)) {
                // 移除不需要的元素
                i[1].remove();
                this.#el.delete(i[0]);
            }
        }
        for (let i = begin; i < end; ++i) {
            const el = this.#el.get(i);
            if (!el) {
                // 创建新行
                const data = this.#data[i];
                const el = this.#createRow(data, i);
                // el.style.top = offset + 'px';
                this.#el.set(i, el);
                if (this.#selection.has(i)) el.classList.add('checked');
                createdElementsIndex.push(i);
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
        //this.#updateOnScrollLock = false;
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

    #isRectInRect(pbegin, pend, begin, end) {
        return (begin >= pbegin && end <= pend);
    }
    #isRectInView(begin, end, container = this) {
        const _fix = container === this ? this.#header.offsetHeight : 0;
        return this.#isRectInRect(container.scrollTop, container.scrollTop + container.clientHeight - _fix, begin, end);
    }
    #isElementInView_h(el) {
        const container = this, _fix = this.#header.offsetHeight;
        const begin = container.scrollTop, end = begin + container.clientHeight - _fix;
        const el_begin = el.offsetTop, el_end = el_begin + el.offsetHeight;
        return this.#isRectInRect(begin, end, el_begin, el_end);
    }
// painting end


}


class HTMLVirtualListRowElement extends HTMLElement {
    constructor() {
        super();

        // this.setAttribute('tabindex', '0');
    }

    connectedCallback() {
        this.draggable = true;

        this.role = 'treeitem';

    }

}



class HTMLVirtualListItemElement extends HTMLElement {
    constructor() {
        super();


    }

}




/*
滚动条功能也算肝了亿会，不忍心删掉，需要的可以直接使用
*/
const scrollbarSize = 6;
const vScrollStyle = document.createElement('style');
vScrollStyle.textContent = `
#container {
    display: block;
    width: var(--scrollbar-width);
    height: var(--scrollbar-height);
    overflow: hidden;
    position: relative;

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
    border: 1px solid #cecfd1;
    border-radius: 3px;
    cursor: default;
    transition: background 0.1s;
    touch-action: none;
    box-sizing: border-box;

    visibility: hidden;
}
#thumb:hover {
    background: #c0c1c3;
}
#thumb:focus {
    border: 1px solid #aaaaaa;
    outline: none;
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
        this.role = 'scrollbar';
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





function debounce(fn, delay, thisArg = globalThis) {
    let timeId = null;
    return function () {
        const outerThis = this;
        if (timeId) clearTimeout(timeId);
        timeId = setTimeout(function (args) {
            if (thisArg === globalThis && outerThis !== globalThis)
                return fn.apply(outerThis, args);
            return fn.apply(thisArg, args);
        }, delay, arguments);
        return timeId;
    };
}


export function addCSS(text) {
    if ('adoptedStyleSheets' in document) {
        const style = new CSSStyleSheet();
        style.replace(text);
        document.adoptedStyleSheets.push(style);
    } else {
        const el = document.createElement('style');
        el.textContent = text;
        (document.head || document.documentElement).append(el);
    }
}

