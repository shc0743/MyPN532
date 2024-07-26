
const ProductId = 'fdf3404207ac433293f97c1dd3ca103a';
export { ProductId };


    

function nop(ev) { ev.preventDefault(); return false };

    
    
let wDocWidth = 0, wDocHeight = 0;
function noOverBorder(el, target, x, y, opt, containerOffset) {
    const { container, isTranslatedToCenter } = opt;
    x -= containerOffset.left;
    y -= containerOffset.top;
    if (x < 0) x = 0; if (y < 0) y = 0;
    if (x + el.$__BM_width > wDocWidth) x = wDocWidth - el.$__BM_width;
    if (y + el.$__BM_height > wDocHeight) y = wDocHeight - el.$__BM_height;
    if (isTranslatedToCenter) {
        x += el.$__BM_width / 2;
        y += el.$__BM_height / 2;
    }
    target.style.left = x + 'px';
    target.style.top = y + 'px';

    // document only
    if (container === document.documentElement) {
        const rc = target.getBoundingClientRect();

        const sx/*scrollX*/ = (rc.right > container.clientWidth ? 10 : (rc.left < 0 ? -10 : 0));
        const sy/*scrollY*/ = (rc.bottom > container.clientHeight ? 10 : (rc.top < 0 ? -10 : 0));
        if (sx || sy) window.scrollBy(sx, sy);
    }
}
function getOffsetToDoc(el, prop) {
    // example : getOffsetToBody(<HTMLElement>, 'offsetTop')
    let val = 0, op = el;
    do {
        val += op[prop];
        op = op.offsetParent;
    }
    while (op && op !== document.body && op !== document.documentElement);
    return val;
}
    

function BindMove(el, target = el, options = {
    container: null,
    isTranslatedToCenter: false,
    isFixed: false,
}) {
    if (!el) throw new TypeError('Invalid paramters', arguments);

    if (!options.container) options.container = document.documentElement;

    const containerOffset = { left: 0, top: 0 };

    el.classList.add(ProductId + '-el');
    target.classList.add(ProductId + '-target');
    el.$__BM_target = target;
    function DragStartHandler() {
        return false;
    }
    function PointerMoveHandler(ev) {
        if (ev.pointerId !== el.$__BM_pointerId) return;
        noOverBorder(el, target,
            (options.isFixed ? ev.x : ev.pageX) - el.$__BM_targetX,
            (options.isFixed ? ev.y : ev.pageY) - el.$__BM_targetY,
            options, containerOffset
        );
    }
    function PointerUpOrCancelHandler() {
        el.classList.remove('moving');
        target.classList.remove('moving');

        delete el.$__BM_offsetX;
        delete el.$__BM_offsetY;
        delete el.$__BM_pointerId;
        
        el.removeEventListener('dragstart', DragStartHandler);
        el.removeEventListener('pointermove', PointerMoveHandler);
        el.removeEventListener('pointerup', PointerUpOrCancelHandler);
        el.removeEventListener('pointercancel', PointerUpOrCancelHandler);
    }
    el.$__PointerDownHandler = function (ev) {
        // if (!ev.isPrimary) return;
        if (ev.target.getAttribute('data-exclude-bindmove') != null) return;

        el.$__BM_offsetX = ev.x;
        el.$__BM_offsetY = ev.y;
        {
            const rect = target.getBoundingClientRect();
            el.$__BM_targetX = el.$__BM_offsetX - rect.x;
            el.$__BM_targetY = el.$__BM_offsetY - rect.y;
            el.$__BM_width = Math.ceil(rect.width);
            el.$__BM_height = Math.ceil(rect.height);
        }
        containerOffset.left = getOffsetToDoc(options.container, 'offsetLeft');
        containerOffset.top = getOffsetToDoc(options.container, 'offsetTop');
        wDocWidth = options.isFixed ? options.container.clientWidth : options.container.scrollWidth;
        wDocHeight = options.isFixed ? options.container.clientHeight : options.container.scrollHeight;

        el.classList.add('moving');
        target.classList.add('moving');

        el.$__BM_pointerId = ev.pointerId;
        el.setPointerCapture(ev.pointerId);

        target.style.right = target.style.bottom = '';

        el.addEventListener('pointermove', PointerMoveHandler);
        el.addEventListener('pointerup', PointerUpOrCancelHandler);
        el.addEventListener('pointercancel', PointerUpOrCancelHandler);
    }

    el.addEventListener('pointerdown', el.$__PointerDownHandler);
    el.addEventListener('dragstart', nop);
    el.addEventListener('contextmenu', nop);



    
}


function UnBindMove(el) {
    el.classList.remove(ProductId + '-el');
    el.$__BM_target.classList.remove(ProductId + '-target');


    el.removeEventListener('pointerdown', el.$__PointerDownHandler);
    el.removeEventListener('dragstart', nop);
    el.removeEventListener('contextmenu', nop);

    delete el.$__PointerDownHandler;
    delete el.$__ContextMenuHandler;
    delete el.$__BM_target;
}




