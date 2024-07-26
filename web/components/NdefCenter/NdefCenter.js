import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = '97319b12-aad8-47e0-aa58-6cb6460c54d9';

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

