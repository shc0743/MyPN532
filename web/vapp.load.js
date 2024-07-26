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
            if (!await (await fetch('/api/v4.8/nfc/defaultdevice')).text()) try {
                if (location.hash.startsWith('#/settings/')) throw 1;
                await (ElMessageBox.confirm('未设置默认设备，是否前往设置？', '温馨提示', {
                    type: 'warning',
                    confirmButtonText: '立即前往 (建议)',
                    cancelButtonText: '不前往 (不建议)',
                }));
                location.hash = '#/settings/#device';
            } catch { }
        })();
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
        if (fatal) {
            globalThis.appInstance_.instance.is_connected = false
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


    
}

