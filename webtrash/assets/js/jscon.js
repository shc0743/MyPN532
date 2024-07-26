
import { addCSS, HTMLResizableWidgetElement, registerResizableWidget } from './BindMove.js';

export const ConRoot_Template = document.createElement('template');
ConRoot_Template.innerHTML = `
<resizable-widget>
    <widget-caption slot="widget-caption">
        <span>JavaScript Console</span>
        <button class=jscon-btn data-id=CLOSE style="float:right" data-exclude-bindmove>x</button>
    </widget-caption>
    <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        <jscon-tabbar data-id="TABS">
            <jscon-tab is-current>Console</jscon-tab>
            <jscon-tab>Source</jscon-tab>
            <jscon-tab>Network</jscon-tab>
            <jscon-tab>User</jscon-tab>
        </jscon-tabbar>

        <div class="panels">
            <div data-panel="Console" class="console-panel">
                <div class="console-btns">
                    <button class="jscon-btn" data-id="ClearConsole" title="Clear console (Ctrl+L)">Clear</button>
                    <span class=split></span>
                    <label><input type=checkbox data-id="con_opts"><select data-id="con_opts_label"></select></label>
                    <span class=split></span>
                    <input placeholder="Filter..." disabled style="flex:1;min-width:1px" data-id="ConsoleFilter" />
                </div>
                <div class="console-content" tabindex=0>
                    <div class="console-messages" aria-label="Console Messages">
                    
                    </div>
                    <div class="console-input" aria-label="Input code to evalute it">
                        <div style="display: inline-flex; flex: 1; flex-direction: column;">
                            <textarea data-id="cons" rows=1></textarea>
                            <jscon-scrollbar data-id="cons_sc2" type=horizontal min=0></jscon-scrollbar>
                        </div>
                        <jscon-scrollbar data-id="cons_sc" min=0></jscon-scrollbar>
                    </div>
                </div>
            </div>

            <div data-panel="Source" class="source-panel" hidden>
                <div class="panel-left">

                </div>

                <div class="panel-right">
                    <jscon-tabbar data-id="SourceTabs">
                        <jscon-tab is-current>+</jscon-tab>
                    </jscon-tabbar>

                    <div class="flex-1 code-viewer" hidden></div>
                    <div class="flex-1" data-id="Tab_NewSource" style="padding: 20px">
                        <label style="display:flex">Input source URL: &nbsp;<input data-id="SourceURL" type=text style="flex:1"></label>
                        <button data-id="OpenSource" type=button>Open Source</button>
                    </div>
                </div>
            </div>

            <div data-panel="Network" hidden>
                Network
            </div>

            <div data-panel="User" hidden style="overflow: auto; padding: 10px;">
                <form class="user-settings">
                    <fieldset>
                        <legend>User Settings</legend>
                        <div>
                            <div><button type=button data-id=ClearConHist>Clear Console History</button></div>
                            <div><button type=button data-id=ResetSettings>Reset all settings</button></div>
                        
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>Window Options</legend>
                        <div>
                            <div><button type=button data-id=RenderAsTopLayer>Render as #top-layer</button></div>
                        </div>
                    </fieldset>
                </form>
            </div>
        </div>
    </div>
</resizable-widget>

<dialog data-id="top-layer-container"></dialog>

<dialog data-id="allowPasteConfirm">
    <div>Are you sure you want to allow paste?</div>
    <form method=dialog>
        <button type=submit data-id="doAllowPaste">Yes</button>
        <button type=submit autofocus>No</button>
    </form>
</dialog>

<div class="jscon-messages-container"></div>
`;
addCSS(`
:root {
    --font-monospace: consolas, lucida console, courier new, monospace;
}
jscon-console-root {
    --background: #FFFFFF;
}
`);

export const jscon_style_text = ((`
`+`
[hidden] {
    display: none!important;
}
resizable-widget, dialog > resizable-widget {
    z-index: 1073741823;
    left: 20px; top: 20px;
    width: 60%; height: 60%;
    --padding: 0;
}
dialog[data-id="top-layer-container"] {
    overflow: visible;
    margin: 0; padding: 0; border: 0;
}
::selection {
    background-color: rgb(141 199 248 / 60%);
}
`+`.jscon-btn {
    border: 0; background: var(--background, inherit);
    transition: .1s;
}
.jscon-btn:hover {
    --background: var(--color-scheme-background-hover, #dee1e6);
}
.panels {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.panels > * {
    flex: 1;
}
`+`.console-panel {
    display: flex; flex-direction: column; 
    flex: 1; overflow: hidden;
}
.console-btns {
    display: flex;
    border-bottom: 1px solid;
    padding: 5px;
}
.console-btns * {
    font-family: monospace;
    font-size: small;
}
.console-btns button {
    padding: 0;
}
.console-btns .split {
    border-right: 1px solid;
    display: inline-block;
    width: 1px;
    margin: 0 5px;
}
.console-messages {
    flex: 1;
    cursor: default;
}
.console-messages > .row {
    font-family: var(--font-monospace);
    border-bottom: 1px solid #f0f0f0;
    padding: 2px 5px;
    font-size: small;
    white-space: pre-wrap; word-break: break-all;
    background: var(--background, inherit);
}
.console-content {
    padding: 10px;
    padding-top: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
}
.console-input {
    display: flex;
    margin-top: 5px;
}
.console-input::before {
    content: ">";
    font-family: monospace;
    display: inline-block;
    width: 1em; height: 1em;
    color: #367cf1;
}
.console-input [data-id="cons"] {
    border: none;
    outline: none;
    resize: none;
    padding: 0;
    flex: 1;
    max-height: 10em;
    white-space: pre;
    font-family: consolas, lucida console, courier new, monospace;
}
.console-input [data-id="cons"]::-webkit-scrollbar {
    width: 0; height: 0;
}
.is-symbol, .is-regexp { color: #c80000 }
.is-number, .is-boolean { color: #1a1aa6 }
.is-null, .is-undefined { color: #80868b }
.is-object, .is-function { font-style: italic }
.is-error { display: block }
.row[data-type=error] {
    --background: #fff0f0;
    color: red;
}
.row[data-type=warn] {
    --background: #fffbe6;
    color: #5c3c00;
}
.row:focus, .row:focus-visible {
    outline: 0;
    --background: var(--background-row-focus, #ecf1f8);
}
.row[data-repeat-count]::before {
    content: attr(data-repeat-count);
    border: 1px solid;
    padding: 2px;
    margin-right: 5px;
    border-radius: 10px;
    display: inline-block;
    width: auto;
}
.row a.ref {
    color: var(--ref-link-color, #5f6368);
}
.row a.ref:focus {
    outline: 2px solid;
}
`+`.source-panel {
    display: flex;
}
.source-panel > .panel-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.source-panel > .panel-right > .flex-1 {
    flex: 1;
}
.user-settings fieldset+fieldset {
    margin-top: 10px;
}
`+`.jscon-messages-container {
    position: fixed;
    right: 0;
    top: calc(env(titlebar-area-y, 0px) + env(titlebar-area-height, 0px));
    z-index: 1073741823;
    height: 0;
    overflow: visible;
}
.jscon-message {
    box-sizing: border-box;
    padding: 10px;
    width: 360px;
    /*border: 1px solid gray;*/
    border-radius: 10px;
    background: var(--background);
    margin: 10px;
    box-shadow: 0 0 5px 0 #ccc;
    cursor: pointer;
    transition: all .1s;
    font-family: Consolas, monospace;
    -webkit-app-region: no-drag;
    app-region: no-drag;

    position: relative;
    top: 0;
}
.jscon-message:hover {
    --background: var(--color-scheme-background-hover, #f0f0f0);
}
.jscon-message.not-open {
    top: -200px;
}
@media screen and (max-width: 380px) {
.jscon-message {
    width: calc(100vw - 20px);
}
}

.jscon-message.is-error {
    --title-color: red;
}
`+`
`));
export const jscon_style = (function () {
    if ('adoptedStyleSheets' in document) {
        const _ = new CSSStyleSheet;
        _.replace(jscon_style_text);
        return _;
    }
    const _ = document.createElement('style');
    _.innerHTML = jscon_style_text;
    return _;
})();

