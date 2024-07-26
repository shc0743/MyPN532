

let SessionId = null;
let auth_server = null;

let lastError = 0;
function GetLastError() { return lastError }


async function checkLogon() {
    if (SessionId) return SessionId;
    const _tok = localStorage.getItem('my_web_file_explorer.auth_token');
    const resp = await fetch(`${auth_server}/auth`, {
        "method": "POST",
        "body": _tok,
        "headers": {
            "X-Auth-Token": _tok
        },
    });
    if (!resp.ok) { lastError = resp.status; return false; }
    SessionId = resp.headers.get('X-Session-Id');
    await resp.text();
    return SessionId;
}

async function login(user, pswd) {
    return await loginSSO(user + ':' + btoa(pswd));
}
async function loginSSO(token) {
    localStorage.setItem('my_web_file_explorer.auth_token', token);
    return await checkLogon();
}


export function updateAuthServer() {
    auth_server = localStorage.getItem('my_web_file_explorer.server');
}
updateAuthServer();


// init
await checkLogon();



export { GetLastError };
export { SessionId, checkLogon, login, loginSSO };
