import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import KeyReflect from '../KeyReflect/KeyReflect.js';


const componentId = '99960219-4827-40f0-af99-fe93345faa58';

const data = {
    data() {
        return {
            page: 1,
            writePage: 'block',
            writeBlock: {
                sector: 0, block: 0, value: ''
            },
            writeDump: {
                files: ['正在加载文件列表...'],
                file: '',
                b0: false,
            },
            Myfunc_: null,
            userkeyfile: [],
            writeSectorAll: true,
            writeSectors: [],
            writeSectorCount: 16,
            sectorSelectFunc: null,
        }
    },

    components: {
        KeyReflect,
    },

    methods: {
        loadDumpfileList() {
            this.writeDump.file = '';
            fetch('/api/v4.8/api/dumpfile', { method: 'POST' }).then(v => v.text()).then(v => {
                if (v == '') {
                    this.writeDump.files.length = 0;
                    return;
                }
                const data = v.split('\n');
                this.writeDump.files.length = 0;
                for (const i of data) {
                    this.writeDump.files.push(i);
                }
            });
        },
        run(func) {
            this.Myfunc_ = func;
            this.$refs.keySelector.show();
        },
        work(param) {
            this.$refs.keySelector.close();
            this.userkeyfile.length = 0;
            for (const i of param) this.userkeyfile.push(i);
            this[this.Myfunc_]();
        },
        executeWriteBlock() {
            
        },
        selectsector(success) {
            this.$refs.sectorSelector.close();
            if (!success) return this.sectorSelectFunc([]);
            const sectors = [];
            for (let i = 0, l = (this.writeSectorAll ? this.writeSectorCount : this.writeSectors.length); i < l; ++i) {
                if (this.writeSectorAll) { sectors.push(i); continue; }
                const data = this.writeSectors[i];
                if (data) sectors.push(i);
            }
            this.sectorSelectFunc(sectors)
        },
        async executeWriteDump() {
            if (!this.writeDump.file) return ElMessage.error('未选择转储文件');
            const sectors = await new Promise((resolve) => {
                this.sectorSelectFunc = resolve;
                this.$refs.sectorSelector.showModal();
            });
            if (!sectors.length) return ElMessage.error('未选择扇区');
            this.page = 2;
            console.log(sectors);
        },
        async executeFormat() {
            try { await ElMessageBox.confirm('确定执行格式化操作吗?', '格式化标签', {
                type: 'warning',
                confirmButtonText: '继续',
                cancelButtonText: '不继续',
            }) } catch { return }
            this.page = 2;
        },
    },

    mounted() {
        this.$nextTick(() => this.loadDumpfileList());
        this.$nextTick(() => {
            const url = new URL(location.hash.substring(1), location.href);
            const type = url.searchParams.get('type');
            if (type === 'format') {
                this.writePage = 'format';
            }
            else if (type === 'dump') {
                this.writePage = 'dump';
                const dumpfile = url.searchParams.get('dump');
                if (dumpfile) {
                    this.writeDump.file = dumpfile;
                }
            }
            else if (type === 'block') {
                this.writePage = 'block';
                const sector = url.searchParams.get('sector');
                const block = url.searchParams.get('block');
                const value = url.searchParams.get('value');
                if (sector) this.writeBlock.sector = sector;
                if (block) this.writeBlock.block = block;
                if (value) this.writeBlock.value = value;
            }
        });
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

