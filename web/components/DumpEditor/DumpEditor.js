import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


const componentId = '3a16fde5-cf40-4605-b0f2-6202bc21010e';

const data = {
    data() {
        return {
            file: null,
            isMemDump: false,

        }
    },

    components: {

    },

    methods: {
        updateFile() {
            try {
                const hash = location.hash;
                const arr = hash.split('/');
                // typically    #/dump/DUMPFILE
                const file = decodeURIComponent(arr[2]);
                if (!file) {
                    throw ElMessage.error('文件名解析失败');
                }
                if (file === 'mem' && arr.length > 3) {
                    // memdump
                    this.isMemDump = true;
                    this.file = decodeURIComponent(arr[3]);
                } else {
                    this.isMemDump = false;
                    this.file = file;
                }
            } catch {}
        },
        async loadFile() {
            try {
                const url = new URL('/api/v4.8/api/dumpfile', location.href);
                url.searchParams.append('filename', this.file);
                const resp = (await fetch(url, {
                    // body: this.file,
                    method: 'HEAD',
                }));
                if (!resp.ok) throw `HTTP错误 (${resp.status} ${resp.statusText})。文件可能不存在或无法访问。`; 
                const size = Number(resp.headers.get('content-length'));
                if (isNaN(size)) throw '服务器发送了无效的响应数据。';
                if (size > 1048576) throw `文件大于1MiB (大小：${size/1048576}MiB)，无法在浏览器中编辑。请尝试使用其他编辑软件（如WinHex）。`;
            } catch (error) {
                ElMessageBox.alert(error, '文件加载失败', {
                    type: 'error',
                    confirmButtonText: '取消',
                }).catch(() => { }).finally(() => {
                    if (navigation.canGoBack) history.back();
                    else {
                        history.replaceState({}, document.title, '#/');
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }
                });
            }
        },

    },

    watch: {
        file() {
            if (!this.file) return;
            this.$nextTick(() => this.$nextTick(() => this.loadFile()));
        },
    },

    mounted() {
        globalThis.appInstance_.dumpEditor = this;
        this.$nextTick(() => this.updateFile());
    },

    unmounted() {
        delete globalThis.appInstance_.dumpEditor;
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


window.addEventListener('hashchange', () => {
    const editor = globalThis.appInstance_.dumpEditor;
    if (!editor) return;
    editor.updateFile();
});


