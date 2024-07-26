import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = 'fc4736c6-c03a-485b-a5ea-972ca3c3d614';

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

