

export const ACTION_READ = Symbol('ACTION_READ');
export const ACTION_WRITE = Symbol('ACTION_WRITE');
export const ACTIONS = {
    [ACTION_READ]: 'read-nfc-tag-mfclassic',
    [ACTION_WRITE]: 'write-nfc-tag-mfclassic',
};

export const m1_perform_action__ACTION_KEY_MAP = {
    [ACTION_READ]: 'file',
    [ACTION_WRITE]: 'result',
};

/**
 * @brief Perform a Mifare Classic action. 
 * @param {*} actionType ACTION_READ or ACTION_WRITE
 * @param {Object} eventHandlers A 'key-value' object that describes the event handler.
 * @param {Function} defaultEventHandler The default handler if no eventHandler matches.
 * @param {Object} sendData The data contains extra information to be sent.
 * @param {Object} [param4={}] A object that declares the event callback during the connect.
 * @param {null|Function} [param4.established=null] Callback that will be called when the session is created.
 * @param {null|Function} [param4.sent=null] Callback that will be called when the session data is sent.
 * @param {null|Function} [param4.log=null] Callback that will be called when a run-log is received from the server
 * @param {null|Function} [param4.end=null] Callback that will be called when the session is ended.
 * @param {*} [identifier=Symbol()] The identifier that will be used in event callback functions.
 * @returns The name of the AUTODUMP file.
 */
async function m1_perform_action(
    actionType,
    eventHandlers,
    defaultEventHandler,
    sendData,
    {
        established = null,
        sent = null,
        log = null,
        end = null,
    } = {},
    identifier = {},
) {
    // parameter check
    if (actionType !== ACTION_READ && actionType !== ACTION_WRITE) throw 87;
    if (typeof eventHandlers !== 'object') throw 87;
    if (typeof defaultEventHandler !== 'function') throw 87;
    if (typeof sendData !== 'object') throw 87;
    if (!(established === null || typeof established === 'function')) throw 87;
    if (!(sent === null || typeof sent === 'function')) throw 87;
    if (!(end === null || typeof end === 'function')) throw 87;
    // end

    return await new Promise((resolve, reject) => {
        const senderId = String(new Date().getTime());
        let sessionId = null;
        const handler = (ws, data) => {
            if (data.senderId != senderId) return;
            appInstance_.ws.deleteHandler('session-created', handler);
            if (established) established(data, identifier);
            sessionId = data.sessionId;
            queueMicrotask(() => {
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
                        if (data.success) resolve(data[m1_perform_action__ACTION_KEY_MAP[actionType]]);
                        else reject(data);
                    }
                    if (type === 'run-log' && log) log(data, identifier);
                });
                appInstance_.ws.s(Object.assign({
                    type: ACTIONS[actionType],
                }, sendData, {
                    sessionId: data.sessionId,
                }));
                if (sent) sent(data, identifier);
            });
        };
        appInstance_.ws.registerHandler('session-created', handler);
        const handle_end = (ws, data) => {
            if (data.sessionId != sessionId) return;
            appInstance_.ws.deleteHandler('session-ended', handle_end);
            if (end) end(data, identifier);
            reject(data);
        }
        appInstance_.ws.registerHandler('session-ended', handle_end);
        appInstance_.ws.s({ type: 'create-session', senderId });
    });
}
export { m1_perform_action };


