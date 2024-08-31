import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


const componentId = '9bd0f2a3-7b7c-446d-b27c-6e53fb41487f';

const data = {
    data() {
        return {
            enableAdService: false,
        }
    },

    components: {

    },

    methods: {
        async updateAdService() {
            userconfig.put('adservice.enabled', !this.enableAdService);
            try { await ElMessageBox.alert('要使改动生效，您需要重新加载页面。') } catch { }
            location.reload();
        },

    },

    mounted() {
        this.$nextTick(async () => {
            this.enableAdService = 'false' !== await userconfig.get('adservice.enabled');
        });
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

