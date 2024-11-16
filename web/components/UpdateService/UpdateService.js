import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox, ElLoading, ElNotification } from 'element-plus';
import { Download, Close } from 'icons-vue';
import { h } from 'vue';


const componentId = 'feda5bc6-fbd2-4e72-849e-d5d2afc85f64';

const data = {
    data() {
        return {
            updateTarget: 0,
            hasUpdates: 0,
            updateVersion: '',
            updateDetailUrl: '#/',
            updateSourceName: '应用程序网站',
            task: false,
            showBalloon: false,
            showTask: false,
            download_progress: 0,
            periodText: '',
        }
    },

    components: {
        Download, Close,
    },

    methods: {
        async updateapi(value) {
            if (value === 3) {
                this.hasUpdates = 1;
                try {
                    this.updateSourceName = await (await fetch('/api/v5.0/app/update/service_provider')).text();
                    this.updateDetailUrl = await (await fetch('/api/v5.0/app/update/release')).text();

                    const remote_url = await (await fetch('/api/v5.0/app/update/url?type=pkg')).text();
                    const remote_response = (await fetch(remote_url));
                    if (!remote_response.ok) throw -1;
                    const newVersion = (await remote_response.text());
                    this.updateVersion = '新版本: ' + newVersion;

                    try {
                        const remote_url = await (await fetch('/api/v5.0/app/update/url?type=note')).text();
                        const remote_response = (await fetch(remote_url));
                        if (!remote_response.ok) throw -1;
                        const newVersion = (await remote_response.text());
                        this.updateVersion += '\n简要说明: ' + newVersion;
                    } catch {
                        this.updateVersion += '\n无法加载更多信息';
                    }

                } catch {
                    this.updateVersion = '版本信息加载失败';
                }
                return;
            }
            if (value === 0) {
                return this.hasUpdates = 0;
            }
            if (value === 2) {
                userconfig.put('updatechecker.pending', null);
                userconfig.put('updatechecker.ignore', this.updateTarget);
                return this.hasUpdates = 0;
            }
            if (value === 1) {
                this.task = true;
                this.showBalloon = true;
                this.hasUpdates = 0;
                queueMicrotask(() => runWithErrorHandling.apply(this, []));
                return;
                if (0) {
                    const remote_url = await (await fetch('/api/v5.0/app/update/release')).text();
                    window.open(remote_url, '_blank', { width: 640, height: 480 });
                    this.hasUpdates = 0;
                    ElMessageBox.confirm('是否退出应用程序，以便进行更新？', '更新程序', {
                        confirmButtonText: '立即退出',
                        cancelButtonText: '稍后退出',
                        type: 'info',
                    }).then(() => {
                        fetch('/api/v4.8/app/exit', { method: 'POST' }).then(v => {
                            window.close();
                            // setTimeout(() => document.write('<h1>应用程序已退出'), 1000);
                        }).catch(error => {
                            ElMessage.error('无法退出应用程序: ' + error);
                        })
                    }).catch(() => {
                    });
                }
            }
        },

    },

    created() {
        globalThis.appInstance_.updater = this;
    },

    destroyed() {
        delete globalThis.appInstance_.updater
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


function run() {
    return new Promise(async (resolve, reject) => {
        let download_url;
        try {
            this.download_progress = 0;
            this.periodText = '正在获取版本号...';
            const remote_url = await (await fetch('/api/v5.0/app/update/url?type=pkg')).text();
            const remote_response = (await fetch(remote_url));
            if (!remote_response.ok) throw `无法获取远端版本数据 [HTTP Error ${remote_response.status}: ${remote_response.statusText}]。`;
            const newVersion = (await remote_response.text());
        
            this.download_progress = 2;
            this.periodText = '正在获取新版本下载地址...';
            download_url = await (await fetch('/api/v5.0/app/update/construct', {
                method: 'POST',
                body: newVersion,
            })).text();
        } catch (E) { return reject(E) };
        
        this.download_progress = 5;
        this.periodText = '正在下载新版本更新包...';
        
        const eventHandlers = {
            'progress': data => {
                const p = +data.progress;
                const pp = p / 100;
                const P = Math.floor(10 + (pp * 80));
                this.download_progress = P;
            },
        };
        const done = (v) => {
            this.download_progress = 95;
            this.periodText = '正在等待用户执行更新...';

            ElNotification({
                title: '应用程序更新',
                type: 'success',
                message: h('div', {}, [
                    h('div', {}, '更新包下载完成，点击退出应用程序即可自动完成更新！'),
                    h('a', { href: '#/exit/', target: '_blank' }, '退出程序并更新 (请先保存您的更改)')
                ]),
                duration: 0,
            });

            resolve(v);
        };

        const senderId = String(new Date().getTime());
        let sessionId = null;
        const defaultEventHandler = () => { };
        const handler = (ws, data) => {
            if (data.senderId != senderId) return;
            appInstance_.ws.deleteHandler('session-created', handler);
            sessionId = data.sessionId;
            const identifier = 0;
            queueMicrotask(() => {
        this.download_progress = 10;
        this.periodText = '正在下载新版本更新包...';
                appInstance_.ws.registerSessionHandler(sessionId, (ws, data) => {
                    const type = data.type;
                    if (!type) {
                        return defaultEventHandler(data, identifier);
                    }
                    if (Reflect.has(eventHandlers, type)) {
                        eventHandlers[type](data, identifier);
                    } else {
                        defaultEventHandler(data, identifier);
                    }
                    if (type === 'action-ended') {
                        if (data.success) done(data);
                        else reject(data);
                    }
                });
                appInstance_.ws.s(({
                    sessionId: data.sessionId,
                    type: 'run-updater',
                    updateUrl: download_url,
                }));
            });
        };
        appInstance_.ws.registerHandler('session-created', handler);
        appInstance_.ws.s({ type: 'create-session', senderId });
    });
}
async function runWithErrorHandling() {
    try {
        return await run.apply(this, arguments);
    }
    catch (error) {
        this.task = false;
        try { error = JSON.stringify(error, null, 4) } catch { };
        ElNotification({
            type: 'error',
            message: '自动更新执行失败。\n' + error + '\n请检查您的网络情况，或稍后再试。',
            duration: 0,
        });
    }
}

