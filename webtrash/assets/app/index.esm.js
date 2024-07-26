/*
main JavaScript file for MyPN532

*/


import { reportFatalError } from './error-reporter.js';

const updateLoadStat = (globalThis.ShowLoadProgress) ? globalThis.ShowLoadProgress : function () {};

globalThis.appInstance_ = {};


export function delay(timeout = 0) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}



updateLoadStat('Waiting');
await new Promise(resolve => setTimeout(resolve));

import { addCSS, registerResizableWidget } from '../js/BindMove.js';
registerResizableWidget();

let db_name = null;
try {
    updateLoadStat('Loading userdata');
    db_name = (await import('./userdata.js')).db_name;
}
catch (error) {
    throw reportFatalError(error, 'main');
}

// break long tasks
await delay();


// break long tasks
await delay();


// break long tasks
await delay();

updateLoadStat('Creating JSCon');
import { JsCon, register as registerJsCon } from '../js/jscon.js';
registerJsCon();
globalThis.appInstance_.con = new JsCon();
do {
    const disableJsCon = await userdata.get('config', 'dev.disableJsCon');
    if (disableJsCon) {
        globalThis.appInstance_.con.error('Console is disabled!');
        // globalThis.appInstance_.con.error('Type "location.reload()" to reload the page');

        globalThis.appInstance_.con.disableObject();
        break;
    }
    if(typeof disableJsCon !== 'boolean') await userdata.put('config', false, 'dev.disableJsCon')
    globalThis.appInstance_.con.registerConsoleAPI(globalThis.console);
    globalThis.appInstance_.con.addErrorHandler();
} while (0);

// break long tasks
await delay();

updateLoadStat('Loading Vue.js');
import { createApp } from 'vue';
updateLoadStat('Loading Resource Loader');
import { LoadCSSAsLink } from '../js/ResourceLoader.js';

// break long tasks
await delay();

updateLoadStat('Loading element-plus.css');
LoadCSSAsLink('modules/element-plus/element-plus.css');


updateLoadStat('Loading version');
try {
    globalThis.appInstance_.version = await (await fetch('assets/app/version')).text();
} catch (error) {
    globalThis.appInstance_.version = Symbol('N/A');
    globalThis.appInstance_.versionError = error;
}

// break long tasks
await delay();

updateLoadStat('Loading Vue Application');
// import Vue_App from '../../components/App/app.js'; // don't use this because some browser preload modules so that the progress cannot show correctly
const Vue_App = (await import('../../components/App/app.js')).default;

updateLoadStat('Creating Vue application');
const app = createApp(Vue_App);
// break long tasks
await delay(10);
updateLoadStat('Loading Element-Plus');
{
    const element = await import('element-plus');
    for (const i in element) {
        if (i.startsWith('El')) app.component(i, element[i]);
    }
}
// break long tasks
await delay();
updateLoadStat('Creating app instance');
globalThis.appInstance_.app = app;
app.config.unwrapInjectedRef = true;
app.config.compilerOptions.isCustomElement = (tag) => tag.includes('-');
app.config.compilerOptions.comments = true;

// app.mount('#app');

updateLoadStat('Finding #myApp');
const myApp = document.getElementById('myApp');
console.assert(myApp); if (!myApp) throw new Error('FATAL: #myApp not found');

app.config.globalProperties.tr = v => v;

// break long tasks
await delay(10);

updateLoadStat('Mounting application to document');
app.mount(myApp);

updateLoadStat('Waiting');
await delay();

// break long tasks
await delay();
updateLoadStat('Finishing');
globalThis.FinishLoad?.call(globalThis);




// break long tasks
await delay(100);


import('./hashchange.js').then(function (data) {
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

import('./cp.js').then(function ({ CommandPanel }) {
    globalThis.commandPanel = new CommandPanel();
}).catch(function (error) { console.error('[CommandPanel]', error) });



globalThis.addEventListener('storage', function (ev) {
    if (ev.key === db_name + '-update') {
        globalThis.loadServers();
    }
});


import('./keyboard_shortcuts.js').then((moduleHandle) => {
    const { default: ks, NoPrevent } = moduleHandle;
    globalThis.addEventListener('keydown', function (ev) {
        const keys = [];
        if (ev.ctrlKey && ev.key !== 'Control') keys.push('Ctrl');
        if (ev.altKey && ev.key !== 'Alt') keys.push('Alt');
        if (ev.shiftKey && ev.key !== 'Shift') keys.push('Shift');
        keys.push(ev.key.length === 1 ? ev.key.toUpperCase() : ev.key);
        const key = keys.join('+');

        const fn = ks[key];
        if (fn) {
            const ret = fn.call(globalThis, ev, key);
            if (ret !== NoPrevent) ev.preventDefault();
        }
        return;
    });
});















