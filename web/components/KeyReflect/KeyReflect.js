import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


const componentId = 'c168ab75-e40b-4b57-9710-f74c0f536bf4';

const data = {
    data() {
        return {
            keyfiles: [],
            keyfile: [],
            keyfileSelectAll: false,
            canContinue: false,

        }
    },

    components: {

    },

    methods: {
        load_data() {
            this.canContinue = false;
            this.keyfiles.length = 0;
            this.keyfile.length = 0;
            this.keyfiles.push('正在加载...');
            fetch('/api/v4.8/api/keyfile', { method: 'POST' }).then(v => v.text()).then(v => {
                if (v == '') {
                    this.keyfiles.length = 0;
                    ElMessageBox.alert('没有可用的密钥文件。', '找不到密钥文件', {
                        type: 'error',
                    }).catch(() => { }).finally(() => history.back());
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
        userLoadData() {
            if (!this.canContinue) return ElMessage.error('现在不能继续');
            this.load_data();
        },
        selectit() {
            if (!this.canContinue) return ElMessage.error('现在不能继续');
            if (this.keyfile.length < 1 && !this.keyfileSelectAll) {
                if (this.required) {
                    return ElMessage.error('必须选择密钥文件');
                }
            }
            this.$emit('selected', this.keyfileSelectAll ? this.keyfiles : this.keyfile);
        },
    },

    emits: ['selected'],

    props: {
        hideTitle: {
            type: Boolean,
            default: false,
        },
        required: {
            type: Boolean,
            default: true,
        },
    },

    mounted() {
        this.load_data();
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

