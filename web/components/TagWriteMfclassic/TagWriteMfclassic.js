import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import KeyReflect from '../KeyReflect/KeyReflect.js';
import { error_keywords, tickManager } from '../TagReadMfclassic/TagReadMfclassic.js';
import { ACTION_READ, ACTION_WRITE, m1_perform_action } from '../../assets/scripts/m1tag-rw.js';


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
                nobcc: false,
            },
            writeUid: '',
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
            multi: {
                op_type: '',
                isRun: false,
                f_isUid: false,
                f_keyfiles_count: 0,
                sc: 0, fc: 0,
                stat: 0,
                interval: 0,
                last_id: null,
                resultHasProceed: false,
                startTime: null,
                enable_log: false,
                log_name: '',
            },
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
                noBccCheck: this.writeDump.nobcc,
            });
        },
        async executeFormat(isUid, doesWarning = true) {
            if (doesWarning) try { await ElMessageBox.confirm('确定执行格式化操作吗?', '格式化标签', {
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
        async executeSetUid(isUid) {
            if (!this.writeUid) return ElMessage.error('必须输入新UID');
            this.page = 2;
            if (isUid === true) {
                this.executeWebSocketRoutine({
                    type: 'format-mfclassic',
                    unlock: true,
                    reset: true,
                    newUid: this.writeUid,
                }); return;
            }

            try {
                if (this.writeUid.length !== 8) throw 'UID长度不正确。此功能仅支持 Mifare Classic S50 (1K) 标签，该卡种UID长度为4字节（8个字符）';
                this.page = 3;
                const filename = (await m1_perform_action(ACTION_READ, {}, () => { }, {
                    use_mfoc: true,
                    sectors: '0',
                    keyfiles: this.userkeyfile.sort().join('|'),
                }));
                const url = new URL('/api/v4.8/api/dumpfile', location.href);
                url.searchParams.append('filename', filename);
                url.searchParams.append('autodump', 'true');
                const data = new Uint8Array(await (await fetch(url)).arrayBuffer());
                await fetch(url, { method: 'DELETE' });
                if (data.length !== 1024) throw '标签大小不正确，此功能仅支持 Mifare Classic S50 (1K) 标签';
                const s = (d, n) => d.substring(n * 2, n * 2 + 2);
                const h = s => parseInt(s, 16);
                for (let i = 0; i < 4; ++i) data[i] = h(s(this.writeUid, i));
                const correctBCC = data[0] ^ data[1] ^ data[2] ^ data[3];
                data[4] = correctBCC;
                url.searchParams.delete('autodump');
                const upload_resp = await fetch(url, { method: 'PUT', body: data });
                if (!upload_resp.ok) throw '文件保存失败：' + upload_resp.status;
                const p = this.executeWebSocketRoutine({
                    type: 'write-mfclassic',
                    keyfiles: this.userkeyfile.sort().join('|'),
                    sectors: '0',
                    writeB0: true,
                    dumpfile: filename,
                });
                p.finally(() => fetch(url, { method: 'DELETE' }));
            } catch (error) {
                // if (typeof error !== 'string') console.error(error);
                this.page = 10002;
                this.errorText = '意外错误：' + error ? (error.errorText || error) : '未知错误';
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
            return m1_perform_action(ACTION_WRITE, {
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
                tickManager.cancel_ontick(this.ontick_A); // 特殊情况,e.g.因写入错误而中断
                tickManager.cancel_ontick(this.ontick_B);
            }).catch(error => {
                if (this.page < 100) {
                    this.page = 10002; this.show_advanced = false;
                    this.errorText = error.errorText || String(error) ;
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
            this.page = 1;
            return;
            
            if (history.length > 1 && navigation.canGoBack) history.back();
            else {
                history.replaceState({}, document.title, '#/');
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
        },
        async readSetUid() {
            try {
                const taginforesp = await fetch('/api/v4.8/nfc/taginfojson');
                if (!taginforesp.ok) throw '标签读取失败，请检查标签及设备连接\n\nHTTP Error: ' + taginforesp.status + ' ' + taginforesp.statusText;
                const taginfo = await taginforesp.json();
                this.writeUid = taginfo.uid;
            } catch (error) {
                ElMessage.error('读取失败，请先将标签放在读卡器上再按此按钮');
            }
        },

        multi_run() {
            const type = this.multi.op_type;
            switch (type) {
                case 'format': queueMicrotask(async () => {
                    this.page = 1999;
                    this.multi.isRun = true;
                    this.multi.stat = 0;
                    
                    this.multi.interval = setInterval(this.multi_interval, 1000);
                });
                    break;
            
                default:
                    return ElMessage.error('请选择操作类型');
            }
            this.multi.startTime = ((new Date()).toLocaleString());
            this.multi.log_name = ((new Date()).toISOString().replace(/(\:|-)/g, '')) + '.log';
        },
        multi_cancel() {
            clearInterval(this.multi.interval); this.multi.interval = 0;
            this.page = 1;
            // reset status
            const def = {
                isRun: false,
                sc: 0, fc: 0,
                stat: 0,
                last_id: null,
                resultHasProceed: false,
            };
            for (const i in def) this.multi[i] = def[i];
        },
        multi_f_sk(param) {
            if (param) {
                this.Myfunc_ = 'multi_f_sk';
                this.$refs.keySelector.show();
                return;
            }
            this.multi.f_keyfiles_count = this.userkeyfile.length;
        },
        async multi_interval() {
            if (this.multi.stat === 0) try {
                const taginforesp = await fetch('/api/v4.8/nfc/taginfojson');
                if (!taginforesp.ok) throw '标签读取失败，请检查标签及设备连接\n\nHTTP Error: ' + taginforesp.status + ' ' + taginforesp.statusText;
                const taginfo = await taginforesp.json();
                const m1_sak = ['08', '18'];
                const card_type =
                    m1_sak.includes(taginfo.sak) ? 'm1' :
                        (taginfo.sak === '00' && taginfo.atqa === '0044') ? 'm0' : null;
                if (!card_type) throw '无法确定标签类型（根据SAK值）。\n' + JSON.stringify(taginfo, null, 4);
                if (card_type != 'm1') throw -1;

                if (taginfo.uid === this.multi.last_id) return;
                this.multi.stat = 1;
                this.multi.last_id = taginfo.uid;
                this.multi.resultHasProceed = false;

                const type = this.multi.op_type;
                switch (type) {
                    case 'format': queueMicrotask(async () => {
                        this.executeFormat(this.multi.f_isUid, false);
                    });
                        break;

                    default:
                        return ElMessage.error('请选择操作类型');
                }

                return;
            } catch (error) {
                this.multi.last_id = null;
                return;
            }
            if (this.multi.stat === 1) {
                const type = this.multi.op_type;
                switch (type) {
                    case 'format': queueMicrotask(async () => {
                        if (this.multi.resultHasProceed) return;
                        if (this.page === 9999) {
                            this.multi.resultHasProceed = true; ++this.multi.sc;
                            tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => {
                                this.multi.stat = 0;
                            })})})})});
                            return;
                        }
                        if ((this.page >= 10001 && this.page < 11000)) {
                            this.multi.resultHasProceed = true; ++this.multi.fc;
                            ElMessage.error('操作失败! Time=' + (new Date().toISOString()));
                            tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => { tickManager.nextTick(() => {
                                this.multi.stat = 0;
                            })})})})})})})})})});
                            return;
                        }
                    });
                        break;

                    default:
                        return ElMessage.error('请选择操作类型');
                }
            }
        },

        openLogViewer(catalog) {
            window.open('#/logs/?closeless=1&catalog=' + catalog, '_blank', 'width=800,height=600');
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
            else if (type === 'lock') {
                this.writePage = 'lock_ufuid';
            }
            else if (type === 'setid') {
                this.writePage = 'setuid';
                const writeUid = url.searchParams.get('uid');
                if (writeUid) {
                    this.writeUid = writeUid;
                }
            }
            else if (type === 'multiple') {
                this.writePage = 'multiple';
            }
        });
    },
    unmounted() {
        if (this.multi.interval) {
            clearInterval(this.multi.interval); this.multi.interval = 0;
        }
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

