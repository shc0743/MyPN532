import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


const componentId = '14919a86-0dde-4e64-8ff9-302a2a01b719';

const data = {
    data() {
        return {
            hasStarted: false,
            hasFinished: false,
            hasError: false,
            errorText: '',
            pw: '',
            writeDump: {
                files: ['正在加载文件列表...'],
                file: '',
                b0: false,
            },
            text: '',
            option: [false,false,false,false],
        }
    },

    components: {

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
        writeit() {
            if (!this.writeDump.file) return ElMessage.error('请选择文件');
            this.hasStarted = true;
            const data = {
                file: this.writeDump.file,
                pw: this.pw ? this.pw : undefined,
                option: this.option.map(v => v ? 1 : 0).join(''),
            };
            fetch('/api/v4.8/nfc/ultralight/write', {
                method: 'POST',
                body: JSON.stringify(data),
            }).then(async v => {
                if (!v.ok) throw `HTTP 请求错误 ${v.status}: ${v.statusText}\n\n${await v.text()}`
                return await v.text()
            }).then(text => {
                this.hasFinished = true;
                this.text = text;
            }).catch(error => {
                this.hasFinished = this.hasError = true;
                this.errorText = error;
            })
        },

    },

    mounted() {
        this.$nextTick(() => this.loadDumpfileList());
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

