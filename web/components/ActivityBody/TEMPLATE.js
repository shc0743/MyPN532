import { getHTML, getVdeep } from '@/assets/js/browser_side-compiler.js';
import { addCSS } from '../../BindMove.js';


const componentId = 'b82d54d7-db7a-4bb5-9c34-d4f2a6b455a4';

const data = {
    data() {
        return {

        }
    },

    components: {
        
    },

    methods: {
        
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


addCSS(`[${getVdeep(componentId)}]{padding:10px;overflow:auto;padding-top:0;margin-top:10px}`)


