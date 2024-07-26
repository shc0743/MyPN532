import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { addCSS } from '@/BindMove.js';


const componentId = '5890d748-288a-42f3-84f4-be204aa6a2a4';

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


addCSS(`
main .activity-view {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    justify-content: flex-start;
}
`);

