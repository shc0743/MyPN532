import { getHTML } from 'util/browser_side-compiler.js';
import { computed, defineAsyncComponent } from 'vue';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';


const componentId = 'ddc542037065426cb2f2cd8c2f9ebac2';
export { componentId };


import { onPageLoad } from '@/vapp.load.js';


const KeyReflect = defineAsyncComponent(async () => (await import('../KeyReflect/KeyReflect.js')).default);
const TagReadMfclassic = defineAsyncComponent(async () => (await import('../TagReadMfclassic/TagReadMfclassic.js')).default);
const TagReadNtag = defineAsyncComponent(async () => (await import('../TagReadNtag/TagReadNtag.js')).default);
const TagWriteMfclassic = defineAsyncComponent(async () => (await import('../TagWriteMfclassic/TagWriteMfclassic.js')).default);
const TagWriteNtag = defineAsyncComponent(async () => (await import('../TagWriteNtag/TagWriteNtag.js')).default);
const KeyfileEditor = defineAsyncComponent(async () => (await import('../KeyfileEditor/KeyfileEditor.js')).default);
const Settings = defineAsyncComponent(async () => (await import('../Settings/Settings.js')).default);
const NdefCenter = defineAsyncComponent(async () => (await import('../NdefCenter/NdefCenter.js')).default);
const UtilitiesView = defineAsyncComponent(async () => (await import('../UtilitiesView/UtilitiesView.js')).default);
const DumpsView = defineAsyncComponent(async () => (await import('../DumpsView/DumpsView.js')).default);
const DumpEditor = defineAsyncComponent(async () => (await import('../DumpEditor/DumpEditor.js')).default);
const AboutPage = defineAsyncComponent(async () => (await import('../AboutPage/AboutPage.js')).default);
const AdService = defineAsyncComponent(async () => (await import('../AdService/AdService.js')).default);





const data = {
    data() {
        return {
            current_page: 'unknown',
            apptitle: '',
            username: '',
            sessionId: '',
            networkTimeout: -1,
            networkCongestion: false,
            is_connected: false,
            advancedUser: true,
            advancedUserOptions: '1',
            showGuide: false,
            updateTarget: 0,
        };
    },

    components: {
        KeyReflect,
        TagReadMfclassic, TagReadNtag, TagWriteMfclassic, TagWriteNtag,
        KeyfileEditor,
        Settings,
        AboutPage,
        UtilitiesView,
        DumpsView,
        DumpEditor,
        NdefCenter,
        AdService,
    },

    computed: {
        htmlEl() {
            return document.querySelector(`[data-v-${componentId}]`);
        },
        networkTimeout_style() {
            return {
                '--ball-color': 
                    this.networkCongestion ? '#d31111' :
                    (this.networkTimeout <= 100) ? 'lightgreen' ://'green' :
                    ((this.networkTimeout <= 200) ? '#ffeb3b' : '#d31111'),//'#ceb36a' : '#d31111'),
                fontFamily: 'inherit',
                position: 'fixed',
                right: '10px', top: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                color: '#ffffff',
                zIndex: 1001,
                borderRadius: '10px',
                padding: '5px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                pointerEvents: 'none',
            };
        },
    },

    provide() {
        return {
            apptitle: computed(() => this.apptitle),
            advancedUser: computed(() => this.advancedUser),
            
        }
    },

    methods: {
        userChooseTagType(type) {
            history.replaceState({}, document.title, '#/tag/' + type + '/' + this.current_page.split('/')[1]);
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        },
        applyAdvancedUserOptions() {
            userconfig.put('advancedUser', (this.advancedUser = (this.advancedUserOptions === '1'))).then(() => {
                ElMessage.success('操作成功!')
                this.$refs.advancedUserDlg.close();
            }).catch(err => {
                console.error(err);
                ElMessageBox.alert(err, '操作失败!', {
                    type: 'error',
                    confirmButtonText: '重新加载'
                }).catch(() => { }).finally(() => location.reload());
            })
        },
        launchcmd() {
            fetch('/api/v4.8/native/launchcmd', { method: 'POST' })
                .then(v => {
                    if (!v.ok) throw v.status + v.statusText;
                    ElMessage.success('成功!')
                }).catch(e => ElMessage.error('失败: ' + e));  
        },
        showAd() {
            this.$refs.adService.show();
        },
        async updateapi(value) {
            if (value === 0) {
                return this.$refs.updateDlg.close();
            }
            if (value === 2) {
                userconfig.put('updatechecker.pending', null);
                userconfig.put('updatechecker.ignore', this.updateTarget);
                return this.$refs.updateDlg.close();
            }
            if (value === 1) {
                const remote_url = await (await fetch('/api/v5.0/app/update/release')).text();
                window.open(remote_url, '_blank', { width: 640, height: 480 });
                this.$refs.updateDlg.close();
                ElMessageBox.confirm('是否退出应用程序，以便进行更新？', '更新程序', {
                    confirmButtonText: '立即退出',
                    cancelButtonText: '稍后退出',
                    type: 'info',
                }).then(() => {
                    fetch('/api/v4.8/app/exit', { method: 'POST' }).then(v => {
                        window.close();
                        setTimeout(() => document.write('<h1>应用程序已退出'), 1000);
                    }).catch(error => {
                        ElMessage.error('无法退出应用程序: ' + error);
                    })
                }).catch(() => {
                });
            }
        },
        
    },

    created() {
        globalThis.appInstance_.instance = this;
    },

    mounted() {
        
        onPageLoad.apply(this);

        userconfig.get('advancedUser').then(async value => {
            if (value === 'true' || value === 'false') {
                this.advancedUser = value === 'true';
            } else {
                this.advancedUser = false;
                this.$refs.advancedUserDlg.showModal();
            }
        }).catch(ElMessage.error);

    },

    watch: {
        current_page() {
            
        },
        apptitle() {
            globalThis.document.title = this.apptitle;
        },
        showGuide(newValue, oldValue) {
            if (newValue === false && oldValue === true) {
                userconfig.put('noguide', true);
            }
        },

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

