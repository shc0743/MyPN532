import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = 'fc4736c6-c03a-485b-a5ea-972ca3c3d614';

const data = {
    data() {
        return {
            hasStarted: false,
            hasFinished: false,
            hasError: false,
            errorText: '',
            dumpfile: '',
            pw: '',
            
        }
    },

    components: {

    },

    methods: {
        readit() {
            this.hasStarted = true;
            fetch('/api/v4.8/nfc/ultralight/read', {
                method: 'POST',
                body: this.pw ? this.pw : undefined,
            }).then(async v => {
                if (!v.ok) throw `HTTP 请求错误 ${v.status}: ${v.statusText}\n\n${await v.text()}`
                return await v.text()
            }).then(text => {
                this.hasFinished = true;
                this.dumpfile = '#/dump/autodump/' + encodeURIComponent(text);
            }).catch(error => {
                this.hasFinished = this.hasError = true;
                this.errorText = error;
            })
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

