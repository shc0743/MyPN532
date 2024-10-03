import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = '5e7d6dc0-fbe4-4270-b003-9453ecfad4e1';

const data = {
    data() {
        return {
            period: 0,
            result: '',
            error: '',
        }
    },

    components: {

    },

    methods: {
        back() {
            history.back();
        },
        check() {
            this.period = 1;
            globalThis.appInstance_.checkUpdate(true).then((v) => {
                if (!v) this.result = '没有可用的更新。';
            }).catch((err) => (this.period = -1, this.error = err));
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

