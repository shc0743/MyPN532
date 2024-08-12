import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ACTION_READ, ACTION_WRITE, m1_perform_action } from '../../assets/scripts/m1tag-rw.js';
import { MoreFilled } from 'icons-vue';

import NdefRecord from '../NdefRecord/NdefRecord.js';
import { parseTLV } from '../../assets/scripts/parseTLV.js';
import { hexStringToArrayBuffer } from '../DumpEditor/util.js';
import { parseNdefObj, unparseNdefObj, text2Payload, uint8tostr, text2Payload_2, text2Payload_utf, getTagBody, packTagPayload_m1, packTagPayload_m0 } from './util.js';


const componentId = '97319b12-aad8-47e0-aa58-6cb6460c54d9';
export const recordAddType_INITIAL = '请选择记录类型';
export const USERSTR_NDEF_TYPES = {
    '文本': 'text',
    'URL/URI/网址': 'uri',
    'Android App': 'app',
    'Wi-Fi网络': 'wifi',
    '蓝牙': 'bt',
    '电话号码': 'tel',
    '联系人': 'people',
    '自定义数据': 'custom',
};

const data = {
    data() {
        return {
            currentTab: 'read',
            tabsAvailable: [
                { value: 'read', label: '读标签' },
                { value: 'write', label: '写标签' },
                { value: 'more', label: '其他' },
            ],
            pages: [1, 1, 1],
            errorText: '',
            READ_DUMP: Symbol(),
            dump: { file: '', files: [], type: '' },
            rawRecord: [],
            record: [],
            extraReadTipText: '',
            writeRecord: [],
            showReadOptionPopover: false,
            recordAddType: recordAddType_INITIAL,
            recordAddTypes: Reflect.ownKeys(USERSTR_NDEF_TYPES),
            write_tagType: '',

        }
    },

    components: {
        MoreFilled,
        NdefRecord,
    },

    computed: {
        anyPageRunning() {
            // for Vue we need to access required props when the computed attr is firstly accessed
            // const pages = structuredClone(this.pages); // clone so that the full array is accessed
            // cannot clone an array, so manually copy
            const pages = [];
            for (const i of this.pages) pages.push(i);
            for (const i of pages) if (i > 1 && i < 100) return true;
            return false;
        },
    },

    methods: {
        nop() { },
        async readedNdefData(filename, type, isAutoDump, shouldDelete) {
            const url = new URL('/api/v4.8/api/dumpfile', location.href);
            url.searchParams.append('filename', filename);
            if (isAutoDump) url.searchParams.append('autodump', 'true');
            const fileResp = (await fetch(url));
            if (!fileResp.ok) throw `HTTP error ${fileResp.status}: ${fileResp.statusText}`;
            if (shouldDelete) await fetch(url, { method: 'DELETE' }); // 删除临时文件
            const file = await fileResp.arrayBuffer();
            const file_data = await getTagBody(file, type);
            if (file_data.isNdef === false) throw 'NdefExceptionMessages.NoNdef';
            // console.log(file_data);
            const tlv_data = new Uint8Array(file_data.body);
            const tlv_body = await parseTLV(tlv_data);
            const array = new Uint8Array(tlv_body);
            const records = ((type === 'm1' && file_data.isNdef === false)) ? (new NdefLibrary.NdefMessage) :
                NdefLibrary.NdefMessage.fromByteArray(array);
                // Ndef.Message.fromBytes(array);
            // console.log(records);
            this.rawRecord.length = this.record.length = 0;

            for (const i of records.getRecords()) {
                this.rawRecord.push(i);
            }
            this.updateNdefData();
            // console.log(this.record);

            this.pages[0] = 10099;
        },
        updateNdefData() {
            for (const i of this.rawRecord) {
                this.record.push(parseNdefObj(i));
            }
        },
        async readNdefData(arg) {
            this.errorText = '';
            this.extraReadTipText = '';
            this.pages[0] = 2;
            try {
                if (arg === this.READ_DUMP) {
                    if (!this.dump.type) throw '需要选择文件类型';
                    if (!this.dump.file) throw '需要选择文件';

                    await this.readedNdefData(this.dump.file, this.dump.type, false, false);
                    return;
                }
                const taginforesp = await fetch('/api/v4.8/nfc/taginfojson');
                if (!taginforesp.ok) throw '标签读取失败，请检查标签及设备连接\n\nHTTP Error: ' + taginforesp.status + ' ' + taginforesp.statusText;
                const taginfo = await taginforesp.json();
                const m1_sak = ['08', '18'];
                const card_type =
                    m1_sak.includes(taginfo.sak) ? 'm1' :
                        (taginfo.sak === '00' && taginfo.atqa === '0044') ? 'm0' : null;
                if (!card_type) throw '无法确定标签类型（根据SAK值）。\n' + JSON.stringify(taginfo, null, 4);
                const card_data_file = (card_type === 'm1') ?
                    (await m1_perform_action(ACTION_READ, {}, () => { }, {
                        use_mfoc: true,
                    })) :
                    (await ((await fetch('/api/v4.8/nfc/ultralight/read', { method: 'POST' })).text()));
                // console.log(card_data_file);

                await this.readedNdefData(card_data_file, card_type, true, true);
            } catch (error) {
                if (typeof error === 'string' && /^NdefExceptionMessages.([\w]*)$/.test(error)) {
                    this.rawRecord.length = this.record.length = 0;
                    this.extraReadTipText = '标签中的数据不是 NDEF 格式';
                    this.pages[0] = 10099;
                    return;
                }
                this.pages[0] = 10001;
                this.errorText = '错误: ' + (error?.errorText ? error.errorText : (error instanceof Error ? error : (typeof error === 'object' ? JSON.stringify(error, null, 4) : error)));
            }
        },
        loadDumpfileList() {
            this.dump.file = '';
            fetch('/api/v4.8/api/dumpfile', { method: 'POST' }).then(v => v.text()).then(v => {
                if (v == '') {
                    this.dump.files.length = 0;
                    return;
                }
                const data = v.split('\n');
                this.dump.files.length = 0;
                for (const i of data) {
                    this.dump.files.push(i);
                }
            });
        },
        async copyDataFromReaded() {
            if (this.writeRecord.length) try { await ElMessageBox.confirm('确定执行此操作吗？这将清空下面已经存在的数据。', '加载数据', {
                type: 'warning',
                confirmButtonText: '继续',
                cancelButtonText: '取消',
            }) } catch { return };
            this.writeRecord.length = 0;
            for (const i of this.record) {
                this.writeRecord.push(i);
            }
        },
        async clearWriteRecord() {
            try { await ElMessageBox.confirm('确定执行此操作吗？这将清空下面已经存在的数据。', '清空数据', {
                type: 'warning',
                confirmButtonText: '继续',
                cancelButtonText: '取消',
            }) } catch { return };
            this.writeRecord.length = 0;
        },
        updateWRData(index, data, options = {}) {
            // console.log(index, data);
            if (data === null) {
                if (options["delete"]) {
                    this.writeRecord.splice(index, 1);
                    return ElMessage.success('删除成功！');
                }
                if (Reflect.has(options, "direction")) {
                    const deleted = this.writeRecord.splice(index, 1);
                    let newIndex = index + options.direction;
                    if (newIndex < 0) newIndex = 0;
                    else if (newIndex > this.writeRecord.length) newIndex = this.writeRecord.length;
                    if(newIndex > this.writeRecord.length) return ElMessage.error('移动失败！');
                    this.writeRecord.splice(newIndex, 0, ...deleted);
                    return ElMessage.success('已移动');
                }
                return -87;
            }
            try {
                this.writeRecord[index] = parseNdefObj(unparseNdefObj(data));
            } catch (error) {
                ElMessage.error('记录 ' + index + ' 更新失败: ' + error);
                const data = JSON.parse(JSON.stringify(this.writeRecord[index]));console.log(data);
                this.writeRecord[index] = {};
                this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                // this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                // this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                // this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                // this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                // this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                // this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                // this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                // this.$nextTick(() => queueMicrotask(() => this.$nextTick(() =>
                    this.writeRecord[index] = data))))))//))))))))))))))))))))))));
            }
        },
        async addNdefRecord(record_type) {
            const type = USERSTR_NDEF_TYPES[record_type];
            if (!type) return ElMessage.error('记录类型不存在')

            try {
                switch (type) {
                    case 'text':
                    {
                        const text = (await ElMessageBox.prompt('请输入文本内容 (如果文本量大，建议先直接添加，然后再手动编辑，性能更佳)：', '添加记录', {
                            type: 'info',
                            confirmButtonText: '添加',
                            cancelButtonText: '不添加',
                        })).value || '';
                        const payload = text2Payload_utf('\u0002en' + text);
                        this.writeRecord.push(parseNdefObj(unparseNdefObj({
                            tnf: 1,
                            ndef_type: [type === 'text' ? 84 : 85],
                            payload,
                        })));
                        break;
                    }
                    case 'uri':
                    {
                        const text = (await ElMessageBox.prompt('请输入URI：', '添加记录', {
                            type: 'info',
                            confirmButtonText: '添加',
                            cancelButtonText: '不添加',
                        })).value || 'https://';
                        this.writeRecord.push((parseNdefObj(Ndef.Utils.createUriRecord(text))));
                        break;
                    }
                    case 'app':
                    {
                        const text = (await ElMessageBox.prompt('请输入应用程序包名（Package Name）：', '添加记录', {
                            type: 'info',
                            confirmButtonText: '添加',
                            cancelButtonText: '不添加',
                        })).value || '';
                        const payload = text2Payload_utf(text);
                        this.writeRecord.push(parseNdefObj(unparseNdefObj({
                            tnf: 4,
                            ndef_type: text2Payload('android.com:pkg'),
                            payload,
                        })));
                        break;
                    }
                    case 'bt':
                    {
                        const text = (await ElMessageBox.prompt('请输入蓝牙设备的物理地址：', '添加记录', {
                            type: 'info',
                            confirmButtonText: '添加',
                            cancelButtonText: '不添加',
                        })).value || '';
                        const hex = hexStringToArrayBuffer(text.replace(/[\:：]/gm, ''));
                        this.writeRecord.push(parseNdefObj(unparseNdefObj({
                            tnf: 2,
                            ndef_type: text2Payload('application/vnd.bluetooth.ep.oob'),
                            payload: new Uint8Array(hex),
                        })));
                        break;
                    }
                    case 'tel':
                    {
                        const text = (await ElMessageBox.prompt('请输入电话号码：', '添加记录', {
                            type: 'info',
                            confirmButtonText: '添加',
                            cancelButtonText: '不添加',
                        })).value || '1';
                        this.writeRecord.push(parseNdefObj(Ndef.Utils.createUriRecord('tel:' + encodeURIComponent(text))));
                        break;
                    }
                    case 'people': {
                        const name = (await ElMessageBox.prompt('请输入联系人名称：')).value;
                        if (!name) throw 'cancel';
                        const str = `BEGIN:VCARD
VERSION:3.0
FN:${name}
ORG:${(await ElMessageBox.prompt('请输入' + name + '的公司：')).value}
ADR:;;${(await ElMessageBox.prompt('请输入' + name + '的地址：')).value};;;;;
TEL:${(await ElMessageBox.prompt('请输入' + name + '的电话号码：')).value}
EMAIL:${(await ElMessageBox.prompt('请输入' + name + '的电子邮件：')).value}
URL:
END:VCARD`;
                            
                        (await ElMessageBox.confirm('确定添加 ' + name + '吗？', '添加记录', {
                            type: 'info',
                            confirmButtonText: '添加',
                            cancelButtonText: '不添加',
                        }));
                        this.writeRecord.push(parseNdefObj(unparseNdefObj({
                            ndef_type: text2Payload_2('text/vcard'),
                            tnf: 2, payload: text2Payload_utf(str),
                        })));
                        break;
                    }
                    case 'custom':
                    {
                        const newLength = this.writeRecord.push(Object.assign({
                            hexView: true,
                        }, parseNdefObj(unparseNdefObj({
                            tnf: 2,
                            ndef_type: [],
                            payload: [],
                        }))));
                        break;
                    }
            
                    default:
                        throw('非常抱歉暂时不支持添加' + type + '类型的记录，我们后续将会尽快跟进')
                        break;
                }
                ElMessage.success('已添加记录')
            }
            catch (error) {
                ElMessage.error('添加失败! ' + error);
            }
        },
        dontOpenHexView(data) {
            data.hexView = false;
        },
        doneWriteOperation() {
            if (this.pages[1] > 1) this.pages[1] = 1;
            if (this.pages[2] > 1) this.pages[2] = 1;
            this.$refs.progDlg.close();
            this.errorText = '';
        },
        packSelf() {
            const myRecords = [];
            for (const i of this.writeRecord) {
                i.getTypeNameFormat = () => i.tnf;
                const data = parseNdefObj(unparseNdefObj(i));
                // console.log(data);
                // const piece = new NdefLibrary.NdefRecord(data.tnf, data.ndef_type);
                // piece.setPayload(data.payload);
                const piece = new Ndef.Record(false, data.tnf, data.ndef_type, data.id, new Uint8Array(data.payload));
                myRecords.push(piece);
            }
            const msg = new Ndef.Message(myRecords);//Reflect.construct(NdefLibrary.NdefMessage, myRecords);
            // console.log(msg);
            return msg.toByteArray();
        },
        writeTag(config) {
            this.pages[1] = 3;
            this.errorText = '';

            queueMicrotask(async () => {
                try {
                    const cr = !!(config?.createOnly);
                    const crFile = cr ? ((await ElMessageBox.prompt('请输入文件名：', '创建转储')).value) : null;
                    this.$refs.progDlg.showModal();
                    const card_type = (cr) ? config.type : await ((async () => {
                        const taginforesp = await fetch('/api/v4.8/nfc/taginfojson');
                        if (!taginforesp.ok) throw '无法加载标签信息';
                        const taginfo = await taginforesp.json();
                        const m1_sak = ['08', '18'];
                        const card_type =
                            m1_sak.includes(taginfo.sak) ? 'm1' :
                                (taginfo.sak === '00' && taginfo.atqa === '0044') ? 'm0' : null;
                        if (!card_type) throw '无法确定标签类型（根据SAK值）。\n' + JSON.stringify(taginfo, null, 4);
                        return card_type;
                    })());

                    switch (card_type) {
                        case 'm1': {
                            const packData = new Uint8Array(this.packSelf());
                            if (!cr) if (packData.length > 720) throw '数据量过大';
                            const dataToWrite = await packTagPayload_m1(packData, 1024, 4);
                            // 先保存
                            const file_name = crFile || '@@TEMP_DATA(临时文件，可放心删除)-用于M1写入-' + (new Date().getTime()) + '.tmp';
                            const url = new URL('/api/v4.8/api/dumpfile', location.href);
                            url.searchParams.append('filename', file_name);
                            const saveresp = await fetch(url, { method: 'PUT', body: (dataToWrite) });
                            if (!saveresp.ok) throw `文件数据保存失败，错误：HTTP Error ${saveresp.status} ${saveresp.statusText}`;
                            
                            // 写入
                            if (!cr) {
                                const result = JSON.parse(await m1_perform_action(ACTION_WRITE, {}, () => { }, {
                                    type: 'write-mfclassic',
                                    keyfiles: 'std.keys',
                                    writeB0: false,
                                    dumpfile: file_name,
                                }));
                                if (!result.blocksWritten) throw '写入实质性失败';

                                //清理临时文件
                                await fetch(url, { method: 'DELETE' });
                            }
                            // 写入完成
                            this.pages[1] = 9999;
                        }
                            break;
                        
                        case 'm0': {
                            // M0需要先读出来
                            //    --> 大型高血压现场...
                            let readdata;
                            const url = new URL('/api/v4.8/api/dumpfile', location.href);
                            if (!cr) {
                                const taginforesp = await fetch('/api/v4.8/nfc/ultralight/read', {
                                    method: 'POST'
                                });
                                if (!taginforesp.ok) throw `读取失败：HTTP Error ${taginforesp.status}: ${taginforesp.statusText}`;
                                const dumpfilename = await taginforesp.text();
                                url.searchParams.set('filename', dumpfilename);
                                url.searchParams.set('autodump', 'true');
                                const getresp = await fetch(url);
                                if (!getresp.ok) throw `读取文件数据失败：HTTP Error ${getresp.status}: ${getresp.statusText}`;
                                readdata = new Uint8Array(await getresp.arrayBuffer());
                                await fetch(url, { method: 'DELETE' }); // 清理
                                if (readdata.byteLength < 0x10) throw '文件数据异常'; // 应该没有容量那么小的标签罢...
                            } else {
                                readdata = new Uint8Array((new Array(102400).fill(0)));
                            }
                            url.searchParams.delete('autodump');

                            const dataToWrite = await packTagPayload_m0(new Uint8Array(this.packSelf()), readdata, readdata.byteLength);
                            // 先保存
                            const file_name = crFile || '@@TEMP_DATA(临时文件，可放心删除)-用于M0写入-' + (new Date().getTime()) + '.tmp';
                            url.searchParams.set('filename', file_name);
                            const saveresp = await fetch(url, { method: 'PUT', body: (dataToWrite) });
                            if (!saveresp.ok) throw `文件数据保存失败，错误：HTTP Error ${saveresp.status} ${saveresp.statusText}`;
                            
                            // 写进去
                            if (!cr) {
                                const writeresp = await fetch('/api/v4.8/nfc/ultralight/write', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        file: file_name,
                                        option: '0000',
                                        allowResizedWrite: true,
                                    }),
                                });
                                if (!writeresp.ok) throw await writeresp.text();
                            
                                //清理临时文件
                                await fetch(url, { method: 'DELETE' });
                            }
                            // 写入完成
                            this.pages[1] = 9999;
                        }
                            break;
                    
                        default:
                            throw '不支持的标签类型：' + card_type;
                    }
                    
                }
                catch (error) {
                    if (!this.$refs.progDlg.open) this.$refs.progDlg.showModal();
                    this.pages[1] = 999;
                    this.errorText = '写入失败! ' + error;
                    console.error('[ndef]', '[ndef.write]', error);
                }
            });
        },
        async clearTag(erase = true) {
            try { await ElMessageBox.confirm('确定执行此操作？', '清空标签', { type: 'warning', confirmButtonText: '执行', cancelButtonText: '不执行' }) } catch { return }

            this.pages[2] = 3;
            this.errorText = '';
            this.$refs.progDlg.showModal();

            queueMicrotask(async () => {
                try {
                    const taginforesp = await fetch('/api/v4.8/nfc/taginfojson');
                    if (!taginforesp.ok) throw '无法加载标签信息';
                    const taginfo = await taginforesp.json();
                    const m1_sak = ['08', '18'];
                    const card_type =
                        m1_sak.includes(taginfo.sak) ? 'm1' :
                            (taginfo.sak === '00' && taginfo.atqa === '0044') ? 'm0' : null;
                    if (!card_type) throw '无法确定标签类型（根据SAK值）。\n' + JSON.stringify(taginfo, null, 4);

                    switch (card_type) {
                        case 'm1': {
                            const dataToWrite = await packTagPayload_m1(new Uint8Array(), 1024, 4);
                            // 先保存
                            const file_name = '@@TEMP_DATA(临时文件，可放心删除)-用于M1擦除-' + (new Date().getTime()) + '.tmp';
                            const url = new URL('/api/v4.8/api/dumpfile', location.href);
                            url.searchParams.append('filename', file_name);
                            const saveresp = await fetch(url, { method: 'PUT', body: (dataToWrite) });
                            if (!saveresp.ok) throw `文件数据保存失败，错误：HTTP Error ${saveresp.status} ${saveresp.statusText}`;

                            // 写入
                            const result = JSON.parse(await m1_perform_action(ACTION_WRITE, {}, () => { }, {
                                type: 'write-mfclassic',
                                keyfiles: 'std.keys',
                                writeB0: false,
                                dumpfile: file_name,
                            }));
                            if (!result.blocksWritten) throw '写入实质性失败';

                            //清理临时文件
                            await fetch(url, { method: 'DELETE' });
                            // 写入完成
                            this.pages[2] = 9999;
                        }
                            break;
                        
                        case 'm0': {
                            // M0需要先读出来
                            let readdata;
                            const url = new URL('/api/v4.8/api/dumpfile', location.href);

                            const taginforesp = await fetch('/api/v4.8/nfc/ultralight/read', {
                                method: 'POST'
                            });
                            if (!taginforesp.ok) throw `读取失败：HTTP Error ${taginforesp.status}: ${taginforesp.statusText}`;
                            const dumpfilename = await taginforesp.text();
                            url.searchParams.set('filename', dumpfilename);
                            url.searchParams.set('autodump', 'true');
                            const getresp = await fetch(url);
                            if (!getresp.ok) throw `读取文件数据失败：HTTP Error ${getresp.status}: ${getresp.statusText}`;
                            readdata = new Uint8Array(await getresp.arrayBuffer());
                            await fetch(url, { method: 'DELETE' }); // 清理
                            if (readdata.byteLength < 0x10) throw '文件数据异常'; // 应该没有容量那么小的标签罢...
                            url.searchParams.delete('autodump');

                            const card_head = readdata.slice(0, 4 * 4);
                            const MFUL_PREFILLED = [
                                0x04, 0x00, 0x00, 0xff, 0x00, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                            ];
                            const dataToWrite = erase ? new Uint8Array([
                                ...card_head,
                                ...((new Array(readdata.length - card_head.length - MFUL_PREFILLED.length)).fill(0)),
                                ...MFUL_PREFILLED // 必需数据，防止标签自锁
                            ]) : await packTagPayload_m0(new Uint8Array((() => {
                                const rec = new NdefLibrary.NdefRecord();
                                const msg = new NdefLibrary.NdefMessage(rec);
                                return new Uint8Array(msg.toByteArray());
                            })()), readdata, readdata.byteLength);
                            // 先保存
                            const file_name = '@@TEMP_DATA(临时文件，可放心删除)-用于M0清除-' + (new Date().getTime()) + '.tmp';
                            url.searchParams.set('filename', file_name);
                            const saveresp = await fetch(url, { method: 'PUT', body: (dataToWrite) });
                            if (!saveresp.ok) throw `文件数据保存失败，错误：HTTP Error ${saveresp.status} ${saveresp.statusText}`;

                            // 写进去
                            const writeresp = await fetch('/api/v4.8/nfc/ultralight/write', {
                                method: 'POST',
                                body: JSON.stringify({
                                    file: file_name,
                                    option: '0000',
                                    allowResizedWrite: true,
                                }),
                            });
                            if (!writeresp.ok) throw await writeresp.text();

                            //清理临时文件
                            await fetch(url, { method: 'DELETE' });
                            // 写入完成
                            this.pages[2] = 9999;
                        }
                            break;
                    
                        default:
                            break;
                    }
                }
                catch (error) {
                    this.pages[2] = 999;
                    this.errorText = '写入失败! ' + error;
                    console.error('[ndef]', '[ndef.clear]', error);
                }
            });
        },
        
    },

    watch: {
        recordAddType(newValue) {
            if (newValue === recordAddType_INITIAL) return;
            if (!newValue) return;
            this.addNdefRecord(newValue);
            this.recordAddType = recordAddType_INITIAL;
        },
        write_tagType(newValue) {
            if (!newValue) return;
            this.writeTag({ createOnly: true, type: newValue });
            this.write_tagType = '';
        },
    },

    mounted() {
        this.$nextTick(this.loadDumpfileList);
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


