import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';

import KeyReflect from '../KeyReflect/KeyReflect.js';


const componentId = '8997e573-122a-4b41-a60f-99f05350a37b';

import { TickManager } from '../../assets/js/TickManager.js';
const tickManager = new TickManager(200);


const error_keywords = {
    'Error opening NFC reader': '无法连接读卡器，请检查设备连接情况',
    'Error: No tag available': '未找到标签，请将标签放在读卡器上',
    'No sector encrypted with the default key has been found, exiting..': '该标签为全加密，没有可用的密钥',
    "Note: This card can't do an unlocked read (R) ": '该标签不是1代魔术标签(UID卡)，无法使用解锁模式读取，请使用正常方法读取',
};

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
            dumpFile: '',
            unlockuid: false,
            error分析: '',

        }
    },

    components: {
        KeyReflect,
        
    },

    methods: {
        ontick() {
            if (this.read_percent < 95) ++this.read_percent;
        },
        startRead(keylist) {
            if (this.unlockuid && this.use_mfoc) {
                return ElMessage.error('mfoc不能解锁uid')
            }

            this.userkeyfile = keylist;
            this.page = 1;

            if (!this.unlockuid) userconfig.put('nfc.read.default.mfoc', String(this.use_mfoc)).catch(() => {});

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
                                    el.innerText = `标签查询成功！标签信息：\n    UID: ${d.uid}\n   ATQA: ${d.atqa}\n    SAK: ${d.sak}`;
                                    log.append(el);
                                } catch (err) { console.warn('[reader]', 'unhandled error:', err) }
                                break;
                            
                            case 'tag-read-started':
                                this.read_percent = 20;
                                tickManager.add(this);
                                tickManager.ontick(this.ontick);
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
                                    queueMicrotask(() => this.分析错误());
                                } else {
                                    this.page = 9999;
                                    // this.isDone = true;
                                    this.dumpFile = data.file;
                                    this.read_percent = 100;
                                }
                                tickManager.delete(this);
                                tickManager.cancel_ontick(this.ontick);
                                // console.log('AE', data);
                                break;
                            
                            default:
                                if (typeof data !== 'string')
                                    console.warn('[tag-read]', 'unknown data type:', data);
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
                        unlock: this.unlockuid,
                        sector_range: this.sectorAll ? [] : [this.sectorStart, this.sectorEnd],
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
        rununlockuid() {
            this.unlockuid = true;
            this.use_mfoc = false;
            this.startRead([]);
        },
        retryAction() {
            globalThis.appInstance_.instance.current_page = 'blank';
            globalThis.appInstance_.instance.$nextTick(() => {
                globalThis.appInstance_.instance.$nextTick(() => {
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                })
            });
        },
        gotoDumpFile() {
            history.replaceState({}, document.title, '#/dump/autodump/' + encodeURIComponent(this.dumpFile));
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        },
        分析错误() {
            this.error分析 = '正在分析错误信息...';
            const text = this.errorText;

            for (const i of Reflect.ownKeys(error_keywords)) {
                if (text.includes(i)) {
                    this.error分析 = error_keywords[i]; return;
                }
            }
            
            this.error分析 = '暂无可用的分析信息';
        },

    },

    mounted() {
        this.page = 0;
        userconfig.get('nfc.read.default.mfoc').then(t => {
            if (t === 'true') this.use_mfoc = true;
        }).catch(() => { });
    },
    unmounted() {
        tickManager.delete(this);
        tickManager.cancel_ontick(this.ontick);  
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

