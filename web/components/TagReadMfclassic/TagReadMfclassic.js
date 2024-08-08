import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';

import KeyReflect from '../KeyReflect/KeyReflect.js';


const componentId = '8997e573-122a-4b41-a60f-99f05350a37b';

import { ACTION_READ, m1_perform_action } from '../../assets/scripts/m1tag-rw.js';

import { TickManager } from '../../assets/js/TickManager.js';
export const tickManager = new TickManager(200);


export const error_keywords = {
    'Error opening NFC reader': '无法连接读卡器，请检查设备连接情况',
    'Error: No tag available': '未找到标签，请将标签放在读卡器上',
    'No sector encrypted with the default key has been found, exiting..': '该标签为全加密，没有可用的密钥',
    "ERROR: This card can't do an unlocked ": '该标签不是1代魔术标签(UID卡)，无法使用解锁模式读取，请使用正常方法读取',
    "Unlock command [1/2]: failed / not acknowledged": '该标签未对解锁指令作出响应，可能不是1代魔术标签(UID卡)，无法使用解锁模式读取，请尝试使用正常方法读取',
    'Error: tag was removed': '标签可能被移走，请重试；若反复出现，则标签控制块可能损坏，如果是UID卡可以重置，其他卡大概率报废',
    'Could not open dump file:': '转储文件不存在，请检查文件可用性；如果尚未保存过此文件（文件后缀是autodump），请先保存一次再继续',
    'Try again, there are still some encrypted blocks': '标签解密失败，请尝试使用mfoc手动增加probes解密',
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
            use_raw_mfoc: false,
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

            if (!this.unlockuid) userconfig.put('nfc.read.default.mfoc', String(this.use_mfoc)).catch(() => { });

            const nop = function () { };
            const logNode = (node) => this.$refs.logDiv?.append(node);
            const log = (text) => logNode(document.createTextNode(text));
            m1_perform_action(ACTION_READ, {
                'pipe-created': data => {
                    switch (data.pipe) {
                        case 'pipeKeyFile':
                            this.read_percent = 5;
                            break;
                        default: ;
                    }
                },
                'tag-info-loaded': data => {
                    this.read_percent = 10;
                    try {
                        const d = JSON.parse(data.data);
                        const el = document.createElement('div');
                        el.innerText = `标签查询成功！标签信息：\n    UID: ${d.uid}\n   ATQA: ${d.atqa}\n    SAK: ${d.sak}`;
                        logNode(el);
                    } catch (err) { console.warn('[reader]', 'unhandled error:', err) }
                },
                'tag-read-started': data => {
                    this.read_percent = 20;
                    tickManager.add(this);
                    tickManager.ontick(this.ontick);
                },
                'action-ended': data => {
                    if (!data.success) {
                        this.page = 10002;
                        this.errorText = data.errorText;
                        queueMicrotask(() => this.分析错误());
                    }
                    tickManager.delete(this);
                    tickManager.cancel_ontick(this.ontick);
                    // console.log('AE', data);
                },
            }, nop, {
                keyfiles: this.userkeyfile.sort().join('|'),
                use_mfoc: this.use_mfoc,
                use_raw_mfoc: this.use_mfoc ? this.use_raw_mfoc : false,
                unlock: this.unlockuid,
                sector_range: this.sectorAll ? [] : [+this.sectorStart, +this.sectorEnd],
            }, {
                established: data => {
                    this.sessionId = data.sessionId;
                    this.page = 3;
                },
                sent: data => {
                    this.read_percent = 2;
                },
                log: data => {
                    log(data.data);
                },
                end: data => {
                    if (this.page < 100) {
                        this.page = 10001;
                        this.errorText = '服务器意外中断了会话。';
                    }
                },
            }).then(file => {
                this.page = 9999;
                this.dumpFile = file;
                this.read_percent = 100;
            }).catch(error => {
                if (this.page < 100) {
                    this.page = 10003;
                    this.errorText = '意外错误: ' + error;
                }
            });

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

