import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import KeyReflect from '../KeyReflect/KeyReflect.js';


const componentId = 'd6ab01cb-20d5-40a9-9900-6aa5f45da81a';

const data = {
    data() {
        return {
            canContinue: false,
            targetFile: '',
            keyfiles: [],
            keyfile: [],
            keyfileSelectAll: false,
            isTargetFileLoaded: false,
        }
    },

    components: {
        KeyReflect,
        
    },

    methods: {
        loadFiles() {
            this.canContinue = false;
            this.keyfiles.length = 0;
            this.keyfile.length = 0;
            this.keyfileSelectAll = false;
            this.isTargetFileLoaded = false;
            this.targetFile = '';
            this.keyfiles.push('正在加载...');
            fetch('/api/v4.8/api/keyfile', { method: 'POST' }).then(v => v.text()).then(v => {
                if (v == '') {
                    this.keyfiles.length = 0;
                    this.keyfile.length = 0;
                    this.canContinue = true;
                    return;
                }
                const data = v.split('\n');
                this.keyfiles.length = 0;
                for (const i of data) {
                    this.keyfiles.push(i);
                }
                this.canContinue = true;
            });
        },
        async selectit(isCreate) {
            if (!this.canContinue) return ElMessage.error('现在不能继续');
            if (isCreate === true) try {
                const filename = (await ElMessageBox.prompt('请输入文件名:', '创建或打开文件')).value;
                const pattern = /([\:\*\?"\<\>\|]|(^aux$|^con$|^com[0-9]$|^nul$))/ig // windows
                if (pattern.test(filename)) return ElMessage.error('文件名非法')
                this.targetFile = filename;
            } catch { return }
            else {
                if (this.keyfile.length !== 1) {
                    return ElMessage.error('能且只能选择1个密钥文件进行编辑')
                }
                this.targetFile = this.keyfile[0];
            }
            const thus = this;
            const func = async () => {
                if (this.$refs.editorSandbox.contentWindow.document.readyState !== 'complete') {
                    return this.$refs.editorSandbox.addEventListener('load', func);
                }
                const text = await (async () => {
                    const resp = await fetch('/api/v4.8/api/keyfile', { method: 'POST', body: this.targetFile });
                    if (resp.status === 404) return '';
                    return await resp.text();
                })();
                if (this.$refs.editorSandbox.contentWindow.document.readyState !== 'complete') {
                    return this.$refs.editorSandbox.addEventListener('load', func);
                }
                this.$refs.editorSandbox.contentWindow.document.body.innerText = text;
                this.isTargetFileLoaded = true;
                this.$refs.editorSandbox.contentWindow.addEventListener('keydown', function (ev) {
                    if (ev.ctrlKey && !ev.altKey && !ev.shiftKey && (ev.key === 'S' || ev.key === 's')) {
                        ev.preventDefault();
                        ev.returnValue = false;
                        thus.savefile(true);
                        return false;
                    }
                })
                this.$refs.editorSandbox.contentWindow.addEventListener('paste', function cleanPaste(event) {
                    event.preventDefault();
                    let paste = event.clipboardData.getData('text');

                    const selection = thus.$refs.editorSandbox.contentWindow.getSelection();
                    if (!selection || !selection.rangeCount) return false;
                    selection.deleteFromDocument();
                    selection.getRangeAt(0).insertNode(document.createTextNode(paste));
                    selection.collapseToEnd();
                });
            };
            this.$nextTick(() => this.$nextTick(() => this.$nextTick(() => this.$nextTick(() => this.$nextTick(() => {
                if (this.$refs.editorSandbox.contentWindow.document.readyState !== 'complete') {
                    this.$refs.editorSandbox.addEventListener('load', func);
                } else queueMicrotask(func);
            })))));
        },
        deleteit() {
            if (!this.canContinue) return ElMessage.error('现在不能继续');
            if (this.keyfile.length < 1 && !this.keyfileSelectAll) {
                return ElMessage.error('必须选择密钥文件')
            }
            ElMessageBox.confirm('确认删除选择的 ' + (this.keyfileSelectAll ? this.keyfiles.length : this.keyfile.length) + ' 个密钥文件? 此操作无法撤销。', '删除密钥文件', {
                type: 'error',
                confirmButtonText: '删除',
                cancelButtonText: '不删除',
            }).then(async () => {
                try {
                    const files = this.keyfileSelectAll ? this.keyfiles : this.keyfile;
                    for (const i of files) {
                        const url = new URL('/api/v4.8/api/keyfile', location.href);
                        url.searchParams.append('filename', i);
                        const resp = await fetch(url, { method: 'DELETE' });
                        if (!resp.ok) throw '删除文件' + i + '时遇到的HTTP错误：' + resp.status + resp.statusText;
                    }
                    ElMessage.success('删除成功！');
                } catch (error) {
                    ElMessage.error('删除失败：' + error);
                } finally {
                    this.loadFiles();
                }
            }).catch(() => { });
        },
        savefile(save) {
            if (!save) {
                ElMessageBox.confirm('确认放弃更改？', '放弃更改', {
                    type: 'warning',
                    confirmButtonText: '放弃',
                    cancelButtonText: '不放弃',
                }).then(() => {
                    this.loadFiles();
                }).catch(() => { });
                return;
            }

            const url = new URL('/api/v4.8/api/keyfile', location.href);
            url.searchParams.append('filename', this.targetFile);
            fetch(url, {
                method: 'PATCH',
                body: this.$refs.editorSandbox.contentWindow.document.body.innerText
            }).then(v => {
                if (v.ok) ElMessage.success('保存成功！');
                else throw v.status + v.statusText;
            }).catch(e => ElMessage.error('保存失败! ' + e))
            .finally(() => this.isTargetFileLoaded = true);
            this.isTargetFileLoaded = false;

        },
        userLoadData() {
            if (!this.canContinue) return;
            this.loadFiles();
        },

    },

    mounted() {
        this.loadFiles();

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

