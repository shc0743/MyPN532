import { getHTML } from '@/assets/js/browser_side-compiler.js';

import KeyReflect from '../KeyReflect/KeyReflect.js';


const componentId = '8997e573-122a-4b41-a60f-99f05350a37b';

const data = {
    data() {
        return {
            page: 0,
            userkeyfile: [],
            sessionId: -1,
            read_percent: 0,
            show_advanced: false,
            errorText: '',
            sectorAll: true,
            sectorStart: 0,
            sectorEnd: null,
            use_mfoc: false,

        }
    },

    components: {
        KeyReflect,
        
    },

    methods: {
        startRead(keylist) {
            this.userkeyfile = keylist;
            this.page = 1;

            userconfig.put('nfc.read.default.mfoc', String(this.use_mfoc)).catch(() => {});

            const senderId = String(new Date().getTime());
            const handler = (ws, data) => {
                if (data.senderId != senderId) return;
                appInstance_.ws.deleteHandler('session-created', handler);
                this.sessionId = data.sessionId;

                this.page = 3;
                queueMicrotask(() => {
                    appInstance_.ws.registerSessionHandler(this.sessionId, (ws, data) => {
                        const log = this.$refs.logDiv;
                        switch (data.type) {
                            case 'pipe-created':
                                switch (data.pipe) {
                                    case 'pipeKeyFile':
                                        this.read_percent = 5;
                                        break;
                                
                                    default:
                                        break;
                                }
                                break;
                            
                            case 'tag-info-loaded':
                                this.read_percent = 10;
                                if (log) try {
                                    const d = JSON.parse(data.data);
                                    const el = document.createElement('div');
                                    el.innerText = `标签读取成功！标签信息：\n    UID: ${d.uid}\n   ATQA: ${d.atqa}\n    SAK: ${d.sak}`;
                                    log.append(el);
                                } catch (err) { console.warn('[reader]', 'unhandled error:', err) }
                                break;

                            case 'run-log':
                                if (log) {
                                    log.append(document.createTextNode(data.data));
                                }
                                break;
                            
                            case 'action-ended':
                                if (!data.success) {
                                    this.page = 10002;
                                    this.errorText = data.errorText;
                                }
                                // console.log('AE', data);
                                break;
                            
                            default:
                                if (typeof data !== 'string')
                                    console.warn('[tag-read]', 'unknown data tyoe:', data);
                        }
                        // if (log) {
                        //     const el = document.createElement('div');
                        //     el.innerText = JSON.stringify(data, null, 2);
                        //     log.append(el);
                        // }
                    });
                    appInstance_.ws.s({
                        type: 'read-nfc-tag-mfclassic',
                        sessionId: this.sessionId,
                        keyfiles: this.userkeyfile.sort().join('|'),
                        use_mfoc: this.use_mfoc,
                        
                    });
                    this.read_percent = 2;
                });
            }
            appInstance_.ws.registerHandler('session-created', handler);
            const handler_end = (ws, data) => {
                if (data.sessionId != this.sessionId) return;
                appInstance_.ws.deleteHandler('session-ended', handler_end);
                
                if (this.page < 100) {
                    this.page = 10001;
                    this.errorText = '服务器意外中断了会话。';
                }
            }
            appInstance_.ws.registerHandler('session-ended', handler_end);
            appInstance_.ws.s({ type: 'create-session', senderId });
        },
        retryAction() {
            globalThis.appInstance_.instance.current_page = 'blank';
            globalThis.appInstance_.instance.$nextTick(() => {
                globalThis.appInstance_.instance.$nextTick(() => {
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                })
            })
            
        },

    },

    mounted() {
        this.page = 0;
        userconfig.get('nfc.read.default.mfoc').then(t => {
            if (t === 'true') this.use_mfoc = true;
        }).catch(() => { });
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

