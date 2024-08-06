import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';


const componentId = 'bc7316c6-d489-454f-a532-fa5da96b6aac';

const data = {
    data() {
        return {
            hasNfcDeviceDetection: false,
            nfcTagTypeInfo: '',

        }
    },

    props: {
        current_page: String,
    },

    components: {

    },

    methods: {
        startNfcDeviceDetection() {
            this.hasNfcDeviceDetection = true;
            fetch('/api/v4.8/nfc/devicedetection').then(async v => {
                if (v.ok) return await v.text();
                throw await v.text();
            }).then(v => {
                ElMessageBox.alert(v, '设备检测成功', {
                    type: 'success',
                }).catch(() => { });
            }).catch(error => {
                ElMessageBox.alert(error, '设备检测失败', {
                    type: 'error',
                }).catch(() => { });
            }).finally(() => this.hasNfcDeviceDetection = false);
        },
        startNfcTagTypeDetection() {
            this.nfcTagTypeInfo = '1';
            fetch('/api/v4.8/nfc/taginfo').then(async v => {
                if (v.ok) return await v.text();
                throw await v.text();
            }).then(v => {
                this.nfcTagTypeInfo = v;
            }).catch(error => {
                this.nfcTagTypeInfo = '!!检测失败!!\n\n' +error;
            })
        },
        showGuideAgain() {
            globalThis.appInstance_.instance.showGuide = true;
            location.href = '#/';
        },
        exitAppImmediately() {
            fetch('/api/v4.8/app/exit', { method: 'POST' }).then(v => {
                window.close();
                setTimeout(() => document.write('<h1>应用程序已退出'), 1000);
            }).catch(error => {
                ElMessage.error('无法退出应用程序: ' + error);
            })
        },

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

