import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import { MoreFilled } from 'icons-vue';


import DumpSectorEditor from '../DumpSectorEditor/DumpSectorEditor.js';


import { hexStringToArrayBuffer, formatHex } from './util.js';

const componentId = '3a16fde5-cf40-4605-b0f2-6202bc21010e';

const Ultralight_monaco_options = {
    minimap: { enabled: false },
};
const My_monaco_options = {
    minimap: { enabled: false },
};

const data = {
    data() {
        return {
            file: null,
            isAutoDump: false,
            editdata: null,
            editorType: 'hex',
            showUppercase: false,
            allowParticipateBlocks: false,
            isMonacoMode: false,
            Ultralight_monaco_options: {},

        }
    },

    components: {
        DumpSectorEditor,
        MoreFilled,
    },

    computed: {
        isUltraLight() {
            return (/ultralight/i.test(this.file));
        },
        enableM1CFunc() {
            return false === this.isUltraLight;
        },
    },

    methods: {
        updateFile() {
            try {
                const hash = location.hash;
                const arr = hash.split('/');
                // typically    #/dump/DUMPFILE
                const file = decodeURIComponent(arr[2]);
                if (!file) {
                    throw ElMessage.error('文件名解析失败');
                }
                if (file === 'autodump' && arr.length > 3) {
                    // this.isCompare = false;
                    this.isAutoDump = true;
                    this.file = decodeURIComponent(arr[3]);
                // } else if (file === 'compare' && arr.length > 3) {
                //     this.isAutoDump = false;
                //     this.isCompare = true;
                //     const url = new URL(location.hash.substring(1), location.href);
                //     this.compareData.fileA = url.searchParams.get('a');
                //     this.compareData.fileB = url.searchParams.get('b');
                //     this.file = 'compareMode';
                } else {
                    this.isAutoDump =
                        // this.isCompare =
                        false;
                    this.file = file;
                }
            } catch {}
        },
        async getFileBlob(file) {
            const url = new URL('/api/v4.8/api/dumpfile', location.href);
            url.searchParams.append('filename', file);
            if (this.isAutoDump) url.searchParams.append('autodump', 'true');
            const resp = (await fetch(url, {
                // body: this.file,
                method: 'HEAD',
            }));
            if (!resp.ok) throw `HTTP错误 (${resp.status} ${resp.statusText})。文件可能不存在或无法访问。`;
            const size = Number(resp.headers.get('content-length'));
            if (isNaN(size)) throw '服务器发送了无效的响应数据。';
            if (size > 1048576) throw `文件大于1MiB (大小：${size / 1048576}MiB)，无法在浏览器中编辑。请尝试使用其他编辑软件（如WinHex）。`;
            return await (await fetch(url)).blob();
        },
        async loadFile() {
            try {
                // if (this.file === 'compareMode') {
                //     this.compareData.originalModel = monaco.editor.createModel(
                //         await formatHex(await this.getFileBlob(this.compareData.fileA)),
                //         'text/plain'
                //     );
                //     this.compareData.modifiedModel = monaco.editor.createModel(
                //         await formatHex(await this.getFileBlob(this.compareData.fileB)),
                //         'text/plain'
                //     );
                //     this.$refs.editor.editor.setModel({
                //         original: this.compareData.originalModel,
                //         modified: this.compareData.modifiedModel,
                //     });
                // }

                const showUppercase = await userconfig.get('editor.hex.uppercase') === 'true';
                if (showUppercase) this.showUppercase = true;

                // real load
                const blob = await this.getFileBlob(this.file);
                // this.$refs.editor.value = await formatHex(blob);
                // this.$refs.editor.editor.addAction({
                //     id: 'saveFile',
                //     label: '保存文件',
                //     keybindings: [
                //         monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                //     ],
                //     contextMenuGroupId: 'navigation',
                //     contextMenuOrder: 0.5,
                //     run: () => {
                //         this.savefile(true);
                //     }
                // });
                this.editdata = blob;

                if (this.isUltraLight) {
                    this.isMonacoMode = true;
                    this.Ultralight_monaco_options = Ultralight_monaco_options;
                    await new Promise((resolve) => {
                        this.$nextTick(() => this.$nextTick(resolve));
                    }); // wait for the update
                } else this.Ultralight_monaco_options = My_monaco_options;
                
                if (this.isAutoDump) queueMicrotask(async () => {
                    try {
                        const filename = (await ElMessageBox.prompt('标签读取成功！要立即保存 ' + this.file + ' 吗?', '转储文件编辑器', {
                            type: 'success',
                            confirmButtonText: '立即保存',
                            cancelButtonText: '以后再保存',
                            inputValue: this.file.replace(/autodump$/i, 'dump'),
                        })).value;
                        if (!filename) throw -1;
                        this.savefile(true, filename);
                    } catch { }
                });

                if (this.isMonacoMode) {
                    const arrayBuffer = await this.editdata.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    let final = [];
                    let hexString = '', buffer = [];
                    if (this.isUltraLight) {
                        for (let i = 0, l = uint8Array.length; i < l; i++) {
                            if (this.editorType === 'hex')
                                hexString += uint8Array[i].toString(16).padStart(2, '0');
                            if (this.editorType === 'asc')
                                hexString += String.fromCharCode(uint8Array[i]);
                    
                            if ((i + 1) % 4 === 0 || (i + 1 === l)) {
                                buffer.push(hexString + '');
                                hexString = '';
                                if ((i + 1) % 16 === 0 || (i + 1 === l)) {
                                    final.push((buffer.join(this.editorType === 'hex' ? ' ' : '')));
                                    buffer.length = 0;
                                }
                            }
                        }
                    } else {
                        for (let i = 0, l = uint8Array.length; i < l; i++) {
                            if (this.editorType === 'hex')
                                hexString += uint8Array[i].toString(16).padStart(2, '0');
                            if (this.editorType === 'asc')
                                hexString += String.fromCharCode(uint8Array[i]);
                    
                            if ((i + 1) % 16 === 0 || (i + 1 === l)) {
                                buffer.push(hexString);
                                hexString = '';
                                if ((i + 1) % 64 === 0 || (i + 1 === l)) {
                                    final.push('# 扇区 ' + (Math.ceil((i + 1) / 64) - 1) + '\n' + (buffer.join('\n')));
                                    buffer.length = 0;
                                }
                            }
                        }
                    }
                    const finalStr = final.join('\n');
                    this.$refs.monaco.value = finalStr;
                    if (!this.$refs.monaco._actionadded) {
                        this.$refs.monaco.editor.addAction({
                            id: 'saveFile',
                            label: '保存文件',
                            keybindings: [
                                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                            ],
                            contextMenuGroupId: 'navigation',
                            contextMenuOrder: 0.5,
                            run: () => {
                                this.savefile(true);
                            }
                        });
                        this.$refs.monaco._actionadded = true;
                    }
                    return;
                }

                this.$nextTick(() => this.$refs.myEditor.load());

            } catch (error) {
                ElMessageBox.alert(error, '文件加载失败', {
                    type: 'error',
                    confirmButtonText: '取消',
                }).catch(() => { }).finally(() => {
                    if (navigation.canGoBack) history.back();
                    else {
                        history.replaceState({}, document.title, '#/');
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }
                });
            }
        },
        async savefile(save, filename = null) {
            if (!save) {
                const run = () => {
                    if (navigation.canGoBack) history.back();
                    else {
                        history.replaceState({}, document.title, '#/');
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }
                };
                if (this.isAutoDump) run();
                else ElMessageBox.confirm('确认放弃更改？', '放弃更改', {
                    type: 'warning',
                    confirmButtonText: '放弃',
                    cancelButtonText: '不放弃',
                }).then(run).catch(() => { });
                return;
            }

            try {
                if (this.editorType === 'asc') throw '无法保存';
                // console.log('整合数据...');
                const arr = []; let sectorN = -1;
                if (this.isMonacoMode) {
                    arr.push(hexStringToArrayBuffer(this.$refs.monaco.value.split('\n').filter(el => (!(/^\#|^[\s]\#/).test(el))).join('')))
                }
                else for (const i of this.$refs.myEditor.getData()) {
                    sectorN++;
                    for (let j of i) {
                        j = j.trim();
                        if (j.length !== 32) {
                            if (this.enableM1CFunc && !this.allowParticipateBlocks) {
                                throw await ElMessageBox.alert('在扇区 ' + sectorN +
                                    ' 中检测到了不完整的块。\n如果要强制保存不完整的块，' +
                                    '请在页面上方打开开关。注意：这将影响该块后的所有块，' +
                                    '因为dump文件采用顺序读写！', '无法保存文件', {
                                    type: 'error',
                                    confirmButtonText: '返回修改',
                                });
                            }
                        }
                        arr.push(hexStringToArrayBuffer(j));
                    }
                }
                // console.log('数据处理完成');
                if (this.isAutoDump) {
                    if (!filename) filename = (await ElMessageBox.prompt('输入文件名以保存 ' + this.file, '请输入文件名', {
                        type: 'info',
                        confirmButtonText: '继续',
                        cancelButtonText: '取消',
                        inputValue: this.file.replace(/autodump$/i, 'dump'),
                    })).value;
                } else filename = this.file;

                const blob = new Blob(arr);
                const url = new URL('/api/v4.8/api/dumpfile', location.href);
                url.searchParams.append('filename', filename);
                const v = await fetch(url, {
                    method: 'PATCH',
                    body: blob
                })
                if (v.ok) ElMessage.success('保存成功！');
                else throw v.status + v.statusText;
                if (this.isAutoDump) {
                    const url = new URL('/api/v4.8/api/dumpfile', location.href);
                    url.searchParams.append('filename', this.file);
                    url.searchParams.append('autodump', 'true');
                    fetch(url, {
                        method: 'DELETE'
                    }).then(() => ElMessage.success('临时转储文件已删除!')).catch(e => ElMessage.error('无法删除临时转储文件: ' + e));
                    history.replaceState({}, document.title, '#/dump/' + encodeURIComponent(filename));
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                }
                return true;
            } catch (e) {
                ElMessage.error('保存失败! ' + e);
            }

        },
        async launchTool(toolName) {
            switch (toolName) {
                case 'bcc':
                    ElMessageBox.prompt('BCC工具现已集成至彩色编辑器中，检测到BCC错误时会自动给出提示，无需担心！（monaco editor暂未兼容）如果确有需求，可在下面输入UID，即可手动计算BCC:', '温馨提示 - BCC计算工具', {
                        type: 'info',
                        confirmButtonText: '计算BCC',
                        cancelButtonText: '关闭工具',
                    }).then(async ({ value: data }) => {
                        if (!data) return;
                        if (data.length !== 8) return ElMessage.error('uid长度应为4字节');
                        const uidBits = [];
                        for (let i = 0; i < 4; ++i) uidBits.push(Number.parseInt(data.substring(i * 2, (i + 1) * 2), 16));
                        const correctBCC = uidBits[0] ^ uidBits[1] ^ uidBits[2] ^ uidBits[3];
                        await ElMessageBox.confirm('UID=' + data + ',BCC=0x' + correctBCC.toString(16).padStart(2, '0'), 'BCC计算器', {
                            type: 'success',
                            confirmButtonText: '复制',
                            cancelButtonText: '关闭',
                        });
                        await navigator.clipboard.writeText(correctBCC.toString(16).padStart(2, '0'));
                        ElMessage.success('复制成功!');
                    }).catch(() => { });
                    break;
                
                case 'writethis':
                    try {
                        await ElMessageBox.confirm('在转至写入页面前，要先保存此文件吗？', '即将跳转', {
                            type: 'info',
                            confirmButtonText: '保存并继续',
                            cancelButtonText: '直接继续',
                            distinguishCancelAndClose: true,
                        });
                        if (true !== await this.savefile(true)) {
                            return await ElMessageBox.alert('文件保存失败，跳转中止!', '跳转失败', {
                                type: 'error', confirmButtonText: '我知道了'
                            });
                        }
                    } catch (d) {
                        if (d === 'close') return;
                    }
                    location.href = '#/tag/mfclassic/write?type=dump&dump=' + encodeURIComponent(this.file);
                    break;
                
                case 'exportkeys':
                    ElMessageBox.prompt('请输入要保存的密钥文件名（如果文件已存在将被覆盖）：', '导出密钥', {
                        type: 'info',
                        confirmButtonText: '导出密钥',
                        cancelButtonText: '现在不导出',
                    }).then(async ({ value: userfilename }) => {
                        if (!userfilename) return;
                        if (true !== await this.savefile(true)) {
                            return await ElMessageBox.alert('文件保存失败，导出中止!', '导出失败', {
                                type: 'error', confirmButtonText: '我知道了'
                            });
                        }
                        const blob = await this.getFileBlob(this.file);
                        const hex = (await formatHex(blob)).split('\n');
                        const result = new Set();
                        for (let i = 0, l = hex.length; i < l; ++i) {
                            if ((i + 1) % 4 === 0 || (i + 1) === l) {
                                // trailer block
                                const str = hex[i];
                                if (str.length !== 32) continue;
                                const keyA = str.substring(0, 12);
                                const keyB = str.substring(20, 32);
                                result.add(keyA);
                                if (keyA !== keyB) result.add(keyB);
                            }
                        }
                        const resultArray = [];
                        for (const i of result) {
                            resultArray.push(i);
                            resultArray.push('\n');
                        }
                        const url = new URL('/api/v4.8/api/keyfile', location.href);
                        url.searchParams.append('filename', userfilename);
                        fetch(url, {
                            method: 'PATCH',
                            body: new Blob(resultArray),
                        }).then(v => {
                            if (!v.ok) throw `HTTP Error ${v.status}: ${v.statusText}`;
                            ElMessageBox.alert('导出成功！已保存密钥文件 ' + userfilename, '导出成功', {
                                type: 'success'
                            });
                        }).catch(error => {
                            ElMessageBox.alert('错误: ' + error, '导出失败', {
                                type: 'error'
                            });
                        });
                    }).catch(() => { });
                    break;
            
                default:
                    ElMessage.error('工具不存在');
                    break;
            }
        },

    },

    watch: {
        file() {
            if (!this.file) return;
            this.$nextTick(() => this.$nextTick(() => this.loadFile()));
        },
        showUppercase() {
            userconfig.put('editor.hex.uppercase', this.showUppercase);  
        },
        isMonacoMode() {
            if (!this.file || !this.enableM1CFunc) return;
            this.$nextTick(() => this.$nextTick(() => this.loadFile()));
        },
        editorType() {
            if (!this.file) return;
            this.$nextTick(() => this.$nextTick(() => this.loadFile()));
        },
    },

    mounted() {
        globalThis.appInstance_.dumpEditor = this;
        this.$nextTick(() => this.updateFile());
    },

    unmounted() {
        delete globalThis.appInstance_.dumpEditor;
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


window.addEventListener('hashchange', () => {
    const editor = globalThis.appInstance_.dumpEditor;
    if (!editor) return;
    editor.updateFile();
});



// monaco.languages.register({ id: 'mifare_hex' });
// monaco.languages.setMonarchTokensProvider('mifare_hex', {
//     // 定义 tokens  
//     tokenizer: {
//         root: [
//             // [/[a-zA-Z_$][a-zA-Z0-9_$]*/, 'identifier'],
//             [/\b(function|var|const|let|if|else|while|do|for|return|new|delete|typeof|in|instanceof|this)\b/, 'keyword'],
//             [/\b(true|false|null|undefined|NaN|Infinity)\b/, 'keyword'],
//             // [/\b(Array|Number|String|Object|Boolean|Function|RegExp|Date|Error|Symbol|Map|Set|Promise)\b/, 'builtin'],
//             // [/\b(Math|JSON|Intl|console)\b/, 'library'],
//             // [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
//             // [/\d+([eE][-+]?\d+)?/, 'number'],
//             // [/'/, 'string', '@string'],
//             // [/\//, 'comment', '@comment'],
//             // [/[\s\t\r\n]+/, ''],
//             // [/[\{\}\[\]\(\),;\:\.]/, 'delimiter'],
//             [/(^[\s\S]{12})|([\s\S]{12}$)/, 'identifier'],
//             [/[\u00A0-\uFFFF]/, 'string']  // 将所有其他字符视为字符串（例如，在错误的情况下）  
//         ],
//         string: [
//             [/[^']+/, 'string'],
//             [/'/, 'string.escape', '@pop']
//         ],
//         comment: [
//             [/[^\/*]+/, 'comment'],
//             [/\*\//, 'comment', '@pop'],
//             [/[\/*]/, 'comment']
//         ]
//     }
// });


