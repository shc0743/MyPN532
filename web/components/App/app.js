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
const UpdateService = defineAsyncComponent(async () => (await import('../UpdateService/UpdateService.js')).default);
const LogView = defineAsyncComponent(async () => (await import('../Lo$FUCKEASYPRIVATE$gV$FUCKEASYPRIVATE$iew/Lo$FUCKEASYPRIVATE$gV$FUCKEASYPRIVATE$iew.js')).default);
const PositiveUpdateCheck = defineAsyncComponent(async () => (await import('../PositiveUpdateCheck/PositiveUpdateCheck.js')).default);





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
        UpdateService,
        LogView,
        PositiveUpdateCheck,
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
                zIndex: 11001,
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
                this.$refs.advancedUserDlg.close();
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

