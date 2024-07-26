/* IE Fuck You */() => {};
(function (global) {
    let el_noscript = document.getElementById('el_noscript');
    el_noscript.remove();
    const el = document.createElement('div');
    el.innerHTML = `
    <div style="display: flex; align-items: center; -webkit-app-region: drag; app-region: drag;">
        <div class="loading-spin" style="width: 15px; border-width: 5px;"></div>
        <div style="display: inline-block; width: 20px;"></div>
        <div data-content></div>
    </div>

    <table class="error-tracker"></table>
    
    <style>
.loading-spin {
    display: inline-block;
    aspect-ratio: 1;
    border: 10px solid;
    border-color: var(--background);
    border-radius: 100%;
    border-top-color: var(--fill);
    animation: loading-animation-01 1s infinite linear;
    -webkit-animation: loading-animation-01 1s infinite linear;
    -moz-animation: loading-animation-01 1s infinite linear;
    --background: #f6f6f6;
    --fill: #606060;
}
@keyframes loading-animation-01 {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
.error-tracker { 
    border: 1px solid gray;
    word-break: break-all;
    font-family: Consolas, monospace;
    white-space: pre;
}
.tracker-lineno {
    background-color: rgb(240, 240, 240);
    text-align: right;
    user-select: none;
}</style>`;
    const cont = el.querySelector('[data-content]');
    (document.body || document.documentElement).append(el);

    global.FinishLoad = function FinishLoad() {
        delete global.FinishLoad;
        delete global.ShowLoadProgress;
        cont.innerHTML = '';
        window.removeEventListener('error', scriptErrorHandler);
        el.remove();
    }
    global.ShowLoadProgress = function ShowLoadProgress(text, isError) {
        console[isError ? 'error' : 'log']('[lifecycle]', '[load_progress]', performance.now(), text);
        if (isError) {
            updateTimeout(true);
            cont.style.color = 'red';
            cont.innerText = text;
            return cont.innerHTML = '<b>[Error]</b>&nbsp;' + cont.innerHTML;
        }
        cont.style.color = '';
        cont.innerText = `Loading (${text})`;
        updateTimeout();
    }

    function scriptErrorHandler(ev) {
        ShowLoadProgress(`${ev.message} ([${ev.filename}], line#${ev.lineno} column#${ev.colno})`, true)
        trackError(ev, el.querySelector('.error-tracker'));
    }
    window.addEventListener('error', scriptErrorHandler);

    {
        let el = document.createElement('script');
        el.setAttribute('nomodule', '');
        el.setAttribute('src', 'data:text/javascript;base64,U2hvd0xvYWRQcm9ncmVzcygiRkFUQUw6IFlvdXIgYnJvd3NlciBpcyB0b28gbG93IHRvIHN1cHBvcnQgRUNNQVNjcmlwdDYgbW9kdWxlLiBQbGVhc2UgdXBncmFkZSB5b3VyIGJyb3dzZXIgdG8gY29udGludWUuIiwhMCk=');
        (document.head || document.documentElement).append(el);
    }

    const timeouts = ({
        10000: () => cont.innerHTML = '<b>[Tips]</b> Wait for moment...',
        30000: () => cont.innerHTML = '<b>[Info]</b> It takes longer than expected to open the application...',
        40000: () => cont.innerHTML = '<b>[Warning]</b> It seems like that your Internet connection is too slow to load this application or something bad happened. Considering look up the browser console?',
        50000: () => cont.innerHTML = '<b>[Warning]</b> This is unusual because the page takes too much time to load. Considering look up the browser console?',
        60000: () => cont.innerHTML = '<b>[Error]</b> This is very unusual, the page should not take so long to load. It is very likely that an error occurred, but we did not detect it. Consider look up the browser console and contact our support.',
    });
    const timeoutid = [];
    async function updateTimeout(clear = false) {
        if (timeoutid.length > 0) {
            timeoutid.forEach(t => clearTimeout(t));
            timeoutid.length = 0;
        }
        if (clear) return;
        for (const i in timeouts) timeoutid.push(setTimeout(timeouts[i], i));
    }
    (updateTimeout());
    async function trackError(ev, el) {
        try {
            if (!ev.filename) throw 'filename not found';
            const resp = await fetch(ev.filename);
            if (!resp.ok) throw `Failed to fetch, HTTP error ${resp.status}`;
            const blob = await resp.blob();
            if (blob.size > 1048576) throw 'file too large : size ' + blob.size;
            const text = await blob.text();
            let arr = text.split('\n');
            el.innerHTML = '';
            let errorElement = null;
            {
                const tr = document.createElement('tr');
                const td1 = document.createElement('td');
                const td2 = document.createElement('td');
                td1.className = 'tracker-lineno';
                td1.innerText = 'File.', td2.textContent = ev.filename;
                tr.append(td1), tr.append(td2);
                el.append(tr.cloneNode(true)); // 反复利用，节省资源 [doge]
                td1.innerText = 'Error.';
                td2.textContent = ev.message;
                const a = document.createElement('a');
                a.href = '#';
                a.onclick = function (event) {
                    event.preventDefault();
                    errorElement && errorElement.scrollIntoView({ behavior: 'smooth' });
                };
                a.innerText = 'Goto';
                td2.append(' ');
                td2.append(a);
                el.append(tr);
                const tr2 = document.createElement('tr');
                tr2.innerHTML = '<td class=tracker-lineno>0.</td><td></td>';
                el.append(tr2);
            }
            for (let i = 0, l = arr.length; i < l; ++i){
                const tr = document.createElement('tr');
                const ln = document.createElement('td');
                const dt = document.createElement('td');
                ln.innerText = i + 1 + '.';
                ln.className = 'tracker-lineno';
                if (i + 1 === ev.lineno) {
                    tr.style.color = 'red';
                    ln.style.fontWeight = 'bold';
                    let str = arr[i];
                    let el2 = document.createElement('span'), elError = document.createElement('span');
                    elError.style.textDecoration = 'underline red';
                    elError.style.fontWeight = 'bold';
                    if (ev.colno) {
                        el2.textContent = str.substring(0, ev.colno - 1);
                        elError.textContent = str.substring(ev.colno - 1);
                    } else elError.textContent = str;
                    dt.append(el2); dt.append(elError);
                    errorElement = tr;
                } else dt.textContent = arr[i];
                tr.append(ln);
                tr.append(dt);
                el.append(tr);
            }
        } catch (error) {
            el.innerHTML = '<b>Failed to track error</b><br>';
            el.append(String(error));
        }
    }

    ShowLoadProgress('preparing');


})((typeof(globalThis) === 'undefined') ? window : globalThis)