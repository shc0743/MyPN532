/*
main JavaScript file for Web-File-Explorer

*/


import { reportFatalError } from './error-reporter.js';

try {
    await import('./loadmono.js');
    console.log('[monaco-editor]', 'loaded successfully');
}
catch (error) {
    throw reportFatalError(error);
}

const updateLoadStat = (globalThis.ShowLoadProgress) ? globalThis.ShowLoadProgress : function () { };

globalThis.appInstance_ = {};


export function delay(timeout = 0) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}


updateLoadStat('Waiting');
await new Promise(resolve => setTimeout(resolve));

import { registerResizableWidget } from './BindMove.js';
registerResizableWidget();

// break long tasks
await delay();

updateLoadStat('Loading Vue.js');
import { createApp } from 'vue';

// break long tasks
await delay();

import { addCSS } from './BindMove.js';

// break long tasks
await delay();

// // 
// updateLoadStat('Loading CryptoJS');
// import 'cryptojs/crypto-main.js';
// import 'cryptojs/sha256.js';

// break long tasks
await delay();

updateLoadStat('Loading Vue Application');
const Vue_App = (await import('./components/App/app.js')).default;

updateLoadStat('Creating Vue application');
const app = createApp(Vue_App);
globalThis.appInstance_.app = app;
// break long tasks
await delay();
updateLoadStat('Loading Activity');
for (const i of ['View', 'Title', 'Body']) {
    app.component('Activity' + i, (await import(`./components/Activity${i}/TEMPLATE.js`)).default);
}
// break long tasks
await delay();
updateLoadStat('Loading Element-Plus');
{
    const element = await import('element-plus');
    app.use(element);
    // for (const i in element) {
    //     if (i.startsWith('El')) app.component(i, element[i]);
    // }
}
// break long tasks
await delay();
updateLoadStat('Creating app instance');
app.config.unwrapInjectedRef = true;
app.config.compilerOptions.isCustomElement = (tag) => tag.includes('-');
app.config.compilerOptions.comments = true;

// app.mount('#app');

updateLoadStat('Finding #myApp');
const myApp = document.getElementById('myApp');
console.assert(myApp); if (!myApp) throw new Error('FATAL: #myApp not found');

// break long tasks
await delay(10);

updateLoadStat('Mounting application to document');
app.mount(myApp);

// break long tasks
await delay();
updateLoadStat('Finishing');
globalThis.FinishLoad?.call(globalThis);





// break long tasks
await delay();

import('./assets/scripts/hashchange.js').then(function (data) {
    function hashchange_handler(ev) {
        let hash = location.hash;

        if (hash.startsWith('#'))
        for (const i in data.default) {
            if (i.endsWith('/') ? hash.startsWith(i) : (function () {
                if (!i.startsWith('#')) return false;
                const url = new URL(i.substring(1), location),
                    hurl = new URL(hash.substring(1), location);
                return url.pathname === hurl.pathname;
            }())) return data.default[i].apply(globalThis.appInstance_.instance, [hash, app, ev]);
        }

        // check if it's the default app
        if (hash === '#/') {
            globalThis.appInstance_.instance.$data.current_page = 'main';
            return
        }
        if (hash === '' || hash === '#') {
            globalThis.appInstance_.instance.$data.current_page = 'main';
            history.replaceState('', document.title, '#/');
            return;
        }
    
        // run the default handler
        globalThis.appInstance_.instance.$data.current_page = '404';
    
    }
    globalThis.addEventListener('hashchange', hashchange_handler);
    setTimeout(hashchange_handler);
}).catch(function (error) { console.error('[hashchange_handler]', error) });














