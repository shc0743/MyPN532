import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = '9bd0f2a3-7b7c-446d-b27c-6e53fb41487f';

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

