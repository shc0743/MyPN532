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
            fetch('/api/v4.8/api/dumpfile', { method: 'POST' }).then(v => v.text()).then(v => {
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
            if (isCreate === true) try {
                const filename = (await ElMessageBox.prompt('请输入文件名:', '创建或打开文件')).value;
                const pattern = /([\:\*\?"\<\>\|]|(^aux$|^con$|^com[0-9]$|^nul$))/ig // windows
                if (pattern.test(filename)) return ElMessage.error('文件名非法')
                // this.targetFile = filename;
                location.hash = '#/dump/' + encodeURIComponent(filename);
            } catch { return }
            else {
                if (this.dumpfile.length !== 1) {
                    return ElMessage.error('能且只能选择1个转储文件进行编辑')
                }
                // this.targetFile = this.dumpfile[0];
                location.hash = '#/dump/' + encodeURIComponent(this.dumpfile[0]);
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

    },

    mounted() {
        this.loadFiles();
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

