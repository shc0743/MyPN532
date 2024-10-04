import { ElMessage, ElMessageBox } from 'element-plus';


globalThis.appInstance_.isRunning = false;


export async function onPageLoad() {

    // 先尝试获得登录信息
    globalThis.appInstance_.user = {};
    try {
        try {
            const me = await fetch('/api/me');
            if (!me.ok) throw me.status + me.statusText;
            globalThis.appInstance_.user.data = await (me.json());
            globalThis.appInstance_.instance.username = globalThis.appInstance_.user.data.name;

        }
        catch (error) {
            console.error(error);
            ElMessage.error("用户数据获取失败");
            throw ElMessageBox.alert('登录无效。', '会话无效', { type: 'error' }).catch(() => { }).finally(close);
        }
        globalThis.appInstance_.isRunning = true;
        StartWebConversation();
    } catch (error) {
        ElMessage.error("未登录");
    }

};


let timeoutTestSentNotDone = false, timeoutLastReceiveTime = Number.MAX_SAFE_INTEGER;


function StartWebConversation() {
    const ws = new WebSocket(location.origin.replace('http', 'ws') + '/api/v4.8/web');
    globalThis.appInstance_.ws = ws;
    let timeoutTestId = 0;
    ws.onopen = async function (event) {
        console.info('[ws]', 'server connected');
        ws.send("Here's some text that the server is urgently awaiting!");

        queueMicrotask(InitUserInterfaceByAskingServerStateWrapper);

        if ((await userconfig.get('noping')) !== 'true') {
            timeoutTestId = setInterval(() => {
                if (timeoutTestSentNotDone) {
                    const to = ((new Date().getTime()) - timeoutLastReceiveTime);
                    if (to > 1000) {
                        globalThis.appInstance_.instance.networkTimeout = to;
                        globalThis.appInstance_.instance.networkCongestion = true;
                    }
                    return;
                }
                timeoutTestSentNotDone = true;
                ws.s({ type: 'echo', data: { type: 'timeout-test', time: new Date().getTime() } });
            }, 1000);
        }
        (async () => {
            if ((await userconfig.get('devicedetection.ignore')) == 'true') return;
            const { h } = await import('vue');
            const resp = await fetch('/api/v4.8/nfc/defaultdevice');
            if (!await (resp).text()) try {
                if (location.hash.startsWith('#/settings/')) throw 1;
                await (ElMessageBox.confirm(resp.headers.get('x-device-not-recognized') === 'true' ?
                    h('div', {}, [
                        h('div', { style: { marginBottom: '0.5em' } }, '默认设备无法连接（一般是因为更换了USB插口等原因，也有可能是其他程序占用），是否前往更新？（注：如果正在运行其他操作，则设备占用是正常现象，可以放心忽略此提示；如果没有插入NFC设备，请先插入设备，然后刷新页面，如此提示依然出现则应前往设置）'),
                        h('a', { href: '#/api/config/apply?key=devicedetection.ignore&value=true&callback=#/' }, '不再提示'),
                    ]) : '未设置默认设备，是否前往设置？', '温馨提示', {
                    type: 'warning',
                    confirmButtonText: resp.headers.get('x-device-not-recognized') === 'true' ? '前往' : '立即前往 (建议)',
                    cancelButtonText: resp.headers.get('x-device-not-recognized') === 'true' ? '忽略' : '不前往 (不建议)',
                }));
                location.hash = '#/settings/#device';
            } catch { }
        })();
        if ((await userconfig.get('noguide')) !== 'true') {
            globalThis.appInstance_.instance.showGuide = true;
        }
    };
    ws.onmessage = function (event) {
        // console.log(event.data);
        let data = event.data;
        if (!data) return;
        try { data = JSON.parse(data) } catch { return; }
        if (data.success === false && data.type === 'error') {
            console.warn('[ws]', 'received error message from server:', data);
        }

        const handlers = ws.h.get(data.type);
        if (!handlers || !(handlers instanceof Set)) {
            // console.warn('[ws]', 'undefined type', data.type, 'in', data);
            return;
        }
        let retValue = true;
        for (const handler of handlers) {
            try {
                if (!handler.call(this, ws, data)) {
                    retValue = false;
                }
                if (handler.$_once) handlers.delete(handler);
            } catch (err) {
                console.warn('[ws]', 'unhandled error while executing handler:', err);
            }
        }
        return retValue;
    };
    ws.onclose = function (event) {
        const fatal = globalThis.appInstance_.isRunning == true;
        clearInterval(timeoutTestId);
        console[fatal ? 'error' : 'info']('[ws]', 'Connection closed.');
        globalThis.appInstance_.instance.is_connected = false
        if (fatal) {
            ElMessageBox.alert('与服务器的连接已丢失。', '连接断开', { type: 'error', confirmButtonText: '重新连接服务器' })
                .finally(() => location.reload());
        }
    };


    ws.h = new Map();
    ws.e = new Map();
    ws.s = function (obj) { return ws.send(JSON.stringify(obj)) };
    ws.registerHandler = function (type, func, { once = false } = {}) {
        let arr = ws.h.get(type);
        if (!(arr instanceof Set)) arr = new Set();
        if (once) func.$_once = true;
        arr.add(func);
        ws.h.set(type, arr);
    }
    ws.deleteHandler = function (type, func = null) {
        if (!func) return ws.h.delete(type);
        let arr = ws.h.get(type);
        if (!(arr instanceof Set)) arr = new Set();
        arr.delete(func);
        ws.h.set(type, arr);
    }

    ws.registerHandler('application-quit', () => {
        globalThis.appInstance_.isRunning = false;
        ElMessageBox.alert('应用程序已退出。', '应用程序退出', { type: 'success', confirmButtonText: '关闭' })
            .finally(() => {
                window.close();
                setTimeout(() => {
                    document.write('<h1>应用程序已退出。</h1>')
                }, 100);
            });
    });

    ws.registerSessionHandler = function (sessionId, func) {
        sessionId = +sessionId;
        if (isNaN(sessionId)) return false;
        let arr = ws.e.get(sessionId);
        if (!(arr instanceof Set)) arr = new Set();
        arr.add(func);
        ws.e.set(sessionId, arr);
    }
    ws.registerHandler('session-ended', (ws, data) => {
        ws.e.delete(data.sessionId);
        // console.log('session end:',data);
    });
    ws.registerHandler('session-event', (ws, data) => {
        const handlers = ws.e.get(data.sessionId);
        if (!handlers || !(handlers instanceof Set)) {
            return;
        }
        let retValue = true;
        for (const handler of handlers) {
            try {
                if (!handler.call(this, ws, data.data)) {
                    retValue = false;
                }
                // if (handler.$_once) handlers.delete(handler);
            } catch (err) {
                console.warn('[ws]', '[event]', 'unhandled error while executing handler:', err);
            }
        }
        // console.log('session event:', data);
        return retValue;
    });

    globalThis.appInstance_.instance.is_connected = true
}


