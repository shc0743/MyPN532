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


class MySectorEditor extends HTMLElement {
    #shadow = null;
    #el = null;
    constructor() {
        super();

        this.#shadow = this.attachShadow({ mode: 'open' });
        this.#el = document.createElement('div');
        this.#shadow.append(this.#el);

        this.#el.innerHTML = `
        <div v-for="(data, dataIndex) in item" v-deep class="block-view">
            <span v-if="(dataIndex === 0)" class="token token-trailer">{{data}}</span>
            <template v-else-if="(dataIndex === 3)">
                <span class="token token-keya">{{data.substring(0, 12)}}</span>
                <span class="token token-acl">{{data.substring(12, 18)}}</span>
                <span class="token token-normal">{{data.substring(18, 20)}}</span>
                <span class="token token-keyb">{{data.substring(20)}}</span>
            </template>
            <span v-else class="token token-normal">{{data}}</span>
        </div>
        `;

    }

    #data = null;
    get data() { return this.#data; }
    set data(newValue) {
        this.#data = newValue;
        this.#update();
        return true;
    }

    #update() {
        
    }
    update() {
        return this.#update.apply(this, arguments);
    }
}
customElements.define('my-mf-sector-editor', MySectorEditor);

