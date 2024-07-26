// CommandPanel
import { LoadCSS } from "@/assets/js/ResourceLoader.js";


const cpTemplate = document.createElement('template');
cpTemplate.innerHTML = `
<div class="cp-editor" autofocus contenteditable />
`;
const rpTemplate = document.createElement('template');
rpTemplate.innerHTML = `

`;


export class CommandPanel {

    #wrapper = null;
    #container = null;
    #el = null;
    #rp = null;

    constructor() {
        this.#wrapper = document.createElement('dialog');
        this.#wrapper.classList.add('cp');
        this.#wrapper.classList.add('cp-wrapper');
        (document.body || document.documentElement).append(this.#wrapper);

        this.#container = document.createElement('div');
        this.#container.classList.add('cp');
        this.#container.classList.add('container');
        this.#wrapper.append(this.#container);

        this.#el = document.createElement('div');
        this.#el.classList.add('cp');
        this.#el.classList.add('CommandPanel');
        this.#el.append(cpTemplate.content.cloneNode(true));
        this.#container.append(this.#el);

        this.#rp = document.createElement('div');
        this.#rp.classList.add('cp');
        this.#rp.classList.add('result-panel');
        this.#rp.append(rpTemplate.content.cloneNode(true));
        this.#container.append(this.#rp);

        this.#el.querySelector('.cp-editor')?.addEventListener('blur', this.#onblur.bind(this));
        this.#el.querySelector('.cp-editor')?.addEventListener('keydown', this.#onkeydown.bind(this));
        this.#el.querySelector('.cp-editor')?.addEventListener('paste', this.#cleanPaste.bind(this));
        this.#el.querySelector('.cp-editor')?.addEventListener('input', this.#oninput.bind(this));
    }
        
    open() {
        this.#wrapper.showModal();
        this.#el.querySelector('.cp-editor').innerText = '';
    }

    close() {
        this.#wrapper.close();
        
    }

    get isOpen() { return !!this.#wrapper.open }
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    #onblur() {
        this.close();
    }
    #onkeydown(ev) {
        if (ev.key === 'Escape') return this.close();
        if (ev.key === 'Enter') {
            ev.preventDefault();

            return;
        }

    }
    #oninput() {
        const editor = this.#el.querySelector('.cp-editor');
        console.assert(editor);
        if (editor.innerText.includes('\n')) editor.innerText = editor.innerText.replaceAll('\n', '');
    }
    #cleanPaste(event) {
        event.preventDefault();
        let paste = event.clipboardData.getData('text');

        // filter
        paste = paste.replaceAll('\r', '').replaceAll('\n', '');

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return false;
        selection.deleteFromDocument();
        selection.getRangeAt(0).insertNode(document.createTextNode(paste));
    }

};



LoadCSS(`
.cp.cp-wrapper {
    border: 0; padding: 0;
    width: 0; height: 0;
}
.cp.container {
    position: fixed;
    left: 0; right: 0;
    top: 10px;
    width: 50%;
    margin: 0 auto;

    display: flex;
    flex-direction: column;
}
.cp.container > * {
    padding: 10px;
    border: 1px solid var(--border-color, #cccccc);
    border-radius: 4px;
    background: var(--color-scheme-background, var(--background));
    box-shadow: #cccccc 0px 0px 4px 1px;
}
.cp.CommandPanel {
    --color: black;
    -webkit-app-region: drag;
    app-region: drag;
}
.cp.CommandPanel .cp-editor {
    box-sizing: border-box;
    font-family: Consolas, monospace;
    width: 100%;
    border: 1px solid var(--color);
    padding: 5px;
    white-space: pre;
    overflow: hidden;
    border-radius: 4px;
    outline: 0;
    -webkit-app-region: no-drag;
    app-region: no-drag;
}
.cp.result-panel {
    margin-top: 10px;
}
`);


