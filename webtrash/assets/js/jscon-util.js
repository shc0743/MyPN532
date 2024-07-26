
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
export class HTMLJsconScrollbarElement extends HTMLElement {
    #shadowRoot = null;
    #container = null;
    #thumb = null;
    #resizeObserver = null;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        this.#container = document.createElement('div');
        this.#container.id = 'container';
        this.#thumb = document.createElement('jscon-scroll-thumb');
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

export class HTMLJsconScrollThumbElement extends HTMLElement {
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



customElements.define('jscon-scrollbar', HTMLJsconScrollbarElement);
customElements.define('jscon-scroll-thumb', HTMLJsconScrollThumbElement);

