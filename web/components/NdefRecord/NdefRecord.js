import { getHTML, getVdeep } from '@/assets/js/browser_side-compiler.js';
import { addCSS } from '@/BindMove.js';
import { formatHexFromUint8ArrayBeautifully, hexStringToArrayBuffer } from '../DumpEditor/util.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import { parseNdefObj, unparseNdefObj, text2Payload, uint8tostr, text2Payload_2, text2Payload_utf } from '../NdefCenter/util.js';

const componentId = 'a4bb662d-cd6f-45ab-8ab4-d8292c83f419';

const UI_TEXT_TYPE_TOO_LARGE = '数据量过大，无法编辑';
const SHOW_WARNING = true;

const data = {
    data() {
        return {
            showDataViewer: false,
            dataEditorError: '',
            dataType: '',
            dataTypeCannotEdit: false,
            isHex: false,
            vCard_showMoreValues: false,
            showPersonViewer: false,
            vCard_EditTemp: {},
        }
    },

    props: {
        data: {
            type: Object,
        },
        index: {
            type: Number,
        },
        modelValue: {
            type: Object,
        },
        openHexView: {
            type: Boolean,
            default: false,
        },
    },

    emits: ['update:modelValue', 'updated', 'move', 'delete_record', 'dont-open-hex-view'],

    computed: {
        recordData: {
            get() {
                const data = this.data, modelValue = this.modelValue;
                return data || modelValue || ((() => { throw 'Data is required' })());
            },
            set(value) {
                if (this.isReadOnly) return false;
                this.$emit('updated', value);
                this.$emit('update:modelValue', value);
                return true;
            },
        },
        isReadOnly() {
            return !this.modelValue;
        },
        extendedData_lang: {
            get() {
                const langstr = this.recordData.language;
                if (!this.recordData.payload) return '';
                // if (langstr)
                    return langstr;
                const payload = new Uint8Array(this.recordData.payload);
                const len = payload[0];
                const fw = payload.slice(1, 1 + len);
                return uint8tostr(fw);
            },
            set(value) {
                if (this.isReadOnly) return false;
                this.recordData.language = value;
                return true;
            },
        },
    },

    components: {

    },

    methods: {
        viewData(data_buffer, hex = true, close = false, options = {}) {
            if (close) {
                if (options?.is === 'person-viewer') {
                    this.$refs.PersonViewer.close();
                    return this.$nextTick(() => this.$nextTick(() => {
                        this.showPersonViewer = false;
                    }));
                }
                this.$refs.dataViewer.close();
                this.$nextTick(() => this.$nextTick(() => {
                    this.showDataViewer = false;
                }));
                return;
            }
            if (!this.recordData?.ndef_type) return ElMessage.error('数据异常');
            this.dataEditorError = '';
            this.showDataViewer = true;
            this.dataTypeCannotEdit = (this.recordData.ndef_type.length > 1000);
            this.dataType = this.dataTypeCannotEdit ? UI_TEXT_TYPE_TOO_LARGE : uint8tostr(new Uint8Array(this.recordData.ndef_type));
            this.isHex = hex;
            this.$nextTick(() => this.$nextTick(() => {
                this.$refs.dataViewer.showModal();
                this.$refs.dataEditor.value = hex ? formatHexFromUint8ArrayBeautifully(data_buffer) : data_buffer;
                this.$refs.dataEditor.editor.addAction({
                    id: 'closeDlg',
                    label: '关闭',
                    keybindings: [
                        monaco.KeyCode.Escape
                    ],
                    contextMenuGroupId: 'navigation',
                    contextMenuOrder: 0.51,
                    run: () => {
                        this.viewData(null, null, true);
                    }
                });
                this.$refs.dataEditor.editor.addAction({
                    id: 'saveFile',
                    label: '保存更改',
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                    ],
                    contextMenuGroupId: 'navigation',
                    contextMenuOrder: 0.49,
                    run: () => {
                        this.saveData();
                    }
                });
            }));
        },
        resolveViewPayload(ev) {
            const target = ev.target;
            // if (target && target.classList?.contains?.('text-view')) return;
            const data = this.recordData;
            switch (data.type) {
                case 'text':
                case 'uri':
                case 'tel':
                    this.viewData(data.content, false);
                    break;
                case 'android-app':
                    this.viewData(data.pkgName, false);
                    break;
                case 'person':
                    this.dataType = 'text/vcard';
                    this.vCard_EditTemp = notdeepclone(this.recordData);
                    this.showPersonViewer = true;
                    this.$nextTick(() => this.$nextTick(() => {
                        this.$refs.PersonViewer.showModal();
                    }));
                    break;
            
                default:
                    this.viewData(data.payload);
            }
        },
        copyText(text) {
            navigator.clipboard.writeText(text).then(() => ElMessage.success('复制成功！')).catch(ElMessage.error);
        },
        textify(array) {
            return uint8tostr(new Uint8Array(array));
        },
        async openuri(uri, security = true) {
            const isURL = uri.startsWith('http');
            const ur = isURL ? 'URL' : 'URI';
            if (security) try {
                if (await userconfig.get('ignore_all_url_risk') !== true)
                await ElMessageBox.confirm('确定打开这个' + ur + '? 打开不明来源的URL可能会出现意想不到的结果!', '打开 ' + ur, {
                    type: 'warning',
                    confirmButtonText: '无视风险，继续访问',
                    cancelButtonText: '知晓风险，停止访问',
                });
            } catch { return };
            try {
                window.open(uri);
            } catch (error) {
                ElMessage.error('无法打开这个 ' + ur + ': ' + error);
            }
        },
        async saveData(options = {}) {
            if (this.isReadOnly) return (this.dataEditorError = '无法保存只读文件');
            const data = notdeepclone(this.recordData);
            const value = this.$refs.dataEditor?.value;
            this.dataEditorError = '';
            try {
                if (!this.dataTypeCannotEdit) {
                    let userrd = 0;
                    if (SHOW_WARNING && (this.dataType !== this.recordData.typestr && data.tnf !== 2)) try {
                        // data type modified
                        this.$refs.dataViewer.close();
                        await ElMessageBox.confirm('您正在尝试直接修改该条记录的类型。通常，这种修改是不被支持的。您应尽量' +
                            '采取创建新记录的方法，而非修改已存在的记录的类型。如果您继续，那么组件的行为是未定义的。    ' +
                            '您想要继续吗？', '修改记录类型', {
                            type: 'warning',
                            confirmButtonText: '我已知悉，继续修改',
                            cancelButtonText: '放弃修改'
                        });
                    } catch {
                        userrd = 1;
                    } finally {
                        this.$refs.dataViewer.showModal();
                    }
                    await new Promise(queueMicrotask)
                    if (userrd === 1) throw 'cancel';
                    data.ndef_type = text2Payload_utf((data.typestr = this.dataType));
                    data.type = parseNdefObj(unparseNdefObj(data)).type;
                }
                switch (data.type) {
                    case 'text': {
                        data.content = value;
                        const lang = data.language || 'en';
                        data.payload = text2Payload_utf(String.fromCharCode(lang.length) + lang + value);
                    }
                        break;
                    case 'uri': case 'tel': {
                        data.content = encodeURI(data.type === 'tel' ? ('tel:' + value) : value);
                        data.payload = parseNdefObj(Ndef.Utils.createUriRecord(data.content)).payload;
                        break;
                    }
                    case 'android-app':
                        data.pkgName = value;
                        data.payload = text2Payload_utf(value);
                        break;
                    case 'bluetooth':
                        data.mac = value;
                        data.payload = hexStringToArrayBuffer(value.replace(/[:：]/gm, ''));
                        break;
                    case 'person':console.log(data);
                        data.content = `BEGIN:VCARD
VERSION:3.0
FN:${this.vCard_EditTemp.name}
ORG:${this.vCard_EditTemp.org}
ADR:;;${this.vCard_EditTemp.addr};;;;;
TEL:${this.vCard_EditTemp.tel}
EMAIL:${this.vCard_EditTemp.email}
URL:${this.vCard_EditTemp.website}
END:VCARD`;
                        data.payload = text2Payload_utf(data.content);
                        break;
            
                    default: try {
                        let array = [];
                        if (this.isHex) {
                            const buffer = hexStringToArrayBuffer(value);
                            const uint8 = new Uint8Array(buffer);
                            for (let i = 0, l = uint8.length; i < l; ++i) {
                                array.push(uint8[i]);
                            }
                        } else {
                            array = text2Payload_utf(value)
                        }
                        data.payload = array;
                    } catch (error) {
                        this.dataEditorError = '保存失败: ' + error;
                        return
                    }
                }
                this.recordData = data;
                this.viewData(null, false, true, { is: options.is });
            } catch (error) {
                if (error === 'cancel') error = '用户取消';
                this.dataEditorError = '保存失败: ' + error;
            }
        },
        moveRecord(direction) {
            this.$emit('move', {
                index: this.index,
                direction: +direction,
            });
        },
        deleteRecord() {
            this.$emit('delete_record', this.index);
        },
        parsePerson(data) {
            return [
                ['姓名', data.name || '未给出'],
                ['公司', data.org || '未给出'],
                ['地址', data.addr || '未给出'],
                ['电话', ...data.tel || '未给出'],
                ['电子邮件地址', ...data.email || '未给出'],
                ['网站', data.website || '未给出'],
            ]
        },
    },

    watch: {
        openHexView: {
            handler(newValue) {
                if (newValue) {
                    this.viewData(this.recordData.payload);
                    this.$emit('dont-open-hex-view');
                }
            },
            immediate: true,
        }
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


addCSS((`
.record-item>>> {
    display: flex;
    flex-direction: column;
    border: 1px solid gray;
    border-radius: 10px;
    padding: 10px;
    margin-top: 0.5em;
    cursor: pointer;
    transition: all 0.1s;
    background: var(--background);
    --background: #ffffff;
}
.record-item>>>:hover {
    --background: #f0f0f0;
}
.record-item>>>:active {
    --background: #cfcfcf;
}
.record-item>>>:focus, .record-item>>>:focus-within {
    outline-color: #a0cfff;
}
.record-type>>> {
    font-weight: bold;
    margin-bottom: 10px;
}
.line-view>>> {
    cursor: text;
}
.line-view.single-line-view>>> {
    white-space: pre;
    text-overflow: ellipsis;
    overflow: hidden;
}
.line-view.multiple-line-view>>> {
    white-space: break-spaces;
    word-break: break-all;
}
.text-view>>>::before {
    content: "文本:";
    margin-right: 0.5em;
    font-weight: bold;
}
.controls-view>>> {
    margin-top: 0.5em;
}
.record-controls>>>+.record-controls>>> {
    margin-left: 1em;
}
.operate-buttons>>> {
    cursor: not-allowed;
}`).replace(/>>>/gm, `[${getVdeep(componentId)}]`));



function notdeepclone(object) {
    const newObject = Object.create(Object.prototype);
    for (const i of Reflect.ownKeys(object))
        Reflect.set(newObject, i, Reflect.get(object, i));
    return newObject;
}