export const BindMove_css = addCSS(`
.${ProductId}-el {
    user-select: none;
    touch-action: none;
}
.${ProductId}-el.moving {
    cursor: move;
}
.${ProductId}-target {
    white-space: nowrap;
}
.${ProductId}-target.moving {
    /* position: absolute; */
    transition: none;
}
`);


function addCSS(css, el = null, adopt = false) {
    if ((el === null || adopt) && ('adoptedStyleSheets' in document)) {
        const style = new CSSStyleSheet;
        style.replace(css);
        (el || document).adoptedStyleSheets.push(style);
        return style;
    } else {
        let EL = document.createElement('style');
        EL.innerHTML = css;
        (el || document.head || document.documentElement).append(EL);
        return EL;
    }
}



export { addCSS as addCSS };
    
export {
    BindMove as BindMove,
    UnBindMove as UnBindMove,
};

export { nop };




let ResizableWidgetCSS1 = `
$$TAG$ {
    position: absolute;
    z-index: 1002;
    -webkit-app-region: no-drag; app-region: no-drag;
    background: transparent;
    padding: 10px;
    touch-action: none;
    box-sizing: border-box;
}
$$TAG$:not([open]) { display: none; }
$$TAG$:focus-visible, $$TAG$:focus {
    outline: none;
    --focus-visible: "[+]";
}
$$TAG$:not(:has([slot="widget-caption"])) {
    --no-caption: none;
}
`, ResizableWidgetCSS2 = `
resizable-widget-content-container-5e5921c2 {
    display: flex;
    flex-direction: column;
    background-color: var(--background, #FFFFFF);
    /*border: 1px solid var(--border-color, currentColor);*/
    outline: var(--focus-visible, none);
    box-shadow: 0 0 10px 0 #ccc;
    white-space: nowrap;
    cursor: auto;
    box-sizing: border-box;
    width: 100%; height: 100%;
    overflow: hidden;
    touch-action: revert;
    border-radius: 5px;
}
#caption {
    user-select: none;
    padding: 5px;
    border-bottom: 1px solid var(--border-color, currentColor);
    display: var(--no-caption, revert);
}
:host:not([no-focus-box]) #caption::before {
    content: var(--focus-visible, "");
    font-family: monospace;
}
#container {
    padding: var(--padding, 10px);
    flex: 1;
    overflow: auto;
}
`;


export class HTMLResizableWidgetElement extends HTMLElement {
    #shadowRoot = null;
    #caption = null;
    #content = null;

