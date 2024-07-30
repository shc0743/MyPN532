import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


const componentId = '32469c62-feff-4b2c-9d40-eaf3f66cb40e';

const data = {
    data() {
        return {
            canContinue: false,
            dumpfiles: [],
            dumpfile: [],
            dumpfileSelectAll: false,
            compare: Symbol(),
            dumpfileShowAutodump: false,

        }
    },

    components: {

    },

    methods: {
        loadFiles() {
            this.canContinue = false;
            this.dumpfiles.length = 0;
            this.dumpfile.length = 0;
            this.dumpfileSelectAll = false;
            this.dumpfiles.push('正在加载...');
            fetch('/api/v4.8/api/dumpfile' + (this.dumpfileShowAutodump ? '?autodump=true' : ''), { method: 'POST' }).then(v => v.text()).then(v => {
                if (v == '') {
                    this.dumpfiles.length = 0;
                    this.dumpfile.length = 0;
                    this.canContinue = true;
                    return;
                }
                const data = v.split('\n');
                this.dumpfiles.length = 0;
                for (const i of data) {
                    this.dumpfiles.push(i);
                }
                this.canContinue = true;
            });
        },
        async selectit(isCreate) {
            if (!this.canContinue) return ElMessage.error('现在不能继续');
            if (isCreate === this.compare) {
                const url = new URL('/dumpfile-compare.html', location.href);
                url.searchParams.set('a', this.dumpfile[0]);
                url.searchParams.set('b', this.dumpfile[1]);
                if (this.dumpfileShowAutodump) url.searchParams.set('autodump', 'true');
                window.open(url, '_blank', 'width=1000,height=600');
                return;
            }
            if (isCreate === true) try {
                const filename = (await ElMessageBox.prompt('请输入文件名:', '创建或打开文件')).value;
                const pattern = /([\:\*\?"\<\>\|]|(^aux$|^con$|^com[0-9]$|^nul$))/ig // windows
                if (pattern.test(filename)) return ElMessage.error('文件名非法')
                // this.targetFile = filename;
                location.hash = '#/dump/' + (this.dumpfileShowAutodump ? 'autodump/' : '') + encodeURIComponent(filename);
            } catch { return }
            else {
                if (this.dumpfile.length !== 1) {
                    return ElMessage.error('能且只能选择1个转储文件进行编辑')
                }
                // this.targetFile = this.dumpfile[0];
                location.hash = '#/dump/' + (this.dumpfileShowAutodump ? 'autodump/' : '') + encodeURIComponent(this.dumpfile[0]);
            }

        },
        deleteit() {
            if (!this.canContinue) return ElMessage.error('现在不能继续');
            if (this.dumpfile.length < 1 && !this.dumpfileSelectAll) {
                return ElMessage.error('必须选择转储文件')
            }
            ElMessageBox.confirm('确认删除选择的 ' + (this.dumpfileSelectAll ? this.dumpfiles.length : this.dumpfile.length) + ' 个转储文件? 此操作无法撤销。', '删除转储文件', {
                type: 'error',
                confirmButtonText: '删除',
                cancelButtonText: '不删除',
            }).then(async () => {
                try {
                    const files = this.dumpfileSelectAll ? this.dumpfiles : this.dumpfile;
                    for (const i of files) {
                        const url = new URL('/api/v4.8/api/dumpfile', location.href);
                        url.searchParams.append('filename', i);
                        if (this.dumpfileShowAutodump) url.searchParams.append('autodump', 'true');
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
        userLoadData() {
            if (!this.canContinue) return;
            this.loadFiles();
        },
        async processFileDrop(ev) {
            try {
                const files = ev.dataTransfer.files;
                if (files.length < 1) throw '拖动的不是文件';
                await ElMessageBox.confirm('要添加 ' + files.length + ' 个文件吗？已存在的文件将被覆盖。', '添加文件', {
                    confirmButtonText: '添加',
                    cancelButtonText: '不添加',
                    type: 'info',
                });
                for (const i of files) {
                    const url = new URL('/api/v4.8/api/dumpfile', location.href);
                    url.searchParams.append('filename', i.name);
                    const v = await fetch(url, {
                        method: 'PATCH',
                        body: i
                    })
                    if (!v.ok) throw '保存' + i.name + '时遇到了HTTP错误: ' + v.status + v.statusText;
                }
                ElMessage.success('保存成功!');
                this.userLoadData();
            } catch (err) {
                ElMessage.error('处理失败:' + err);
            }
        },

    },

    watch: {
        dumpfileShowAutodump() {
            this.userLoadData();
        },
    },

    mounted() {
        this.loadFiles();
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

