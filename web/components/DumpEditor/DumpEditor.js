import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


import DumpSectorEditor from '../DumpSectorEditor/DumpSectorEditor.js';


import { hexStringToArrayBuffer, formatHex } from './util.js';

const componentId = '3a16fde5-cf40-4605-b0f2-6202bc21010e';

const data = {
    data() {
        return {
            file: null,
            isMemDump: false,
            // isCompare: false,
            // compareData: {
            //     fileA: null, fileB: null,
            //     originalModel: null,
            //     modifiedModel: null,
            // },
            editdata: null,
            editorType: 'hex',

        }
    },

    components: {
        DumpSectorEditor,
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
                    // this.isCompare = false;
                    this.isMemDump = true;
                    this.file = decodeURIComponent(arr[3]);
                // } else if (file === 'compare' && arr.length > 3) {
                //     this.isMemDump = false;
                //     this.isCompare = true;
                //     const url = new URL(location.hash.substring(1), location.href);
                //     this.compareData.fileA = url.searchParams.get('a');
                //     this.compareData.fileB = url.searchParams.get('b');
                //     this.file = 'compareMode';
                } else {
                    this.isMemDump =
                        // this.isCompare =
                        false;
                    this.file = file;
                }
            } catch {}
        },
        async getFileBlob(file) {
            const url = new URL('/api/v4.8/api/dumpfile', location.href);
            url.searchParams.append('filename', file);
            const resp = (await fetch(url, {
                // body: this.file,
                method: 'HEAD',
            }));
            if (!resp.ok) throw `HTTP错误 (${resp.status} ${resp.statusText})。文件可能不存在或无法访问。`;
            const size = Number(resp.headers.get('content-length'));
            if (isNaN(size)) throw '服务器发送了无效的响应数据。';
            if (size > 1048576) throw `文件大于1MiB (大小：${size / 1048576}MiB)，无法在浏览器中编辑。请尝试使用其他编辑软件（如WinHex）。`;
            return await (await fetch(url)).blob();
        },
        async loadFile() {
            try {
                // if (this.file === 'compareMode') {
                //     this.compareData.originalModel = monaco.editor.createModel(
                //         await formatHex(await this.getFileBlob(this.compareData.fileA)),
                //         'text/plain'
                //     );
                //     this.compareData.modifiedModel = monaco.editor.createModel(
                //         await formatHex(await this.getFileBlob(this.compareData.fileB)),
                //         'text/plain'
                //     );
                //     this.$refs.editor.editor.setModel({
                //         original: this.compareData.originalModel,
                //         modified: this.compareData.modifiedModel,
                //     });
                // }

                // real load
                const blob = await this.getFileBlob(this.file);
                // this.$refs.editor.value = await formatHex(blob);
                // this.$refs.editor.editor.addAction({
                //     id: 'saveFile',
                //     label: '保存文件',
                //     keybindings: [
                //         monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                //     ],
                //     contextMenuGroupId: 'navigation',
                //     contextMenuOrder: 0.5,
                //     run: () => {
                //         this.savefile(true);
                //     }
                // });
                this.editdata = blob;
                this.$nextTick(() => this.$refs.myEditor.load());
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
        async savefile(save) {
            if (!save) {
                ElMessageBox.confirm('确认放弃更改？', '放弃更改', {
                    type: 'warning',
                    confirmButtonText: '放弃',
                    cancelButtonText: '不放弃',
                }).then(() => {
                    if (navigation.canGoBack) history.back();
                    else {
                        history.replaceState({}, document.title, '#/');
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }
                }).catch(() => { });
                return;
            }

            try {
                const blob = new Blob([hexStringToArrayBuffer(this.$refs.editor.value)]);
                const url = new URL('/api/v4.8/api/dumpfile', location.href);
                url.searchParams.append('filename', this.file);
                const v = await fetch(url, {
                    method: 'PATCH',
                    body: blob
                })
                if (v.ok) ElMessage.success('保存成功！');
                else throw v.status + v.statusText;
            } catch (e) {
                ElMessage.error('保存失败! ' + e);
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



// monaco.languages.register({ id: 'mifare_hex' });
// monaco.languages.setMonarchTokensProvider('mifare_hex', {
//     // 定义 tokens  
//     tokenizer: {
//         root: [
//             // [/[a-zA-Z_$][a-zA-Z0-9_$]*/, 'identifier'],
//             [/\b(function|var|const|let|if|else|while|do|for|return|new|delete|typeof|in|instanceof|this)\b/, 'keyword'],
//             [/\b(true|false|null|undefined|NaN|Infinity)\b/, 'keyword'],
//             // [/\b(Array|Number|String|Object|Boolean|Function|RegExp|Date|Error|Symbol|Map|Set|Promise)\b/, 'builtin'],
//             // [/\b(Math|JSON|Intl|console)\b/, 'library'],
//             // [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
//             // [/\d+([eE][-+]?\d+)?/, 'number'],
//             // [/'/, 'string', '@string'],
//             // [/\//, 'comment', '@comment'],
//             // [/[\s\t\r\n]+/, ''],
//             // [/[\{\}\[\]\(\),;\:\.]/, 'delimiter'],
//             [/(^[\s\S]{12})|([\s\S]{12}$)/, 'identifier'],
//             [/[\u00A0-\uFFFF]/, 'string']  // 将所有其他字符视为字符串（例如，在错误的情况下）  
//         ],
//         string: [
//             [/[^']+/, 'string'],
//             [/'/, 'string.escape', '@pop']
//         ],
//         comment: [
//             [/[^\/*]+/, 'comment'],
//             [/\*\//, 'comment', '@pop'],
//             [/[\/*]/, 'comment']
//         ]
//     }
// });


