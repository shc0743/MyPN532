

export function LoadCSSAsLink(src) {
    const link = document.createElement('link');
    link.rel = "stylesheet";
    link.href = src;
    (document.head || document.documentElement).append(link);
    return link;
}

export function LoadCSS(css, parent = null) {
    const style = document.createElement('style');
    style.innerHTML = css;
    (parent || document.head || document.documentElement).append(style);
    return style;
}

