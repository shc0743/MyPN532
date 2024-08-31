import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = '2966bdc0-60a6-40a9-84d4-1a28c5286a4c';

const data = {
    data() {
        return {
            shown: false,
            ver: '9.0',
            ad_link: 'javascript:',
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
        close() {
            this.shown = false;
            userconfig.put('adservice.ad.version_on_close', this.ver);
        },
        open() {
            window.open(this.ad_link);
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