export const ConMsg_Template = document.createElement('template');
ConMsg_Template.innerHTML = `
<div style="margin-bottom: 8px; color: var(--title-color, currentColor)">
    <span style="font-weight: bold"><slot name="title"></slot></span>
    <button type=button id=close style="float: right; border: 0; cursor: pointer; background: inherit; color: gray">x</button>
</div>
<div><slot></slot></div>
`;

export const ConObjView_Template = document.createElement('template');
ConObjView_Template.innerHTML = `<!--
--><style>
a { text-decoration: none; cursor: pointer } a:hover { text-decoration: underline }
::selection { background-color: rgb(141 199 248 / 60%) }
#wrapper {
    display: inline-block;
    outline: 0;
    font-family: var(--font-monospace, monospace);
}
#wrapper:focus>.object-prototype-name, #wrapper:focus-visible>.object-prototype-name {
    background-color: #e2eaf3;
}
.object-prototype-name {
    font-style: italic;
    display: inline-block;
    padding: 2px;
    border-radius: 5px;
    user-select: none;
    cursor: default;
}
.object-prototype-name::before {
    content: "+";
    margin-right: 5px;
    font-style: normal;
    color: gray;
}
.object-prototype-name.open::before {
    content: "-";
    margin-right: 5px;
}
#re_eval { color: gray; font-style: italic; }
#re_eval:not([hidden]) { margin-left: 0.5em }
#viewer:not([hidden]) { margin-left: 1em }
#viewer .property {
    display: flex;
    align-items: flex-start;
    cursor: default;
}
#viewer .property-key {
    padding: 2px;
    color: #881280;
    white-space: nowrap;
}
#viewer .property-key.is-unenumerable { opacity: 0.6; }
#viewer .property-key.is-internal { color: #5f6368; }
#viewer .property-key.is-own { font-weight: bold; }
#viewer .property-key::after {
    content: ":";
    color: var(--text-color, black);
    margin-right: 3px;
}
#viewer .property-value:not(jscon-object-viewer) {
    padding: 2px;
}
#viewer .property-value.is-string {
    color: #c80000;
}
#viewer .property-value.is-string::before, #viewer .property-value.is-string::after {
    content: "\\"";
}
#viewer .property:has(jscon-object-viewer[open]) {
    flex-direction: column;
}
#viewer .property:has(jscon-object-viewer[open]) jscon-object-viewer[open] {
    margin-left: 1em;
}
#viewer:empty::before {
    content: "(no attribute)";
    font-style: italic;
    color: gray;
    margin-left: 2em;
}
</style><div id="wrapper" tabindex=0><!--
--><span class="object-prototype-name"><slot></slot></span><!--
--><a id="re_eval" href="javascript:" hidden>re-evaluate</a><!--
--><div id="viewer" hidden></div></div>`;

export const ConTabbar_Template = document.createElement('template');
ConTabbar_Template.innerHTML = `
<div id=container>
    <span class="jscon-tabbar-placeholder">&NoBreak;</span>
</div>

<style>
#container {
    display: flex;
    background: var(--background);
    user-select: none;
    overflow: auto;
    --background: var(--color-scheme-background, #f1f3f4);
    --border-bottom-color: #cacdd1;
}
#container::-webkit-scrollbar {
    width: 0; height: 0;
}
.jscon-btn {
    cursor: pointer;
    border: 0; background: var(--background, inherit);
    transition: .1s;
}
.jscon-btn:hover {
    --background: var(--color-scheme-background-hover, #dee1e6);
}
.jscon-btn:active {
    --background: var(--color-scheme-background-active, #cccccc);
}
.jscon-tabbtn {
    --background: var(--color-scheme-background, #f1f3f4);
    padding: 5px 10px; margin: 0;
    border-bottom: 1px solid var(--border-bottom-color);
}
#container>.jscon-tabbtn * {
    pointer-events: none; /* 方便判断ev.target */
}
#container>.jscon-tabbar-placeholder {
    flex: 1;
    border-bottom: 1px solid var(--border-bottom-color);
}
.jscon-tabbtn[data-is-current] {
    border-bottom: 2px solid #1a73e8;
    padding-bottom: 4px;
}
.jscon-closebtn {
    display: inline-block;
    margin-left: 5px;
    visibility: hidden;
    pointer-events: auto !important;
}
.jscon-tabbtn:hover .jscon-closebtn,
.jscon-tabbtn:focus .jscon-closebtn,
.jscon-tabbtn:focus-within .jscon-closebtn {
    visibility: visible;
}
.jscon-tabbtn:has(.jscon-closebtn:hover) {
    --background: var(--color-scheme-background, #f1f3f4);
}
.jscon-closebtn:empty::after {
    content: "x";
    font-family: sans-serif;
    display: inline-block;
}
</style>
`;

try { await import('./jscon-util.js') } catch {}


export function register() {
    registerResizableWidget();
}


export const focusableElements = ['a', 'button',];
export const CONSOLE_HISTORY_MAX = 1000;
export const PROPERTIESCOUNTEACHPAGE = 100;

export const UrlTester = /([A-z]|[0-9]|\\|\/|\?|\[|\]|\;|\:|\,|\.|\#|\$|\%|\@|\&|\-|\+|\=|\{|\})/;

export const JSCON_INIT_OPTIONS = {
    allowPaste: false, allowClear: true,
    useStrict: { label: "'use strict'", value: false },
    sandbox: { label: 'Run code in sandbox', enforced: true },
    notifications: true,
    recordHistory: true,
};

export class Tracker extends Error {
    constructor(...args) {
        super(...args);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, Tracker);
        }

        this.name = 'Tracker';
    }
    
}

export function DOM_find(el, checker, facing = 1, _p = {}) {
    const brother = DOM_find.__data__[String(facing)][0];
    const child = DOM_find.__data__[String(facing)][1];

    if (!el) return null;
    if (_p.deep && _p.deep > 24) return null;

    if (el.childElementCount) {
        if (_p.isChild2 && checker(el)) return el;
        if (facing < 0 && !(_p.isChild || _p.isChild2)) el = el[brother] || el;
        const result = DOM_find(el[child], checker, facing, { isChild: true, isChild2: (facing < 0), isChild3: (facing < 0) });
        if (result) return result;
        if (_p.isChild && checker(el)) return el;
        return null;
    }

    let current = el; let isFirstRun = true;
    while (current) {
        if (isFirstRun && _p.isChild) {
            if (checker(current)) return current;
        }
        let new_current = current[brother];
        if (!new_current) {
            let deep = 0;
            let parent = current;
            while (deep++ < 24) {
                parent = parent.parentElement;
                if ((_p.isChild3 || facing < 0) && checker(parent)) return parent;
                if (parent[brother]) return DOM_find(parent[brother], checker, facing, { deep: (_p.deep || 0) + 1, isChild2: true });
            }
            return null;
        }
        current = new_current;
        if (checker(current)) return current;

        isFirstRun && (isFirstRun = false);
    }

    return null;
}
DOM_find.__data__ = {
    '-1': ['previousElementSibling', 'lastElementChild'],
    '1': ['nextElementSibling', 'firstElementChild'],
};

export class DataManager {
    #key = null;
    #data = null;

    constructor(key) {
        if (!key) throw new TypeError('Failed to construct DataManager: 1 paramater required');

        this.#key = key;
        this.update(true);
    }