    get [Symbol.toStringTag]() {
        return 'HTMLResizableWidgetElement';
    }

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        addCSS(ResizableWidgetCSS2, this.#shadowRoot, true);

        if (this.#shadowRoot.adoptedStyleSheets) {
            this.#shadowRoot.adoptedStyleSheets.push(BindMove_css);
        } else {
            this.#shadowRoot.append(BindMove_css);
        }

        this.#content = document.createElement('resizable-widget-content-container-5e5921c2');
        this.#shadowRoot.append(this.#content);

        this.#caption = document.createElement('div');
        this.#caption.id = 'caption';
        this.#caption.innerHTML = `<slot name="widget-caption"></slot>`;
        this.#content.append(this.#caption);

        const contentContainer = document.createElement('div');
        contentContainer.id = 'container';
        this.#content.append(contentContainer);
        contentContainer.append(document.createElement('slot'));

        queueMicrotask(() => BindMove(this.#caption, this, { container: this.offsetParent }));

        this.#content.addEventListener('pointermove', ev => {
            ev.stopPropagation();
        });
        this.addEventListener('contextmenu', ev => {
            if (ev.composedPath()[0] === this) ev.preventDefault();
        });
        this.addEventListener('keydown', this.#onkeydown.bind(this));
        this.addEventListener('pointermove', this.#onpointermove.bind(this));
        this.addEventListener('pointerdown', this.#onpointerdown.bind(this));
        const uoc = this.#onPointerUpOrCancel.bind(this);
        this.addEventListener('pointerup', uoc);
        this.addEventListener('pointercancel', uoc);
    }

    connectedCallback() {
        this.tabIndex = 0;
        
    }

    get open() { return this.getAttribute('open') != null; }
    set open(val) {
        !!val ? (this.setAttribute('open', ''), this.focus()) : this.removeAttribute('open');
    }

    static get MIN_SIZE() { return 50; }
    static get SIZING_ATTRS() { return ['left', 'top', 'width', 'height']; }

    #noOverBorder(n, type, tid = 1, ol = false) {
        if (n < 1) return 0;
        if (ol) return n;
        const computed = getComputedStyle(this);
        const op = (this.offsetParent === document.body) ? document.documentElement : this.offsetParent;
        const val = tid * (type === 'x' ? parseInt(computed.left) : (type === 'y' ? parseInt(computed.top) : 0));
        if (type === 'x') if (op.clientWidth > 0 && n + val > op.clientWidth) return op.clientWidth - val;
        if (type === 'y') if (op.clientHeight > 0 && n + val > op.clientHeight) return op.clientHeight - val;
        return n;
    }

    close() {
        this.open = false;
    }

    #isSizing = false;
    #sizingType = { a: 0, b: 0 };
    #sizingStart = null;
    #sizingPointerId = -1;
    #onpointermove(ev) {
        if (!ev.isPrimary) return;
        if (this.#isSizing) {
            const chk = () => {
                if (parseInt(this.style.width) < HTMLResizableWidgetElement.MIN_SIZE)
                    this.style.width = HTMLResizableWidgetElement.MIN_SIZE + 'px';
                if (parseInt(this.style.height) < HTMLResizableWidgetElement.MIN_SIZE)
                    this.style.height = HTMLResizableWidgetElement.MIN_SIZE + 'px';
            };
            if (this.#sizingType.a) do {
                let valOffset = ((ev.x - this.#sizingStart.x));
                if (this.#sizingType.a < 0) {
                    let oldX = this.#sizingStart.x,
                        evx = this.#noOverBorder(ev.x, 'x', 0, true) - this.#sizingStart.offsetX;
                    evx = Math.min(Math.max(evx, 0), this.#sizingStart.left + this.#sizingStart.width - HTMLResizableWidgetElement.MIN_SIZE);
                    this.style.left = evx + 'px';
                    let changedX = (oldX - evx);
                    let newWidth = (this.#sizingStart.width + changedX - this.#sizingStart.offsetX);
                    this.style.width = newWidth + 'px';
                } else {
                    this.style.width = this.#noOverBorder(this.#sizingStart.width + valOffset, 'x') + 'px';
                }
            } while (0);
            if (this.#sizingType.b) do {
                let valOffset = ((ev.y - this.#sizingStart.y));
                if (this.#sizingType.b < 0) {
                    let oldY = this.#sizingStart.y,
                        evy = this.#noOverBorder(ev.y, 'y', 0, true) - this.#sizingStart.offsetY;
                    evy = Math.min(Math.max(evy, 0), this.#sizingStart.top + this.#sizingStart.height - HTMLResizableWidgetElement.MIN_SIZE);
                    this.style.top = evy + 'px';
                    let changedY = (oldY - evy);
                    let newHeight = (this.#sizingStart.height + changedY - this.#sizingStart.offsetY);
                    this.style.height = newHeight + 'px';
                } else {
                    this.style.height = this.#noOverBorder(this.#sizingStart.height + valOffset, 'y') + 'px';
                }
            } while (0);
            chk();
            return;
        }
        const left = ev.offsetX, top = ev.offsetY,
            right = this.clientWidth - left,
            bottom = this.clientHeight - top;
        let cursor = '';
        if (bottom <= 10) cursor += 's';
        if (top <= 10) cursor += 'n';
        if (right <= 10) cursor += 'e';
        if (left <= 10) cursor += 'w';
        cursor += '-resize';
        this.style.cursor = cursor;
    }
    #onpointerdown(ev) {
        if (!ev.isPrimary) return;
        if (ev.composedPath()[0] !== this) return;
        this.setPointerCapture((this.#sizingPointerId = ev.pointerId));
        this.#isSizing = true;
        const left = ev.offsetX, top = ev.offsetY,
            right = this.clientWidth - left,
            bottom = this.clientHeight - top;
        if (bottom <= 10) this.#sizingType.b = 1;
        if (top <= 10) this.#sizingType.b = -1;
        if (right <= 10) this.#sizingType.a = 1;
        if (left <= 10) this.#sizingType.a = -1;
        this.#sizingStart = {
            x: ev.x, y: ev.y,
            offsetX: ev.offsetX, offsetY: ev.offsetY,
            left: this.offsetLeft, top: this.offsetTop,
            width: this.clientWidth, height: this.clientHeight,
        };
    }
    #onPointerUpOrCancel(ev) {
        this.#isSizing = false;
        [this.#sizingType.a, this.#sizingType.b] = [0, 0];
        this.#sizingPointerId = -1;
    }
    #onkeydown(ev) {
        if (ev.composedPath()[0] !== this) return;

        if (ev.key === 'Escape' && this.#isSizing) {
            this.releasePointerCapture(this.#sizingPointerId);
            this.#isSizing = false;
            for (const i of HTMLResizableWidgetElement.SIZING_ATTRS) {
                this.style[i] = this.#sizingStart[i] + 'px';
            }
            return false;
        }
    }

};

let registeredResizableWidget = false;
export function registerResizableWidget(tagName = 'resizable-widget', force = false) {
    if (registeredResizableWidget && !force) return;
    registeredResizableWidget = true;
    addCSS(ResizableWidgetCSS1.replaceAll('$$TAG$', tagName));
    return customElements.define(tagName, HTMLResizableWidgetElement);
}


