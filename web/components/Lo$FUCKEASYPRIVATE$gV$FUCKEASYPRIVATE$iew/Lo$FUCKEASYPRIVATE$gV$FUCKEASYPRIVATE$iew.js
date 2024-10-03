import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


const componentId = '16993e6d-96c1-4e0c-bfd5-17cd74ec81a3';

const mt = () => new Promise(queueMicrotask);
const nt = () => new Promise(queueMicrotask);

const unspecified_str = '未指定';

const data = {
    data() {
        return {
            catalogs: [],
            currentCatalog: '',
            files: [],
            currentFile: '',
            currentFilea: '',
            headless: false,
            closeless: false,
        }
    },

    components: {

    },

    methods: {
        hc(__unused1, setDef = false) {
            const h = location.hash.substring(1);
            const u = new URL(h, location.href);
            const c = u.searchParams.get('catalog');
            const f = u.searchParams.get('file');
            const l = u.searchParams.get('headless');
            if (l) this.headless = true;
            const cl = u.searchParams.get('closeless');
            if (cl) this.closeless = true;
            const ccequal = this.currentCatalog === c;
            if ((!ccequal) && c) this.currentCatalog = c;
            if (f) this[ccequal ? 'currentFile' : 'currentFilea'] = f;
            if (setDef && !c) this.currentCatalog = 'Server';
        },
    },

    watch: {
        async currentCatalog(newValue) {
            if (!newValue) {
                this.files.length = 0;
                this.currentFile = '';
                // cleanup
                this.$refs.editor.value = '';
                return;
            }
            try {
                const text = await (await fetch('/api/v5.1/app/log/list', {
                    method: 'POST',
                    body: (this.currentCatalog === unspecified_str) ? '.' : this.currentCatalog
                })).text();
                const files = text.trim().split('\n');
                this.files.length = 0;
                for (const i of files) this.files.push(i);
                this.currentFile = this.currentFilea || '';
                this.currentFilea = '';
            } catch (error) {
                ElMessageBox.alert(error, '数据加载失败', {
                    type: 'error',
                    confirmButtonText: '取消',
                }).catch(() => { })
                this.currentCatalog = null;
            }
        },
        async currentFile(newValue) {
            if (!newValue) {
                this.$refs.editor.value = ''; return;
            }
            const nt = () => new Promise(this.$nextTick);
            await mt();
            this.$refs.editor.value = '正在加载...';
            await nt();
            try {
                const text = await (await fetch('/api/v5.1/app/log/data', {
                    method: 'POST',
                    body: JSON.stringify({ catalog: (this.currentCatalog === unspecified_str) ? '.' : this.currentCatalog, file: this.currentFile })
                })).text();
                this.$refs.editor.value = text;
            } catch (error) {
                this.$refs.editor.value = '文件加载失败！\n' + error;
            }
        },
    },

    mounted() {
        queueMicrotask(async () => {
            const text = await (await fetch('/api/v5.1/app/log/list')).text();
            const catalogs = text.trim().split('\n');
            catalogs.push(unspecified_str);
            for (const i of catalogs) this.catalogs.push(i);

            this.$nextTick(() => this.hc(null, true));
        });
        globalThis.addEventListener('hashchange', this.hc);
    },

    unmounted() {
        globalThis.removeEventListener('hashchange', this.hc);
        
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

