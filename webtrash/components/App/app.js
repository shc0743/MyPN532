import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { computed, defineAsyncComponent } from 'vue';
import { db_name } from '@/assets/app/userdata.js';
import '../tree-view/TreeView.js';
import '../VList/VList.js';
const MainView = defineAsyncComponent(() => import('./main-view.js'));


const componentId = '3f293ccfe960475eb8534bdcc5fb0633';
export { componentId };



const data = {
    data() {
        return {
            current_page: 'unknown',
            apptitle: '',
            

        };
    },

    components: {
        MainView,
        
    },

    computed: {
        htmlEl() {
            return document.querySelector(`[data-v-${componentId}]`);
        },
    },

    provide() {
        return {
            apptitle: computed(() => this.apptitle),
            
        }
    },

    methods: {
        skipToContent(ev) {
            ev.target.blur();
            this.htmlEl.querySelector(`main [tabindex="0"], main input, main button, main a[href]`)?.focus();
        },
        skipToServerList(ev) {
            ev.target.blur();
            this.htmlEl.querySelector('aside [data-id="allServers"]')?.focus();
        },

        

    },

    created() {
        globalThis.appInstance_.instance = this;
    },

    mounted() {

    },

    watch: {
        current_page() {
            this.apptitle = globalThis.tr ?
                globalThis.tr('doctitle$=' + this.$data.current_page, '')
                + globalThis.tr('document.title') :
                globalThis.document.title;
        },
        apptitle() {
            globalThis.document.title = this.apptitle;
        },

    },

    template: await getHTML('components/App/app.js', componentId),

};


export default data;

