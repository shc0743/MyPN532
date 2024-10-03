import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


const componentId = '2966bdc0-60a6-40a9-84d4-1a28c5286a4c';

const data = {
    data() {
        return {
            shown: false,
            ver: '9.0',
            ad_link: 'javascript:',
            enableAdService: false,
        }
    },

    components: {

    },

    methods: {
        async show() {
            this.shown = true;
            this.ver = await (await fetch('/api/v5.0/api/genshin/version?cache=true')).text();
            this.ad_link = await (await fetch('/api/v5.0/api/genshin/url')).text();
        },
        manage() {
            // window.open('/#/about/?restricted=true&component=adopt', '_blank', 'width=500,height=300')
            this.$refs.options.showModal()
        },
        close() {
            this.shown = false;
            userconfig.put('adservice.ad.version_on_close', this.ver);
        },
        open() {
            window.open(this.ad_link);
        },
        async updateAdService() {
            await userconfig.put('adservice.enabled', !this.enableAdService);
            this.$refs.options.close();
            try { await ElMessageBox.alert('注意：要使改动生效，您需要重新加载页面。', '温馨提示', { confirmButtonText: '我知道了，稍后由我自己重新加载' }) } catch { }
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

