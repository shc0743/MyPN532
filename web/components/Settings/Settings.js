import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


const componentId = 'dbd46a83-c09a-4459-afe7-6a94885ebf83';

const data = {
    data() {
        return {
            isLoading: true,
            cfgDefaultDevice: '',
            nfcDevices: [],
            defaultProps: {
                children: 'children',
                label: 'label',
            },
            showDeviceTour: false,
            internal_version: '正在加载...',
            allowUpdates: false,
            app_version: '',
        }
    },

    components: {

    },

    computed: {
        nfcDevicesComputed() {
            const r = [];
            for (const i of this.nfcDevices) {
                const devinfo = i.split('|');
                if (devinfo.length < 1) devinfo.push('');
                if (devinfo.length < 2) devinfo.push('');
                const devstr = devinfo[1].split(':');
                r.push({
                    label: `NFC设备 (${devinfo[0]})`,
                    children: [{
                            label: `设备名称: ${devinfo[0]}`
                    }, {
                        label: `设备字符串: ${devinfo[1]}`,
                        children: [
                            { label: devstr[0] },
                            { label: devstr[1] },
                            { label: devstr[2] },
                        ]
                        }],
                    isRoot: true,
                    connstring: i,
                    devinfo,
                });
            }
            return r;
        },
        parsedDefaultDevice() {
            return this.cfgDefaultDevice?.split?.('|');
        },
    },

    methods: {
        async LoadRemote() {
            this.isLoading = true;
            this.cfgDefaultDevice = '';
            this.nfcDevices.length = 0;
            try {
                this.internal_version = await (await fetch("/api/v5.0/app/version")).text();
                this.app_version = await (await fetch("/api/v5.0/app/version/common")).text();
                this.allowUpdates = 'true' !== await userconfig.get('updatechecker.disabled');
                const defaultdeviceresp = await fetch('/api/v4.8/nfc/defaultdevice');
                if (defaultdeviceresp.headers.get('x-device-not-recognized') === 'true') {
                    this.cfgDefaultDevice = '无法连接，可能是由于设备未插入或更换了USB插口，详情请把鼠标放到此处查看|如果设备未插入，请插入设备然后刷新页面；如果是更换了USB口，请重新扫描设备；原设备：' + await defaultdeviceresp.text();
                } else {
                    this.cfgDefaultDevice = await defaultdeviceresp.text();
                }
                if (!this.cfgDefaultDevice) {
                    await this.loadDevList(false);
                    this.showDeviceTour = true;
                }
            } catch (error) {
                console.error('[settings]', 'cannot load settings: ', error);
                try { await ElMessageBox.alert('无法加载设置！错误：' + error, '选项', {
                    confirmButtonText: '返回',
                    type: 'error'
                }); } catch {}
                if (navigation.canGoBack) history.back();
                else {
                    history.replaceState({}, document.title, '#/');
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                }
            } finally {
                this.isLoading = false;
            }
        },
        async loadDevList(user = true) {
            if (user) this.isLoading = true;
            this.nfcDevices.length = 0;
            try {
                for (const i of ((await (await fetch('/api/v4.8/nfc/devscan')).text()).split('\n'))) {
                    i && this.nfcDevices.push(i);
                }
                if (this.nfcDevices.length < 1) ElMessage.error('未找到设备！');
            } catch (error) {
                ElMessage.error('加载失败！')
            } finally {
                if (user) this.isLoading = false;
            }
        },
        async testDevice(data) {
            const connstring = data.connstring;
            const com = connstring.split('|')[1].split(':')[1].substring(3);
            ElMessage.success('测试已开始');
            fetch('/api/v5.0/nfc/testdevice', {
                method: 'POST',
                body: com,
            }).then(() => ElMessage.success('测试完成！')).catch(e => {
                ElMessage.error('测试失败: ' + e);
            });
        },
        async setDefaultDevice(data) {
            const connstring = data == null ? '' : data.connstring;
            this.isLoading = true;
            try {
                const resp = await fetch('/api/v4.8/nfc/defaultdevice', {
                    method: data ? 'PUT' : 'DELETE',
                    body: connstring,
                });
                if (!resp.ok) throw 1;
                if (data) {
                    ElMessage.success('设置成功！');
                    this.cfgDefaultDevice = connstring;
                } else {
                    ElMessageBox.alert('', '清除成功！').catch(() => { }).finally(() => location.reload());
                }
            } catch (error) {
                ElMessage.error('设置失败！')
            } finally {
                this.isLoading = false;
            }
        },
        async editDeviceName() {
            try {
                const connstring = this.cfgDefaultDevice;
                const arr = connstring.split('|');
                arr[0] = (await ElMessageBox.prompt('请输入新设备名:', '更改设备名称', {
                    type: 'info',
                    confirmButtonText: '保存',
                    cancelButtonText: '放弃',
                    inputValue: arr[0],
                })).value;
                if (!arr[0]) throw 'cancel';
                if (/(\||\")/.test(arr[0])) throw '设备名中不能有|或"';
                const str = arr.join('|');
                if (!(await fetch('/api/v4.8/nfc/defaultdevice', {
                    method: 'PUT',
                    body: str,
                })).ok) throw 'HTTP error';
                this.cfgDefaultDevice = str;
                ElMessage.success('操作成功');
            }
            catch (error) {
                if (error === 'cancel') return;
                console.error(error);
                ElMessage.error('出现错误: ' + error);
            }
        },
        changeappmode() {
            globalThis.appInstance_.instance.advancedUserOptions = globalThis.appInstance_.instance.advancedUser ? '1' : '0';
            globalThis.appInstance_.instance.$refs.advancedUserDlg.showModal();
        },
        updateUpdatingPolicy() {
            userconfig.put('updatechecker.disabled', !this.allowUpdates).then(() => ElMessage.success('更新偏好已保存。')).catch(e => {
                this.allowUpdates = !this.allowUpdates;
                ElMessage.error('更新偏好保存失败！' + e);
            })
        },
    },

    mounted() {
        this.$nextTick(() => this.LoadRemote());
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

