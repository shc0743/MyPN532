import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = 'REMEMBER_TO_MODIFY_THIS_TO_A_RANDOM_UUID';

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

