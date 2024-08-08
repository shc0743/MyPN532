import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import KeyReflect from '../KeyReflect/KeyReflect.js';
import { error_keywords, tickManager } from '../TagReadMfclassic/TagReadMfclassic.js';
import { ACTION_WRITE, m1_perform_action } from '../../assets/scripts/m1tag-rw.js';


const componentId = '99960219-4827-40f0-af99-fe93345faa58';

const data = {
    data() {
        return {
            page: 1,
            writePage: 'dump',//'block',
            writeBlock: {
                sector: 0, block: 0, value: ''
            },
            writeDump: {
                files: ['正在加载文件列表...'],
                file: '',
                b0: false,
            },
            Myfunc_: null,
            userkeyfile: [],
            writeSectorAll: true,
            writeSectors: [],
            writeSectorCount: 16,
            sectorSelectFunc: null,
            write_percent: 0,
            show_advanced: false,
            sessionId: 0,
            error分析: '',
            writeSectorWritten: 0,
            writeSectorToWrite: 0,
        }
    },

    components: {
        KeyReflect,
    },

    methods: {
        loadDumpfileList() {
            this.writeDump.file = '';
            fetch('/api/v4.8/api/dumpfile', { method: 'POST' }).then(v => v.text()).then(v => {
                if (v == '') {
                    this.writeDump.files.length = 0;
                    return;
                }
                const data = v.split('\n');
                this.writeDump.files.length = 0;
                for (const i of data) {
                    this.writeDump.files.push(i);
                }
            });
        },
        run(func) {
            this.Myfunc_ = func;
            this.$refs.keySelector.show();
        },
        work(param) {
            this.$refs.keySelector.close();
            this.userkeyfile.length = 0;
            for (const i of param) this.userkeyfile.push(i);
            this[this.Myfunc_]();
        },
        executeWriteBlock() {
            // TODO
            ElMessage.error('TO-DO Content');
        },
        selectsector(success) {
            this.$refs.sectorSelector.close();
            if (!success) return this.sectorSelectFunc([]);
            const sectors = [];
            for (let i = 0, l = (this.writeSectorAll ? this.writeSectorCount : this.writeSectors.length); i < l; ++i) {
                if (this.writeSectorAll) { return this.sectorSelectFunc('all') }
                const data = this.writeSectors[i];
                if (data) sectors.push(i);
            }
            this.sectorSelectFunc(sectors)
        },
        async executeWriteDump(options) {
            if (!this.writeDump.file) return ElMessage.error('未选择转储文件');
            const sectors = await new Promise((resolve) => {
                this.sectorSelectFunc = resolve;
                if (!!(options?.uid)) this.writeDump.b0 = true;
                else this.writeDump.b0 = false;
                this.$refs.sectorSelector.showModal();
            });
            if (!sectors.length) return ElMessage.error('未选择扇区');
            this.page = 2;
            this.executeWebSocketRoutine({
                type: 'write-mfclassic',
                keyfiles: this.userkeyfile.sort().join('|'),
                sectors: sectors === 'all' ? undefined : sectors.join(','),
                writeB0: this.writeDump.b0,
                unlock: !!(options?.uid),
                dumpfile: this.writeDump.file,
            });
        },
        async executeFormat(isUid) {
            try { await ElMessageBox.confirm('确定执行格式化操作吗?', '格式化标签', {
                type: 'warning',
                confirmButtonText: '继续',
                cancelButtonText: '不继续',
            }) } catch { return }
            this.page = 2;
            this.executeWebSocketRoutine({
                type: 'format-mfclassic',
                keyfiles: this.userkeyfile.sort().join('|'),
                unlock: 'uid' === isUid || 'uidreset' === isUid,
                reset: 'uidreset' === isUid,
            });
        },
        async executeLockUfuid() {
            try { await ElMessageBox.confirm('确定执行该操作吗?锁定后标签Block 0数据无法再次更改!', '锁定标签', {
                type: 'error',
                confirmButtonText: '继续',
                cancelButtonText: '不继续',
            }) } catch { return }
            this.page = 3;
            try {
                const resp = await fetch('/api/v4.8/nfc/uid/lock', { method: 'POST' });
                const text = await resp.text();
                if (text.includes("后门解锁指令[1/2]: 失败或没有响应") || text.includes('锁卡初始化指令: 失败或没有响应')) throw text;
                if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}\n\n${text}`;

                this.page = 9999;
                this.write_percent = 100;
                this.writeSectorWritten = 'N';
                this.writeSectorToWrite = 'A';
                const logNode = (node) => this.$refs.logDiv?.append(node);
                const log = (text) => logNode(document.createTextNode(text));
                log(text);
                ElMessageBox.alert('操作成功！', '锁定标签', {
                    type: 'success'
                });
            }
            catch (error) {
                this.page = 10002;
                this.errorText = '意外错误：' + error;
            }
        },
        retryAction() {
            globalThis.appInstance_.instance.current_page = 'blank';
            globalThis.appInstance_.instance.$nextTick(() => {
                globalThis.appInstance_.instance.$nextTick(() => {
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                })
            });
        },
        ontick_A() {
            if (this.write_percent < 75) ++this.write_percent;
        },
        ontick_B() {
            if (this.write_percent < 95) ++this.write_percent;
        },
        async executeWebSocketRoutine(messageToSend) {
            const nop = function () { };
            const logNode = (node) => this.$refs.logDiv?.append(node);
            const log = (text) => logNode(document.createTextNode(text));
            m1_perform_action(ACTION_WRITE, {
                'pipe-created': () => {
                    this.write_percent += 5;
                },
                'tag-read-started': () => {
                    this.write_percent = 20;
                    tickManager.add(this);
                    tickManager.ontick(this.ontick_A);
                },
                'tag-read-ended': () => {
                    this.write_percent = 78;
                    tickManager.delete(this);
                    tickManager.cancel_ontick(this.ontick_A);
                },
                'tag-write-started': () => {
                    this.write_percent = 80;
                    tickManager.add(this);
                    tickManager.ontick(this.ontick_B);
                },
            }, nop, messageToSend, {
                established: data => {
                    this.sessionId = data.sessionId;
                    this.page = 3;
                },
                sent: data => {
                    this.write_percent = 2;
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
            }).then(result => result ? JSON.parse(result) : null).then(result => {
                this.page = 9999;
                this.write_percent = 100;
                if (result) {
                    this.writeSectorWritten = result.blocksWritten;
                    this.writeSectorToWrite = result.blocksToWrite;
                } else {
                    this.writeSectorWritten = 'N';
                    this.writeSectorToWrite = 'A';
                }
                tickManager.delete(this);
                tickManager.cancel_ontick(this.ontick_B);
            }).catch(error => {
                if (this.page < 100) {
                    this.page = 10002;
                    this.errorText = error.errorText;
                    queueMicrotask(() => this.分析错误());
                }
            });


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
        doneWrite() {
            if (history.length > 1 && navigation.canGoBack) history.back();
            else {
                history.replaceState({}, document.title, '#/');
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
        },
    },

    mounted() {
        this.$nextTick(() => this.loadDumpfileList());
        this.$nextTick(() => {
            const url = new URL(location.hash.substring(1), location.href);
            const type = url.searchParams.get('type');
            if (type === 'format') {
                this.writePage = 'format';
            }
            else if (type === 'dump') {
                this.writePage = 'dump';
                const dumpfile = url.searchParams.get('dump');
                if (dumpfile) {
                    this.writeDump.file = dumpfile;
                }
            }
            else if (type === 'block') {
                this.writePage = 'block';
                const sector = url.searchParams.get('sector');
                const block = url.searchParams.get('block');
                const value = url.searchParams.get('value');
                if (sector) this.writeBlock.sector = sector;
                if (block) this.writeBlock.block = block;
                if (value) this.writeBlock.value = value;
            }
        });
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

