

// config
export const db_name = 'MyPN532_web-data_' + globalThis.location.pathname.replace(/(\/|\\|\:|\;|\"|\'|\+|\=|\[|\]|\(|\)|\,|\.)/g, '_');
export const version = 2;


import { openDB } from '../../modules/idb/idb.esm.js';


const el_dbExpired = globalThis.document?.createElement('dialog');
if (globalThis.document) {
    el_dbExpired.innerHTML = `
<div style="font-weight: bold; font-size: large;">The database has expired.</div>
<div style="font-size: smaller; color: gray; font-family: monospace;" data-content></div>
<div>
    <span>Please</span>
    <a href="javascript:" onclick="globalThis.location.reload()">reload the page</a>
    <span>to continue.</span>
</div>
`;
    el_dbExpired.oncancel = () => false;
    (document.body || document.documentElement).append(el_dbExpired);
}




const dbUpgrade = {
    0(db, t, old) { },
    1(db, t, old) {
        db.createObjectStore('config', { autoIncrement: true });
    },
};


let db;
await new Promise(function (resolve, reject) {
    openDB(db_name, version, {
        upgrade(db, oldVersion, newVersion, transaction, event) {
            for (let version = oldVersion; version < newVersion; ++version) {
                if (dbUpgrade[version]) {
                    const _ = dbUpgrade[version].call(db, db, transaction, oldVersion);
                }
            }
        },
        blocked(currentVersion, blockedVersion, event) {
            reject(`Failed to open database ${db_name}: blocked: currentVersion = ${currentVersion}, blockedVersion = ${blockedVersion}`)
        },
        blocking(currentVersion, blockedVersion, event) {
            db.close();
            (el_dbExpired.querySelector('[data-content]') || {}).innerText = `currentVersion = ${currentVersion}, blockedVersion = ${blockedVersion}`;
            el_dbExpired.showModal();
        },
        terminated() {
            // …
        },
    })
    .then(function (result) {
        db = result;
        resolve();
    })
    .catch(reject);
    
    setTimeout(() => reject('Timeout while opening idb'), 10000);
});






export { db };
globalThis.userdata = db;






