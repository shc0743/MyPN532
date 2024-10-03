import { getHTML, getVdeep } from '@/assets/js/browser_side-compiler.js';
import { addCSS } from '@/BindMove.js';
import { ArrowLeft } from 'icons-vue';


const componentId = '1555e671-f3cf-47d4-bbcb-23664bf1cd8b';

const data = {
    data() {
        return {

        }
    },

    components: {
        ArrowLeft,
        
    },

    props: {
        closable: {
            type: Boolean,
            default: true,
        }
    },

    methods: {
        back() {
            if (history.length > 1 && navigation.canGoBack) history.back();
            else {
                history.replaceState({}, document.title, '#/');
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

addCSS(`
[${getVdeep(componentId)}] {
    padding: 0.5em;
    font-size: x-large;
    display: flex;
    flex-direction: row;
    box-shadow: 0 0 5px 0 gray;
}
`);

