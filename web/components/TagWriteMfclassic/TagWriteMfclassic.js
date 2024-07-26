import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = '99960219-4827-40f0-af99-fe93345faa58';

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