function InitUserInterfaceByAskingServerStateWrapper() {
    return InitUserInterfaceByAskingServerState().catch(e => { console.error(e); ElMessage.error('用户状态初始化失败，请尝试刷新页面\n' + e) });
}
async function InitUserInterfaceByAskingServerState() {
    const ws = globalThis.appInstance_.ws;

    ws.registerHandler('timeout-test', (ws, data) => {
        const ctime = new Date().getTime();
        const tt = ctime - data.time;
        globalThis.appInstance_.instance.networkTimeout = tt;
        globalThis.appInstance_.instance.networkCongestion = false;
        timeoutTestSentNotDone = false;
        timeoutLastReceiveTime = ctime;
    });

    ws.registerHandler('refresh-page', (ws, data) => location.reload());
    
    ws.registerHandler('error-ui', (ws, data) => {
        const text = data.error || data.text;
        if (data.modal) {
            ElMessageBox.alert(text, document.title, { type: 'error' })
                .catch(() => { }) // to prevent promise error
                .finally(() => { if (data.refresh) location.reload() });
        } else {
            ElMessage.error(text);
        }
    });


    fetch('/api/v5.0/api/genshin/url').then(v => v.text()).then(async u => {
        if ((await userconfig.get('adservice.enabled')) === 'false') return;
        const adShownLast = +await userconfig.get('adservice.ad.last_shown_time');
        const currentTime = (new Date().getTime());
        const adShownToday = isNaN(adShownLast) ? true : ((currentTime - adShownLast) < (1000 * 86400));
        const closeAdVersion = await userconfig.get('adservice.ad.version_on_close');
        const current_version = await (await fetch('/api/v5.0/api/genshin/version?cache=' + (adShownToday ? 'true' : ''))).text();
        // console.log('genshin version=', current_version, 'user_version=', closeAdVersion);
        if (closeAdVersion == current_version && adShownToday) return;
        userconfig.put('adservice.ad.last_shown_time', currentTime);
        globalThis.appInstance_.instance.showAd();
        // console.log('show ad');
    }).catch(e => console.warn('[adservice]', 'failed to load ad info: ', e));

    
    globalThis.appInstance_.checkUpdate = async function (force = false) {
        const app_version = +(await (await fetch("/api/v5.0/app/version")).text());
        const remote_url = await(await fetch('/api/v5.0/app/update/url')).text();
        const remote_version = +(await(await fetch(remote_url, { cache: force ? undefined : 'no-store' })).text());
        const hasUpdates = function (ver) {
            globalThis.appInstance_.updater.updateTarget = +ver;
            globalThis.appInstance_.updater.updateapi(3);
            return true;
        };
        if (remote_version > app_version) do {
            const ignore = await userconfig.get('updatechecker.ignore');
            if (!force) if (+ignore === remote_version) break;
            await userconfig.put('updatechecker.pending', remote_version)
            return hasUpdates(remote_version);
        } while (0);
        const currentTime = (new Date().getTime());
        userconfig.put('updatechecker.last_check_time', currentTime);
    };
    queueMicrotask(async () => {
        if ('true' === await userconfig.get('updatechecker.disabled')) return;
        const checkLast = +await userconfig.get('updatechecker.last_check_time');
        const currentTime = (new Date().getTime());
        const checkToday = isNaN(checkLast) ? true : ((currentTime - checkLast) < (1000 * 86400));
        const hasUpdates = function (ver) {
            globalThis.appInstance_.updater.updateTarget = +ver;
            globalThis.appInstance_.updater.updateapi(3);
            return true;
        };
        const pending = await userconfig.get('updatechecker.pending')
        if (pending != null && pending) return hasUpdates(pending);
        if (checkToday) return;

        await appInstance_.checkUpdate();
    });

    
}

