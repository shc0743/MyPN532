import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import { hexStringToArrayBuffer, formatHex, formatHexFromUint8Array } from '../DumpEditor/util.js';

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
            for (let i = 0, l = uint8Array.length; i < l; i++) {
                if (this.type === 'hex')
                    hexString += uint8Array[i].toString(16).padStart(2, '0');
                if (this.type === 'asc')
                    hexString += String.fromCharCode(uint8Array[i]);
                if (this.type === 'utf')
                    hexString += String.fromCodePoint(uint8Array[i]);
                if ((i + 1) % 16 === 0 || (i + 1 === l)) {
                    buffer.push(hexString);
                    hexString = '';
                    if ((i + 1) % 64 === 0 || (i + 1 === l)) {
                        this.sectors.push(structuredClone(buffer));
                        buffer.length = 0;
                    }
                }
            }
            
        },
        getData() {
            const r = [];
            for (const i of (this.$refs.nativeQuery.querySelectorAll('my-mf-sector-editor'))) {
                r.push(i.data);
            }
            return r;
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
.mfsector-editor.sector-editor {
    min-width: 16em;
    white-space: pre;
    padding: 2px;
}
.mfsector-editor.sector-editor:focus-visible, .mfsector-editor.sector-editor:focus {
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
.mfsector-editor .token.token-reserved {
    --token-color: #777777;
}
.mfsector-editor .token.token-value-block {
    --token-color: #caca14;
}
.mfsector-editor .token.token-keya {
    --token-color: #02cd00;
}
.mfsector-editor .token.token-keyb {
    --token-color: #7cb342;
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
            // if (data.length < 1) data = '\n';
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
                const tokenType = ['keya', 'acl', 'reserved', 'keyb', 'unknown'];
                const config = [[0, 12], [12, 18], [18, 20], [20, 32], [32]];
                for (let i = 0, l = config.length; i < l; ++i) {
                    const token = document.createElement('span');
                    token.className = 'token token-' + tokenType[i];
                    token.innerText = data.substring.apply(data, config[i]);
                    blockView.append(token);
                }

                if (data === '0'.repeat(32)) {
                    this.#errorMessage.innerHTML = '可能未发现密钥(或死扇区)';
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
            // const lines = (formatHexFromUint8Array(hexStringToArrayBuffer(this.#el.innerText
            //     // .replaceAll(/(\n){2,}?/g, '\n')
            //     .trim()
            //     .split('\n')
            //     .join('')))).split('\n'); // 重新分组数据
            const lines = this.#el.innerText.trim().split('\n');
            const userSelection = this.#shadow.getSelection().getRangeAt(0);
            const { selectionStart, isInStart } = (() => {
                if (!userSelection) return {};
                let text = '', len = -1, done = false, iis = false;
                const e = function (el) {
                    if (el.childNodes && el.childNodes.length) {
                        for (const node of el.childNodes) {
                            e(node);
                            if (done) return;
                        }
                        return;
                    }
                    if (el === userSelection.endContainer || el.parentNode === userSelection.endContainer) {
                        // if (userSelection.startContainer === el || userSelection.startContainer === el.parentNode) {
                        //     len = text.length + userSelection.endOffset;
                        // } else {
                        //     len = text.length + userSelection.endOffset;
                        // }
                        len = text.length + userSelection.endOffset;
                        done = true;
                        iis = ((userSelection.endOffset === 0));
                        return;
                    }
                    // if (el !== userSelection.startContainer) {
                    // }
                    // if (el.tagName === 'BR') {
                    //     text += '\n';
                    //     iis = true;
                    // } else
                        text += el.textContent;
                    return;
                    len = text.length + userSelection.startOffset;
                    done = true;
                };
                e(this.#el);
                if (len === -1) return { selectionStart: 0 };
                return { selectionStart: len, isInStart: iis };
            })();
            const lastElemIndex = lines.length - 1;
            if (lastElemIndex >= 0) {
                const elem = lines[lastElemIndex];
                if (elem.length > 32) {
                    // 自动换行
                    lines.push(elem.substring(32));
                    lines[lastElemIndex] = elem.substring(0, 32);
                }
            }
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
                    if (lengthLeft - textlength < 0) {
                        range.setStart(el, lengthLeft);
                        return (done = true);
                    } else if (lengthLeft - textlength === 0) {
                        if (isInStart && (el?.parentNode?.parentNode?.nextSibling?.childNodes?.[0]?.childNodes?.[0])) {
                            range.setStart(el?.parentNode?.parentNode?.nextSibling?.childNodes?.[0]?.childNodes?.[0], 0);
                        } else {
                            range.setStart(el, lengthLeft);
                        }
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

