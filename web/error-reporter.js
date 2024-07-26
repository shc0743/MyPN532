export function reportFatalError(error, domain = 'default') {
    console.error(`[${domain}]`, 'Error:', error);
    const el = document.createElement('dialog');
    el.innerHTML = `
    <div style="font-size: larger; font-weight: bold; color: red;">An unhandled exception has occurred in ${domain}.</div>
    <details style="margin: 15px 0;">
        <summary>Details:</summary>
        <div data-content style="user-select: all;"></div>
    </details>
    <div>
        <span>Please try to</span>
        <a href="javascript:" onclick="globalThis.location.reload()">reload the page</a>
        <span>.</span>
    </div>`;
    el.querySelector('[data-content]').innerText = String(error);
    (document.body || document.documentElement).append(el);
    el.showModal();
    return el;
};