    #last_update_time = 0;
    update(force = false) {
        let currentTime = new Date().getTime();
        if (!force) {
            if (currentTime - this.#last_update_time < 1000) return;
        }
        this.#last_update_time = currentTime;

        try {
            this.#data = JSON.parse(localStorage.getItem(this.#key));
            if (!this.#data) throw 0;
        } catch {
            this.clear();
        }
    }
    save() {
        try {
            localStorage.setItem(this.#key, JSON.stringify(this.#data));
            return true;
        } catch {
            return false;
        }
        return null;
    }

    get(key) {
        this.update();
        return Reflect.get(this.#data, key);
    }
    set(key, value) {
        Reflect.set(this.#data, key, value);
        return this.save();
    }

    clear() {
        this.#data = {};
        return this.save();
    }
    
};

export const jscon_data = new DataManager('jscon-web-data');

export class JsCon extends EventTarget {
    #el = null;
    #shadow = null;
    #widget = null;
    #consel = null;
    #consinput = null;
    #msgContainer = null;
    #history = new Array();
    #histpos = -1;
    #options = new Map();
    #disabled = false;

    get [Symbol.toStringTag]() {
        return 'JsCon';
    }

    constructor() {
        super();
        this.#el = document.createElement('jscon-console-root');
        this.#shadow = this.#el.attachShadow({ mode: 'open' });
        this.#shadow.append(ConRoot_Template.content.cloneNode(true));
        if ('adoptedStyleSheets' in document) {
            this.#shadow.adoptedStyleSheets.push(...document.adoptedStyleSheets);
            this.#shadow.adoptedStyleSheets.push(jscon_style);
        } else {
            document.head.querySelectorAll('style,link[rel=stylesheet]').forEach(el => this.#shadow.append(el.cloneNode(true)));
            this.#shadow.append(jscon_style.cloneNode(true));
        }
        this.#widget = this.#shadow.firstElementChild;
        customElements.whenDefined('resizable-widget').then(() => {
            addCSS('#container{overflow:hidden}', this.#widget.shadowRoot);
        });
        this.#consel = this.#shadow.querySelector('.console-messages');
        this.#msgContainer = this.#shadow.querySelector('.jscon-messages-container');
        (document.body || document.documentElement).append(this.#el);

        this.#initOptions();
        this.#initEnv();
        this.#registerEventHandlers();
    }

    #initOptions() {
        this.#options.label = k => {
            const obj = this.#options.get(k);
            if (obj.label) return obj.label;
            let label = '';
            for (const i of k) {
                if (/[A-Z]/.test(i)) {
                    label += ' ' + i.toLowerCase();
                } else {
                    label += i;
                }
            }
            label = label[0].toUpperCase() + label.substring(1);
            return label;
        };
        this.#options.check = k => {
            const obj = this.#options.get(k);
            if (obj === true) return true;
            if (!obj) return false;
            return !!(obj.enforced || obj.value);
        };
        this.#options.__hooks__ = new Map();
        this.#options.hook = (k, f) => {
            const F = [f];
            const oldValue = this.#options.__hooks__.get(k);
            const newValue = (!oldValue) ? F : oldValue.concat(F);
            this.#options.__hooks__.set(k, newValue);
        };
        this.#options.unhook = (k) => {
            this.#options.__hooks__.delete(k);
        };
        this.#options.update = (k, v) => {
            const hooks = this.#options.__hooks__.get(k);
            if (hooks) {
                let cancelled = false;
                const prevent = () => cancelled = true;
                for (const i of hooks) {
                    i(prevent);
                }
                if (cancelled) return false;
            }
            const obj = this.#options.get(k);
            if (obj === false || obj === true || obj == null) {
                jscon_data.set(k, v);
                return (this.#options.set(k, v));
            }
            (!obj) && (obj = {});
            obj.value = v;
            jscon_data.set(k, obj);
            return this.#options.set(k, obj);
        };
        for (const i in JSCON_INIT_OPTIONS) {
            let val = jscon_data.get(i);
            if (val == undefined) val = JSCON_INIT_OPTIONS[i];
            this.#options.set(i, val);
        }
        const opts_c = this.#widget.querySelector('[data-id=con_opts]');
        const opts = this.#widget.querySelector('[data-id=con_opts_label]');
        let isFirst = true;
        for (const i of this.#options.keys()) {
            const label = this.#options.label(i);
            const el = document.createElement('option');
            el.value = i;
            el.innerText = label;
            opts.append(el);
            if (isFirst) {
                isFirst = false;
                opts_c.checked = this.options.check(i);
                opts_c.disabled = !!(this.options.get(i)?.enforced);
            }
        }
    }

    #cons_resizeObserver = null;
    #cons_drawscrollbar() {
        const cons_sc = this.#widget.querySelector('[data-id=cons_sc]');
        const cons_sc2 = this.#widget.querySelector('[data-id=cons_sc2]');
        const max = Math.max(0, this.#consinput.scrollHeight - this.#consinput.offsetHeight);
        const value = this.#consinput.scrollTop;
        cons_sc.value = value, cons_sc.max = max;
        const max2 = Math.max(0, this.#consinput.scrollWidth - this.#consinput.offsetWidth);
        const value2 = this.#consinput.scrollLeft;
        cons_sc2.value = value2, cons_sc2.max = max2;
        
    }

    #initEnv() {
        this.forbiddenConsoleAPIs = {
            has: x => this.#forbiddenConsoleAPIs.has(x),
            values: () => {
                const arr = [];
                for (const i of this.#forbiddenConsoleAPIs) arr.push(i);
                return arr;
            },
            add: x => {
                // if (this.#forbiddenConsoleAPIs_locked) throw new TypeError('locked');
                // return this.#forbiddenConsoleAPIs.add(x);   /// 绝对不能直接return！！！
                this.#forbiddenConsoleAPIs.add(x);
                return true;
            },
            /*delete: x => {
                if (this.#forbiddenConsoleAPIs_locked) throw new TypeError('locked');
                return this.#forbiddenConsoleAPIs.delete(x);
            },
            clear: () => {
                if (this.#forbiddenConsoleAPIs_locked) throw new TypeError('locked');
                return this.#forbiddenConsoleAPIs.clear();
            },*/
        };

        const tabs = this.#widget.querySelector('[data-id=TABS]');
        const stabs = this.#widget.querySelector('[data-id=SourceTabs]');
        this.#sources.add = (data) => {
            tabs.currentTab = 1;
            const url = new URL(data, location.href);
            const filename = (url.pathname.substring(url.pathname.lastIndexOf('/') + 1)) || '(index)';
            stabs.addTab(encodeURI(url.href), filename, false, true, 0);
            stabs.currentTab = 0;
            return this.#sources.set(data, null);
        };

        const history = jscon_data.get('console-history');
        if (history) this.#history = history;

        this.#consinput = this.#widget.querySelector('[data-id=cons]');
        this.#cons_resizeObserver = new ResizeObserver(() => {
            this.#cons_drawscrollbar();
        });
        this.#cons_resizeObserver.observe(this.#consinput);


    }


    #registerEventHandlers() {
        this.#widget.addEventListener('beforeclose', function (ev) {
            
        });
        this.#widget.addEventListener('keydown', (ev) => {
            if (ev.key.toUpperCase() === 'L' && ev.ctrlKey) {
                ev.preventDefault();
                return this.doClear();
            }
        }, true);
        const closebtn = this.#widget.querySelector('[data-id=CLOSE]');
        closebtn.addEventListener('click', () => this.close());
        const tabs = this.#widget.querySelector('[data-id=TABS]');
        tabs.addEventListener('change', ev => {
            this.#shadow.querySelectorAll('.panels > *').forEach(el => el.hidden = true);
            (this.#shadow.querySelector(`.panels > [data-panel="${tabs.currentId}"]`) || {}).hidden = false;
        });
        const cons = this.#consinput;
        cons.addEventListener('keydown', ev => {
            if (ev.key === 'Enter' && !ev.shiftKey) {
                if (!ev.isTrusted) return;
                ev.preventDefault();
                return queueMicrotask(() => this.#consoleRun(cons));
            }
            if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                const selectionStart = cons.selectionStart;
                const linesTotal = cons.value.split('\n').length;
                const pos = cons.value.substring(0, selectionStart);
                const linesCurrent = pos.split('\n').length;
                if (
                    (ev.key === 'ArrowDown' && linesCurrent === linesTotal) ||
                    (ev.key === 'ArrowUp' && linesCurrent === 1)
                ) {
                    ev.preventDefault();
                    if (this.#histpos < 0) this.#histpos = this.#history.length;
                    this.#histpos += (ev.key === 'ArrowDown') ? 1 : -1;
                    this.#histpos = Math.max(0, Math.min(this.#history.length - 1, this.#histpos));
                    const val = this.#history[this.#histpos];
                    if (!val) return;
                    cons.value = val;
                    cons.rows = val.split('\n').length;
                    cons.selectionStart = cons.selectionEnd = 0;
                }
                return;
            }
            if (ev.key === 'Tab') {
                const text = cons.value;
                if (!text) return;
                ev.preventDefault();

                const selectionStart = cons.selectionStart;
                const lines = text.split('\n');
                const pos = text.substring(0, selectionStart);
                const linesCurrent = pos.split('\n').length - 1;
                // debugger
                let newStr = lines[linesCurrent];
                if (newStr) {
                    let changed = 0;
                    if (ev.shiftKey) {
                        let n = 4;
                        while (n-- && newStr[0] === ' ') {
                            newStr = newStr.substring(1);
                            changed -= 1;
                        }
                    } else {
                        changed = 4;
                        newStr = '    ' + newStr;
                    }
                    lines.splice(linesCurrent, 1, newStr);
                    
                    cons.value = lines.join('\n');
                    cons.selectionStart = cons.selectionEnd = selectionStart + changed;
                }

                return;
            }
        });
        cons.addEventListener('input', () => {
            const text = cons.value;
            const rows = text.split('\n').length;
            const originRows = +cons.rows;
            if (rows !== originRows) cons.rows = rows;
            this.#cons_drawscrollbar();
        });
        cons.addEventListener('scroll', () => {
            this.#cons_drawscrollbar();
        });
        const cons_sc = this.#widget.querySelector('[data-id=cons_sc]');
        const cons_sc2 = this.#widget.querySelector('[data-id=cons_sc2]');
        const cons_sc_a = () => { cons.scrollTop = cons_sc.value };
        const cons_sc_b = () => { cons.scrollLeft = cons_sc2.value };
        cons_sc.addEventListener('scrolling', cons_sc_a); cons_sc.addEventListener('scroll', cons_sc_a);
        cons_sc2.addEventListener('scrolling', cons_sc_b); cons_sc2.addEventListener('scroll', cons_sc_b);
        const antipaste = ev => {
            if (!this.options.check('allowPaste')) ev.preventDefault();
        };
        cons.addEventListener('paste', antipaste);
        cons.addEventListener('drop', antipaste);
        const clco = this.#shadow.querySelector('[data-id=ClearConsole]');
        clco.addEventListener('click', () => this.doClear());
        const pc = this.#shadow.querySelector('[data-id=allowPasteConfirm]');
        const pcok = this.#shadow.querySelector('[data-id=doAllowPaste]');
        const opts_c = this.#shadow.querySelector('[data-id=con_opts]');
        const opts = this.#shadow.querySelector('[data-id=con_opts_label]');
        opts.onchange = () => {
            const newValue = opts.value;
            const currentVal = this.options.check(newValue);
            opts_c.checked = currentVal;
            opts_c.disabled = !!(this.options.get(newValue)?.enforced);
        };
        opts_c.addEventListener('input', ev => {
            const newValue = opts.value;
            this.options.update(newValue, opts_c.checked);
            const currentVal = this.options.check(newValue);
            opts_c.checked = currentVal;
            opts_c.disabled = !!(this.options.get(newValue)?.enforced);
        });
        pcok.addEventListener('click', ev => {
            const nv = { enforced: true };
            this.options.set('allowPaste', nv);
            jscon_data.set('allowPaste', nv);
            opts.onchange();
        });

        this.options.hook('allowPaste', prevent => {
            prevent();
            pc.showModal();
        });

        const rst = this.#shadow.querySelector('[data-id=ResetSettings]');
        rst.onclick = () => {
            if (!confirm('Are you sure?')) return;
            jscon_data.clear();
            location.reload();
        };
        const clrch = this.#shadow.querySelector('[data-id=ClearConHist]');
        clrch.onclick = () => {
            if (clrch.$__CONFIRM__) {
                this.#showMessage('Console history was cleared', 'User Settings');
                clrch.innerText = clrch.$__INNERTEXT__;
                delete clrch.$__CONFIRM__;
                delete clrch.$__INNERTEXT__;
                return jscon_data.set('console-history', (this.#history = []));
            }
            clrch.$__CONFIRM__ = true;
            clrch.$__INNERTEXT__ = clrch.innerText;
            clrch.innerText = 'Confirm';
        };

        const ratl = this.#shadow.querySelector('[data-id=RenderAsTopLayer]');
        const tlc = this.#shadow.querySelector('[data-id="top-layer-container"]');
        ratl.onclick = () => {
            if (this.#widget.parentNode !== this.#shadow) return;
            const cs = getComputedStyle(this.#widget);
            this.#widget.style.width = cs.width,
            this.#widget.style.height = cs.height;
            tlc.append(this.#widget);
            tlc.showModal();
        };
        tlc.onclose = () => {
            tlc.before(this.#widget);
        }

        const msgs = this.#shadow.querySelector('.console-messages');
        msgs.addEventListener('keydown', ev => {
            if (ev.key === 'Tab' && ev.isTrusted) {
                ev.preventDefault();
                if (ev.shiftKey) {
                    msgs.parentElement.focus();
                } else {
                    cons.focus();
                }
            }
            else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                const isDown = (ev.key === 'ArrowDown');
                const k = isDown ?
                    ['firstElementChild', 'nextElementSibling'] :
                    ['lastElementChild', 'previousElementSibling'];
                const currentFocus = ev.target;
                const top = msgs;
                const checkFocusable = el => {
                    const ti = el.tabIndex;
                    return ((ti != null && ti !== -1) || focusableElements.includes(el.tagName?.toLowerCase()));
                };
                const target = DOM_find(currentFocus, checkFocusable, isDown ? 1 : -1);
                target?.focus();
            }
            else if (ev.key === 'Home') { ev.preventDefault(); msgs.firstElementChild?.focus(); }
            else if (ev.key === 'End') { ev.preventDefault(); msgs.lastElementChild?.focus(); }
            else if (ev.key === 'Delete') {
                const path = ev.composedPath();
                for (const i of path) {
                    if (i?.classList?.contains('row')) {
                        (i.nextElementSibling || i.previousElementSibling)?.focus();
                        i.remove(); break;
                    }
                }
            }
        }, true);
        msgs.addEventListener('click', ev => {
            const target = ev.target;
            if (target.tagName?.toLowerCase() !== 'a') return;
            ev.preventDefault();

            try {
                const url = new URL(target._url);
                if (url.origin !== globalThis.location.origin) {
                    window.open(url, '_blank');
                    return;
                }

                const scrollTop = this.#consel.parentElement.scrollTop;
                //
                this.sources.add(String(url));
                queueMicrotask(() => this.#consel.parentElement.scrollTop = scrollTop);

            } catch { }

        }, true);
        msgs.addEventListener('pointerdown', ev => {
            if (ev.target?.tagName?.toUpperCase() !== 'A') return;
            if (ev.button !== 1) return;
            const href = ev.target.getAttribute('href');
            if (!href || href.startsWith('javascript:')) return;

            ev.preventDefault();
        }, true);
        const msgs_prevent = ev => {
            const target = ev.target;
            if (target.tagName?.toLowerCase() === 'a')
                ev.preventDefault();
        };
        msgs.addEventListener('contextmenu', msgs_prevent, true);
        msgs.addEventListener('dragstart', msgs_prevent, true);

        const srcurl = this.#shadow.querySelector('[data-id=SourceURL]');
        const opensrc = this.#shadow.querySelector('[data-id=OpenSource]');
        opensrc.onclick = () => {
            if (!srcurl.value) return;
            try {
                const url = new URL(srcurl.value);
                this.sources.add(url.href);
            }
            catch (error) { this.error('Invalid URL:', srcurl.value, '\n(error:', error, ')') }
        };
    }

    disableObject() {
        if (this.#disabled) throw new TypeError('object is already disabled');
        this.#disabled = true;
        this.#consoleAddRow(['<hr><div style="color: red; font-size: x-large; text-align: center;"><b>!!</b>CONSOLE IS DISABLED<b>!!</b></div>'], 'info', true);
        this.#consoleAddRow(['<div style="text-align: center;"><b>Type "close" or "x" to close the console</b></div><hr>'], 'info', true);

        this.#widget.querySelectorAll('.console-btns,jscon-tabbar,[data-panel][hidden]').forEach(el => el.remove());
    }

    get options() { return this.#options }
    set options(value) { throw new DOMException('Cannot set readonly property', 'SecurityError') }

    #createObjectView(obj) {
        const el = document.createElement('jscon-object-viewer');
        el.classList.add('is-object-view');
        el.data = obj;

        return el;
    }

    #consoleAddRow(content, type = 'log', __rich = false) {
        const el = document.createElement('div');
        el.tabIndex = 0;
        el.classList.add('row');
        const nodes = [];
        for (let i = 0; i < content.length; ++i) try {
            const item = content[i];
            const itemtype = typeof item;
            if ((type === 'dir' || itemtype === 'object') && (item != null) &&
                ((!(item instanceof Error || item instanceof RegExp)) || type === 'dir')) {
                const node = this.#createObjectView(item);
                if (!node) throw new Error('Internal Error: Assertion Failed');
                nodes.push(node);
            }
            else {
                const node = document.createElement('span');
                switch (itemtype) {
                    case 'string':
                        node.classList.add('is-string');
                        node[__rich ? 'innerHTML' : 'innerText'] = node._text = item;
                        break;
                
                    case 'number':
                    case 'symbol':
                    case 'boolean':
                    case 'function':
                    case 'undefined':
                        node.classList.add('is-' + itemtype);
                        node.innerText = node._text = String(item);
                        break;
                
                    case 'object':
                        if (item === null) {
                            node.classList.add('is-null');
                            node.innerText = node._text = String(item);
                        } else if (item instanceof RegExp) {
                            node.classList.add('is-regexp');
                            node.innerText = node._text = String(item);
                        } else if (item instanceof Error) {
                            node.classList.add('is-error');
                            node.innerText = node._text = String(item) + '\n' + String(item.stack);
                        } else {
                            node.classList.add('is-object');
                            node.innerText = node._text = String(item);
                        }
                        break;
            
                    default:
                        node.innerText = node._text = String(item);
                }
                nodes.push(node);
            }
            nodes.push(' ');
        } catch (error) {
            const node = document.createElement('span');

            node.style.color = 'red';
            try { node.innerText = node._text = `[Error writing console: ${error}]`; }
            catch {
                try { node.innerText = node._text = `[Error writing console: ${Object.toString.call(error)}]`; }
                catch { node.innerText = node._text = '[Error writing console: Unknown Error]' }
            }
            
            nodes.push(node);
            nodes.push(' ');
        }
        nodes.pop();
        for (const i of nodes) {
            if (i._text?.includes('http')) {
                const t = i._text, tl = t.length;
                i.innerHTML = '';
                let lastIndex = 0, lastEnds = 0;
                while (1) {
                    let index = t.indexOf('http', lastIndex);
                    if (index < 0) break;
                    let ends = tl;
                    for (let j = index; j < tl; ++j){
                        if (!UrlTester.test(t[j])) {
                            ends = j; break;
                        }
                    }
                    const urlPart = (t.substring(index, ends));
                    i.append(t.substring(lastEnds, index));
                    const a = document.createElement('a');
                    a.href = '#/$console/refs/Ref@source';
                    a.innerText = a._url = urlPart;
                    a.className = 'ref';
                    i.append(a);
                    lastIndex = index + 1;
                    lastEnds = ends;
                }
                i.append(t.substring(lastEnds));
            }
            el.append(i);
        }
        el.dataset.type = type;

        const ipt = this.#widget.querySelector('.console-content');
        let oldScrollTop = ipt.scrollTop + ipt.offsetHeight, oldScrollHeight = ipt.scrollHeight;
        let needToScrollToBottom = (oldScrollHeight - oldScrollTop) < 30;

        const lec = this.#consel.lastElementChild;
        let justRepeated = false;
        this.#consel.append(el);
        if (lec && (lec.innerText === el.innerText) && (lec.dataset.type === el.dataset.type)) {
            justRepeated = true;
            let rc = lec.dataset.repeatCount;
            if (!rc) rc = 1;
            lec.dataset.repeatCount = ++rc;
            el.remove();
        }
        else {
            if (this.#consel.childElementCount > 2000) {
                this.#consel.firstElementChild.remove();
            }
        }

        const cons = this.#widget.querySelector('[data-id=cons]');
        cons.rows = 1;
        if (needToScrollToBottom) ipt.scrollTop = ipt.offsetHeight + ipt.scrollHeight;

        return justRepeated ? lec : el;
    }
    #addSysInfo(text) {
        const el = document.createElement('div');
        el.tabIndex = 0;
        el.classList.add('row');
        const node = document.createElement('span');
        node.className = 'is-null';
        node.style.fontStyle = 'italic';
        node.innerText = text;
        el.append(node);
        this.#consel.append(el);
    }

    #forbiddenConsoleAPIs = new Set(['close', ]);
    #forbiddenConsoleAPIs_locked = false;
    forbiddenConsoleAPIs = null;

    #consoleRun(el) {
        const code = el.value;
        if (!code) return false;
        el.value = '';

        this.log('>', code);
        this.#histpos = -1;
        if (
            (this.#history[this.#history.length - 1] !== code) &&
            (this.options.check('recordHistory'))
        ) {
            this.#history.push(code);
            if (this.#history.length > CONSOLE_HISTORY_MAX) {
                this.#history.splice(0, this.#history.length - CONSOLE_HISTORY_MAX);
            }
            jscon_data.set('console-history', this.#history);
        }
        const thisArg = this;
        const windowProxy = new Proxy({}, {
            get(target, p, receiver) {
                if (thisArg.#forbiddenConsoleAPIs.has(p)) throw new DOMException('Access denied', 'SecurityError');
                if (p in { self: 1, top: 1, parent: 1, window: 1, globalThis: 1 }) return windowProxy;
                let ret = Reflect.get(globalThis, p);
                if (typeof ret === 'function') ret = ret.bind(globalThis);
                return ret;
            },
            set(target, p, newValue, receiver) {
                if (thisArg.#forbiddenConsoleAPIs.has(p)) throw new DOMException('Access denied', 'SecurityError');
                return Reflect.set(globalThis, p, newValue);
            },
            has(target, p) {
                if (thisArg.#forbiddenConsoleAPIs.has(p)) throw new DOMException('Access denied', 'SecurityError');
                return Reflect.has(globalThis, p);
            },
            ownKeys(target) {
                return Reflect.ownKeys(globalThis).filter(p => !thisArg.#forbiddenConsoleAPIs.has(p));
            },
        });

        let preps = [];
        if (this.options.check('useStrict')) preps.push("'use strict'");
        preps.push('var $ = globalThis.document.querySelector.bind(globalThis.document)');

        const forbiddens = ['// Forbidden APIs\n'];
        for (const i of this.#forbiddenConsoleAPIs) {
            forbiddens.push(`const ${i} = undefined;\n`);
        }
        const forbiddens_str = forbiddens.join('');

        preps.push('');
        this.#forbiddenConsoleAPIs_locked = true;
        try {
            if (this.#disabled) {
                if (code === 'close' || code === 'x') {
                    this.close();
                    throw 'Console is closed'
                }
                throw new TypeError('[SecurityError] !!CONSOLE IS DISABLED!!\nwhile trying to execute:\n\t' + code);
            }
            const fn = new (Function)(
                'window', 'globalThis', 'self', 'top', 'parent',
                'setTimeout', 'setInterval',
                'Function', 'safeContext',
                'code',
                `${preps.join(';\n')}\n${forbiddens_str}\n;return eval(code);`);
            const obj = {};
            const setTimeout = (cmd, time, ...args) => {
                if (typeof cmd === 'string') {
                    return globalThis.setTimeout(() => { return obj.fn(cmd, args) }, time, ...args);
                }
                return globalThis.setTimeout.call(globalThis, cmd, time, ...args);
            };
            const setInterval = (cmd, time, ...args) => {
                if (typeof cmd === 'string') {
                    return globalThis.setInterval(() => { return obj.fn(cmd, args) }, time, ...args);
                }
                return globalThis.setInterval.call(globalThis, cmd, time, ...args);
            };
            const boundFn = fn.bind(Object.create(null),
                windowProxy, windowProxy, windowProxy, windowProxy, windowProxy,
                setTimeout, setInterval,
                Function, obj);
            obj.fn = boundFn;
            const ret = boundFn(code);
            this.log('<', ret);
        }
        catch (error) {
            this.error(error);
        }
        finally {
            this.#forbiddenConsoleAPIs_locked = false;
        }
    }

    doClear(showPrompt = false) {
        this.#consel.innerHTML = '';
        if (showPrompt) this.#addSysInfo('(console was cleared)');
    }

    open() {
        this.#widget.open = true;
        const ipt = this.#widget.querySelector('.console-content');
        ipt.scrollTop = ipt.offsetHeight + ipt.scrollHeight;
        ipt.querySelector('[data-id=cons]')?.focus();
    }
    close() {
        this.#widget.close();
        if (this.#widget.parentElement?.tagName?.toLowerCase() === 'dialog') {
            this.#widget.parentElement.close();
        }
    }

    #sources = new Map();
    get sources() { return this.#sources }

    #showMessage(message, title, type = 'info', cb = null) {
        const el = document.createElement('div');
        el.role = 'alert';
        el.className = `jscon-message is-${type} not-open`;
        el.tabIndex = 0;

        el.attachShadow({ mode: 'open' }).append(ConMsg_Template.content.cloneNode(true));
        el.innerText = String(message);
        const closebtn = el.shadowRoot.getElementById('close');
        closebtn.onkeydown = ev => ev.stopPropagation();
        closebtn.onclick = (ev) => {
            ev.stopPropagation();
            closebtn.disabled = true;
            el.style.position = 'absolute';
            let height = el.offsetHeight, currentTop = el.offsetTop - height;
            let timerId = setInterval(() => {
                currentTop -= 5;
                el.style.top = currentTop + 'px';

                if (currentTop < -height - 100) {
                    clearInterval(timerId);
                    el.remove();
                }
            }, 20);
        };
        const slot_title = document.createElement('span');
        slot_title.slot = 'title';
        slot_title.innerText = title;
        el.append(slot_title);
        const click_handler = ev => {
            queueMicrotask(() => closebtn.click());
            return (cb && cb(ev)) || 1;
        };
        el.onclick = click_handler;
        el.onkeydown = ev => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                return click_handler.apply(this, arguments);
            }
        };

        this.#msgContainer.append(el);
        if (this.#msgContainer.childElementCount > 50) {
            this.#msgContainer.firstElementChild.remove();
        }

        requestAnimationFrame(() => el.classList.remove('not-open'));
    }

    static get managedConAPIs() {
        return ['clear', 'log', 'dir', 'debug', 'error', 'warn', 'info', 'assert', 'trace'];
    }

    #consoleOrigin = null;
    #consoleThis = null;
    registerConsoleAPI(console) {
        if (this.#disabled) throw new TypeError('Object is disabled');
        if (!console) throw new TypeError('Invalid paramater');
        if (this.#consoleOrigin) throw new Error('Console API already registered');
        this.#consoleOrigin = {};
        this.#consoleThis = console;
        for (const i of JsCon.managedConAPIs) {
            this.#consoleOrigin[i] = console[i];
            console[i] = this[i].bind(this);
        }
        return true;
    }
    unregisterConsoleAPI(console) {
        if (!console) throw new TypeError('Invalid paramater');
        for (const i in this.#consoleOrigin) { console[i] = this.#consoleOrigin[i] };
        this.#consoleOrigin = null;
        return true;
    }

    #onerror(ev) {
        let untrusted = !ev.isTrusted;
        let untrusted_str = untrusted ? '[untrusted] ' : '';
        const row = this.#consoleAddRow([(`${untrusted_str}Uncaught ${ev.message}\n(${ev.filename}:${ev.lineno}:${ev.colno})`)], 'error');
        if (!this.options.check('notifications')) return;
        if (!untrusted) this.#showMessage(`${untrusted_str}Uncaught ${ev.message}`, 'JavaScript Exception', 'error', () => {
            if (!this.#widget.open) this.#widget.open = true;
            this.#widget.querySelector('[data-id=TABS]').currentTab = 0;
            row.focus();
        });
    }
    #onunhandledrejection(ev) {
        let untrusted = !ev.isTrusted;
        let untrusted_str = untrusted ? '[untrusted] ' : '';
        const row = this.#consoleAddRow([`${untrusted_str}Uncaught (in promise) ${ev.reason} (Promise:`, ev.promise, `)`], 'error');
        if (!this.options.check('notifications')) return;
        if (!untrusted) this.#showMessage(`${untrusted_str}Uncaught (in promise) ${ev.reason}`, 'JavaScript Unhandled Rejection', 'error', () => {
            if (!this.#widget.open) this.#widget.open = true;
            this.#widget.querySelector('[data-id=TABS]').currentTab = 0;
            row.focus();
        });
    }
    #bound_onerror = null;
    #bound_onunhandledrejection = null;

    addErrorHandler() {
        if (this.#disabled) throw new TypeError('Object is disabled');
        
        if (!this.#bound_onerror) this.#bound_onerror = this.#onerror.bind(this);
        if (!this.#bound_onunhandledrejection) this.#bound_onunhandledrejection = this.#onunhandledrejection.bind(this);

        globalThis.addEventListener('error', this.#bound_onerror);
        globalThis.addEventListener('unhandledrejection', this.#bound_onunhandledrejection);
    }
    removeErrorHandler() {
        this.#bound_onerror && globalThis.removeEventListener('error', this.#bound_onerror);
        this.#bound_onunhandledrejection && globalThis.removeEventListener('unhandledrejection', this.#bound_onunhandledrejection);
    }

    clear() {
        if (this.options.check('allowClear')) {
            this.doClear(true);
            return this.#consoleOrigin.clear.apply(this.#consoleThis, arguments);
        }
        this.#addSysInfo('(tried to clear console, prevented)');
    }
    log() {
        this.#consoleAddRow(arguments, 'log');
        return this.#consoleOrigin?.log?.apply(this.#consoleThis, arguments);
    }
    dir() {
        this.#consoleAddRow(arguments, 'dir');
        return this.#consoleOrigin?.dir?.apply(this.#consoleThis, arguments);
    }
    debug() {
        this.#consoleAddRow(arguments, 'debug');
        return this.#consoleOrigin?.debug?.apply(this.#consoleThis, arguments);
    }
    error() {
        this.#consoleAddRow(arguments, 'error');
        return this.#consoleOrigin?.error?.apply(this.#consoleThis, arguments);
    }
    warn() {
        this.#consoleAddRow(arguments, 'warn');
        return this.#consoleOrigin?.warn?.apply(this.#consoleThis, arguments);
    }
    info() {
        this.#consoleAddRow(arguments, 'info');
        return this.#consoleOrigin?.info?.apply(this.#consoleThis, arguments);
    }
    assert() {
        if (!arguments[0]) this.#consoleAddRow([new Error('Assertion Failed:')].concat(arguments), 'error');
        return this.#consoleOrigin?.assert?.apply(this.#consoleThis, arguments);
    }
    trace() {
        this.#consoleAddRow([
            Object.assign(new Tracker(arguments[0] || 'console.trace', 'console.trace'), { toString() { return this.message } })]
            , 'info');
        return this.#consoleOrigin?.trace?.apply(this.#consoleThis, arguments);
    }

};



export class HTMLJsconObjectViewerElement extends HTMLElement {
    #shadowRoot = null;
    
    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#shadowRoot.append(ConObjView_Template.content.cloneNode(true));


        const wrapper = this.#shadowRoot.getElementById('wrapper'),
            viewer = this.#shadowRoot.getElementById('viewer'),
            reeval = this.#shadowRoot.getElementById('re_eval'),
            opn = this.#shadowRoot.querySelector('#wrapper > .object-prototype-name');
        const toggle = () => {
            if (this.#isOpen) {
                viewer.hidden = reeval.hidden = true;
                opn.classList.remove('open');
                this.#isOpen = false;
            } else queueMicrotask(() => {
                this.load();
                viewer.hidden = reeval.hidden = false;
                opn.classList.add('open');
                this.#isOpen = true;
            });
        };
        opn.addEventListener('click', () => {
            toggle();
        });
        reeval.addEventListener('click', () => {
            this.loadMetaData();
            this.#isDirty = true, this.#_isOpen = false;
            toggle();
            const node = document.createTextNode('d');
            reeval.append(node);
            setTimeout(() => node.remove(), 1000);
        });
        wrapper.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter') return;
            if (ev.target !== wrapper) return;
            toggle();
        });


    }

    connectedCallback() {
         
    }


    #_isOpen = false;
    get #isOpen() { return this.#_isOpen }
    set #isOpen(val) {
        this.#_isOpen = val;
        this.style.display = val ? 'block' : '';
        this[val ? 'setAttribute' : 'removeAttribute']('open', '');
        return true;
    }

    #data = null;
    get data() { return this.#data; }
    set data(val) {
        this.#data = val;
        queueMicrotask(() => this.loadMetaData());
        return true;
    }


    #isDirty = true;

    loadMetaData() {
        this.#isDirty = true;

        switch (typeof this.data) {
            case 'undefined':
                this.innerText = 'undefined'; break;
            case 'string':
            case 'number':
            case 'boolean':
                this.innerText = String(this.data);
                break;
            case 'symbol':
                this.innerText = 'Symbol()';
                break;
            case 'function':
                this.innerHTML = `<span style="font-style: italic; pointer-events: none">f ${this.data.name || ''}()</span>`;
                break;
                
            case 'object':
                if (this.data === null) { this.innerText = 'null'; break; }
                try {
                    const data = this.data;
                    const prototype = Reflect.getPrototypeOf(data);
                    let objType = 'object';
                    if (prototype === Array.prototype) {
                        objType = `Array (${data.length})`;
                    }
                    // else if (prototype === Promise.prototype) {
                    //     objType = `Promise {<Querying State>}`;
                    //     const t = {};
                    //     Promise.race([data, t]).then(v => (v === t) ? "pending" : "fulfilled", () => "rejected")
                    //         .then(state => this.innerHTML = `<span>Promise {<span style="color: var(--color-text-secondary, #5f6368)">&lt;${state}&gt;</span>}</span>`);
                    // }
                    else if (prototype) {
                        const name = prototype.constructor?.name;
                        if (data[Symbol.toStringTag]) { objType = data[Symbol.toStringTag] }
                        else if (typeof data.constructor === 'function' && Object.prototype.hasOwnProperty.call(data, 'constructor')) {
                            objType = `${data.constructor.name} (constructor)`
                        }
                        else if (name) objType = name;
                    } else objType = 'Object';
                    this.innerText = objType;
                } catch { this.innerText = 'object' };
                break;
            default:
                this.innerText = 'unknown'; break;
        }

        
    }


    load(offset = 0, expandMore = false) {
        const PropertiesCountEachPage = expandMore ? 1048576 : PROPERTIESCOUNTEACHPAGE;

        if (!this.#isDirty && offset === 0) return;
        const viewer = this.#shadowRoot.getElementById('viewer');
        if (offset === 0) viewer.innerHTML = '';
        if (!this.data) return;

        const data = this.data;
        const datatype = typeof data;
        if (!(/(function|object)/.test(datatype))) return;
        const keys = Reflect.ownKeys(data), keysFromPrototypeChain = [];
        const s_key = Symbol(), s_desc = Symbol();
        const symbols2str = {
            [Symbol.toPrimitive]: "Symbol(Symbol.toPrimitive)",
            [Symbol.toStringTag]: "Symbol(Symbol.toStringTag)",
            [Symbol.iterator]: "Symbol(Symbol.iterator)",
            [Symbol.unscopables]: "Symbol(Symbol.unscopables)",
        };
        // enum prototype chain
        try {
            let temp = data;
            while ((temp = Reflect.getPrototypeOf(temp))) {
                const tkeys = Reflect.ownKeys(temp);
                for (const i of tkeys) try {
                    const desc = Object.getOwnPropertyDescriptor(temp, i);
                    if (desc && desc.value && (
                        typeof desc.value === 'symbol' ||
                        typeof desc.value === 'function'
                    )) continue;
                    if (i === '__proto__' || i in symbols2str || keys.includes(i) || keysFromPrototypeChain.includes(i)) continue;
                    keysFromPrototypeChain.push(i);
                    keys.push({ [s_key]: i, [s_desc]: desc });
                } catch { continue }
            }
        } catch {}
        // splice
        const propCount = keys.length;
        let isSpliced = false;
        if (PropertiesCountEachPage < keys.length) {
            keys.splice(offset + PropertiesCountEachPage, keys.length - offset - PropertiesCountEachPage);
            offset && keys.splice(0, offset);
            if (offset + keys.length < propCount) isSpliced = true;
        }

        const symbolName = (symbol) => {
            try {
                if (symbol in symbols2str) return symbols2str[symbol];
                return symbol.toString();
            }
            catch { return 'Symbol()'; }
        };
        const valueHandler = (value, node) => {
            switch (typeof value) {
                case 'undefined':
                    node.innerText = 'undefined';
                    node.style.color = '#80868b';
                    break;
                case 'string':
                    node.classList.add('is-string');
                case 'number':
                case 'boolean':
                    node.innerText = String(value);
                    break;
                case 'symbol':
                    node.innerText = symbolName(value);
                    break;
                case 'function':
                case 'object':
                    if (value === null) { node.innerText = 'null'; break; }
                    {
                        const node2 = document.createElement('jscon-object-viewer');
                        node2.className = 'property-value';
                        node2.data = value;
                        return node2;
                    }
                    break;
                
                default:
                    node.innerText = 'unknown'; break;
            }
        };
        for (const I of keys) {
            const i = (I && I[s_key]) ? I[s_key] : I;

            const node = document.createElement('div');
            node.className = 'property';

            const node1 = document.createElement('span');
            node1.innerText = (typeof i === 'symbol') ? symbolName(i) : String(i);
            node1.className = 'property-key';
            node.append(node1);
            if (Object.prototype.hasOwnProperty.call(data, i)) node1.classList.add('is-own');

            const node2 = document.createElement('span');
            node2.className = 'property-value';

            const desc = (I && I[s_desc]) ? I[s_desc] : Object.getOwnPropertyDescriptor(data, i);
            node1.addEventListener('click', (ev) => {
                const rect = node1.getBoundingClientRect();
                const opt = document.createElement('select');
                opt.setAttribute('style', `position: fixed; left: ${rect.x}px; top: ${rect.y}px; z-index: 1073741823; background: white; font-family: monospace; outline: 0;`);
                const opts = {
                    '(Context Menu)': () => { },
                    'Cancel': () => { },
                    'Store as global variable': () => {
                        try {
                            let global_suffix = 1;
                            while (('temp' + global_suffix) in globalThis && global_suffix < 32767) ++global_suffix;
                            const val = ((!desc) ? Reflect.get(data, i, data) : (desc.value || Reflect.get(data, i, data)));
                            globalThis['temp' + global_suffix] = val;
                            console.log('>', 'temp' + global_suffix);
                            console.log('<', val);
                        } catch (error) {
                            console.error('Cannot store as global variable:', error);
                        }
                    },
                };
                for (const i in opts) {
                    const el = document.createElement('option');
                    el.value = el.innerText = i;
                    opt.append(el);
                }
                opt.onblur = () => opt.remove();
                opt.oninput = () => {
                    opts[opt.value]?.call(this);
                    opt.blur();
                };
                (document.body || document.documentElement).append(opt);
                opt.focus();
            });
            if (desc && (!desc.enumerable)) {
                node1.classList.add('is-unenumerable');
            }
            if (!desc || 'value' in desc) try {
                const val = (!desc) ? Reflect.get(data, i, data) : desc.value;
                const newNode = valueHandler(val, node2);
                node.append(newNode || node2);
            } catch (error) {
                node2.innerText = `[Exception: ${error}]`;
                node.append(node2);
            }
            else if ('get' in desc) {
                const node4 = document.createElement('a');
                node4.className = 'property-value';
                node4.href = 'javascript:';
                node4.innerText = '(...)';
                node4.style.color = 'inherit';
                node4.title = 'Call getter';
                node4.onclick = () => {
                    try {
                        const val = Reflect.get(data, i, data);
                        const newNode = valueHandler(val, node2);
                        node4.replaceWith(newNode || node2);
                    }
                    catch (error) {
                        const node3 = document.createElement('span');
                        node3.className = 'property-value';
                        node3.append('[Exception: ', String(error), ']');
                        node4.replaceWith(node3);
                    }
                };
                node.append(node4);
            } else {
                node2.innerText = 'undefined';
                node.append(node2);
            }

            viewer.append(node);
        }
        const createInternalNode = (text) => {
            const node = document.createElement('div');
            node.className = 'property is-internal';
            const node1 = document.createElement('span');
            node1.innerText = text;
            node1.className = 'property-key is-internal';
            node.append(node1);
            return node;
        };
        const prototype = Reflect.getPrototypeOf(data);
        if (prototype && offset === 0) {
            const node = createInternalNode('[[Prototype]]');
            node.classList.add('is-prototype');
            const node2 = document.createElement('jscon-object-viewer');
            node2.className = 'property-value';
            node2.data = prototype;
            node.append(node2);
            viewer.append(node);
        }
        if (prototype === Promise.prototype && offset === 0) {
            const presult = createInternalNode('[[PromiseResult]]');
            const pstat = document.createElement('jscon-object-viewer');
            pstat.className = 'property-value';
            pstat.data = undefined;
            presult.append(pstat);
        {
            const node = createInternalNode('[[PromiseState]]');
            const node2 = document.createElement('span');
            node2.className = 'property-value is-string';
            node2.innerText = 'Querying';
            node.append(node2);
            let result = 'pending';
            data.then((data) => { result = node2.innerText = 'fulfilled'; pstat.data = data; })
                .catch((data) => { result = node2.innerText = 'rejected'; pstat.data = data; });
            queueMicrotask(() => (result === 'pending') && (node2.innerText = 'pending'));
            viewer.append(node);
        } viewer.append(presult); }
        
        if (offset !== 0) for (const i of viewer.querySelectorAll('.property.is-internal')) {
            viewer.append(i);
        }

        if (isSpliced) {
            const node = document.createElement('div');
            node.className = 'property';
            const node2 = document.createElement('a');
            node2.href = 'javascript:';
            node2.innerText = `(...) total ${propCount} properties`;
            node2.style.color = 'inherit';
            node2.title = 'Show more properties';
            node2.onclick = () => {
                node2.remove();
                this.load(offset + PropertiesCountEachPage);
            };
            node2.onpointerdown = (ev) => {
                if (ev.button !== 1) return;
                node2.remove();
                this.#isDirty = true;
                queueMicrotask(() => this.load(0, true));
            };
            node.append(node2);
            viewer.append(node);
        }

        this.#isDirty = false;
    }




};
customElements.define('jscon-object-viewer', HTMLJsconObjectViewerElement);


export class HTMLJsconTabbarElement extends HTMLElement {
    #shadowRoot = null;
    #container = null;
    #tabs = new Array();

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#shadowRoot.append(ConTabbar_Template.content.cloneNode(true));
        this.#container = this.#shadowRoot.getElementById('container');

        this.#init();

    }


    #init() {
        let pel = this.firstElementChild;
        while (pel) {
            if (pel.tagName?.toLowerCase() === 'jscon-tab') {
                this.addTab(pel.dataset.id || pel.innerText, pel.innerHTML, true);
            }

            pel = pel.nextElementSibling;
        }

        if (this.#tabs.length) this.currentTab = 0;

        this.#container.addEventListener('click', (ev) => {
            const target = (ev.target);
            if (!target?.classList?.contains('jscon-tabbtn')) return;
            const beforeChangeEvent = new CustomEvent('beforechange', { bubbles: false, cancelable: true });
            if (!this.dispatchEvent(beforeChangeEvent)) return;
            const index = target.dataset.index;
            if (index) this.currentTab = index;
        });
        this.#container.addEventListener('wheel', (ev) => {
            this.#container.scrollBy({ left: ev.deltaX || ev.deltaY, top: 0, behavior: 'smooth' });
        }, { passive: true });
    }


    #currentTab = -1;
    get currentTab() { return this.#currentTab }
    set currentTab(value) {
        if (isNaN(+value)) throw new TypeError('Invalid data type');
        if (typeof value !== 'number') value = +value;
        if (value < 0 || value >= this.#tabs.length) throw new RangeError('out of range');
        this.#currentTab = value;
        this.#updateCurrent();
        const changeEvent = new CustomEvent('change', { bubbles: true, cancelable: false });
        this.dispatchEvent(changeEvent);
        return true;
    }
    get currentId() { return this.#tabs[this.#currentTab]?.id; }
    update() {
        while (this.#container.firstElementChild?.nextElementSibling) {
            this.#container.firstElementChild.remove();
        } // clear old data(s)

        for (let I = 0, L = this.#tabs.length; I < L; ++I) {
            const i = this.#tabs[I];
            const el = document.createElement('button');
            el.className = 'jscon-btn jscon-tabbtn';
            if (I === this.#currentTab) el.dataset.isCurrent = '';
            const iid = i.id;
            el.dataset.index = I;
            el.dataset.id = iid;
            el[i.isHTML ? 'innerHTML' : 'innerText'] = i.text;
            if (i.closable) {
                const closebtn = document.createElement('button');
                closebtn.className = 'jscon-btn jscon-closebtn';
                closebtn.onclick = () => {
                    for (let I = 0, L = this.#tabs.length; I < L; ++I) {
                        const i = this.#tabs[I];
                        if (i.id === iid) {
                            return this.deleteTab(I);
                        }
                    }
                };
                el.append(closebtn);
            }
            this.#container.lastElementChild ?
                this.#container.lastElementChild.before(el) :
                this.#container.append(el);
        }

        return true;
    }
    #updateCurrent() {
        let el = this.#container.firstElementChild, success = false;
        while (el) {
            if (el.dataset.index == String(this.#currentTab)) {
                success = el;
                break;
            }
            el = el.nextElementSibling;
        }
        if (!success) return this.update();
        this.#container.querySelectorAll('[data-is-current]').forEach(el => {
            delete el.dataset.isCurrent;
        });
        success.dataset.isCurrent = '';
    }
    addTab(id, text, html = false, closable = false, pos = undefined) {
        for (let I = 0, L = this.#tabs.length; I < L; ++I) {
            const i = this.#tabs[I];
            if (i.id === id) {
                if (pos != undefined) return this.moveTab(I, pos);
                else return this.update();
            }
        }
        const obj = {
            id, text, isHTML: html, closable,
        };
        (pos === this.#tabs.length || pos == undefined) ?
            this.#tabs.push(obj) : this.#tabs.splice(pos, 0, obj);
        return this.update();
    }
    deleteTab(index) {
        if (index < 0 || index >= this.#tabs.length) throw new RangeError('out of range');
        this.#tabs.splice(index, 1);
        if (this.#currentTab >= this.#tabs.length)
            this.currentTab = Math.max(this.#tabs.length - 1, 0);
        return this.update();
    }
    moveTab(oldIndex, newIndex) {
        if (oldIndex < 0 || oldIndex >= this.#tabs.length || newIndex < 0 || newIndex >= this.#tabs.length) throw new RangeError('out of range');
        const data = this.#tabs[oldIndex];
        this.#tabs.splice(oldIndex, 1);
        this.#tabs.splice(newIndex, 0, data);
        return this.update();
    }
    getTabs() {
        return this.#tabs.concat();
    }


}
customElements.define('jscon-tabbar', HTMLJsconTabbarElement);



