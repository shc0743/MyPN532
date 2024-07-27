import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import { hexStringToArrayBuffer, formatHex } from '../DumpEditor/util.js';

const componentId = '42af515b-2885-4d25-9b8c-34ce37ac8817';

const data = {
    data() {
        return {
            sectors: [],

        }
    },

    props: {
        data: Blob,
        type: String,
        uppercase: Boolean,
    },

    components: {

    },

    methods: {
        async load() {
            const arrayBuffer = await this.data.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            this.sectors.length = 0;
            let hexString = '', buffer = [];
            for (let i = 0; i < uint8Array.length; i++) {
                if (this.type === 'hex')
                    hexString += uint8Array[i].toString(16).padStart(2, '0');
                if (this.type === 'asc')
                    hexString += String.fromCharCode(uint8Array[i]);
                if (this.type === 'utf')
                    hexString += String.fromCodePoint(uint8Array[i]);
                if ((i + 1) % 16 === 0) {
                    buffer.push(hexString);
                    hexString = '';
                    if ((i + 1) % 64 === 0) {
                        this.sectors.push(structuredClone(buffer));
                        buffer.length = 0;
                    }
                }
            }
            
        },
    },

    watch: {
        type() {
            queueMicrotask(() => this.load());
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


const MySectorEditorStyle = new CSSStyleSheet();
MySectorEditorStyle.replaceSync(`
.mfsector-editor .sector-editor {
    min-width: 16em;
}
.mfsector-editor .sector-editor:focus-visible, .sector-editor:focus {
    outline-color: #a0cfff;
}
.mfsector-editor .token {
    color: var(--token-color);
}
.mfsector-editor .token.token-normal {
    --token-color: #111111;
}
.mfsector-editor .token.token-trailer {
    --token-color: #9438f5;
}
.mfsector-editor .token.token-value-block {
    --token-color: #caca14;
}
.mfsector-editor .token.token-keya {
    --token-color: #73F672;
}
.mfsector-editor .token.token-keyb {
    --token-color: #368505;
}
.mfsector-editor .token.token-acl {
    --token-color: #D7722C;
}
`);
document.adoptedStyleSheets.push(MySectorEditorStyle);
class MySectorEditor extends HTMLElement {
    #shadow = null;
    #el = null;
    #errorMessage = null;

    constructor() {
        super();

        this.#shadow = this.attachShadow({ mode: 'open' });
        this.#errorMessage = document.createElement('div');
        this.#errorMessage.style.color = 'red';
        this.#shadow.append(this.#errorMessage);
        this.#el = document.createElement('div');
        this.#el.id = 'editor';
        this.#el.className = 'sector-editor mfsector-editor';
        this.#shadow.append(this.#el);

        this.#el.contentEditable = 'true';
        this.#el.innerHTML = '<div>Empty</div>';

        this.#el.addEventListener('input', this.#passiveUpdate.bind(this), {
            passive: true,
        })

        this.#shadow.adoptedStyleSheets.push(MySectorEditorStyle);

    }

    #data = null;
    get data() { return this.#data; }
    set data(newValue) {
        this.#data = newValue;
        this.#update();
        return true;
    }
    #uppercase = null;
    get uppercase() { return this.#uppercase; }
    set uppercase(newValue) {
        this.#uppercase = newValue;
        this.#update();
        return true;
    }

    #update() {
        this.#el.innerHTML = this.#errorMessage.innerHTML = '';
        let dataIndex = -1;
        for (let data of this.#data) {
            ++dataIndex;
            data = data['to' + (this.#uppercase ? 'Upp' : 'Low') + 'erCase']();

            const blockView = document.createElement('div');
            blockView.className = 'block-view';
            this.#el.append(blockView);

            if (dataIndex === 0) {
                const token = document.createElement('span');
                token.className = 'token token-trailer';
                token.innerText = data;
                blockView.append(token);
            }
            else if (dataIndex + 1 === this.#data.length) {
                const tokenType = ['keya', 'acl', 'normal', 'keyb'];
                const config = [[0, 12], [12, 18], [18, 20], [20]];
                for (let i = 0; i < 4; ++i) {
                    const token = document.createElement('span');
                    token.className = 'token token-' + tokenType[i];
                    token.innerText = data.substring.apply(data, config[i]);
                    blockView.append(token);
                }
            }
            else {
                const token = document.createElement('span');
                token.className = 'token token-normal';
                token.innerText = data;
                blockView.append(token);
            }
        }
        
    }
    update() {
        return this.#update.apply(this, arguments);
    }

    #passiveUpdate() {
        try {
            const str = this.#el.innerText.replace(/[\r\n\s]+/g, '');
            if (!(/^[0-9a-fA-F]+$/.test(str))) {
                throw new Error('Invalid hexadecimal string');
            }
            const lines = this.#el.innerText.split('\n');
            const userSelection = this.#shadow.getSelection().getRangeAt(0);
            const { selectionStart } = (() => {
                if (!userSelection) return {};
                let text = '', len = -1, done = false;
                const e = function (el) {
                    if (el.childNodes && el.childNodes.length) {
                        for (const node of el.childNodes) {
                            e(node);
                            if (done) return;
                        }
                        return;
                    }
                    if (el !== userSelection.startContainer) {
                        text += el.textContent;
                        return;
                    }
                    len = text.length + userSelection.startOffset;
                    done = true;
                };
                e(this.#el);
                if (len === -1) return { selectionStart: 0 };
                return { selectionStart: len };
            })();
            this.data = lines;
            if (userSelection) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                const range = new Range();
                let lengthLeft = selectionStart, done = false;
                const f = function (el) {
                    if (el.childNodes && el.childNodes.length) {
                        for (const node of el.childNodes) {
                            f(node);
                            if (done) return;
                        }
                        return;
                    }
                    const text = el.textContent;
                    const textlength = text.length;
                    if (lengthLeft - textlength <= 0) {
                        range.setStart(el, lengthLeft);
                        return (done = true);
                    }
                    lengthLeft -= textlength;
                }
                f(this.#el);
                range.collapse(true);
                selection.addRange(range);
            }
        }
        catch (error) {
            this.#errorMessage.innerText = `Error: The data is invalid. Details: ${error}`
        }
    }
}
customElements.define('my-mf-sector-editor', MySectorEditor);

