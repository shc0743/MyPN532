(function (window) {

    const menu_class = 'WINCLASS-_32768';
    const LAST_POSITION = Symbol();
    let do_not_show_new_popup = false;
    let lastPosition = { x: 0, y: 0 };

    window.CreatePopupMenu = function CreatePopupMenu() {
        let menu = document.createElement('div');

        menu.classList.add(menu_class);
        let backdrop = document.createElement('div');
        backdrop.classList.add('backdrop');
        backdrop.onpointerup = function (ev) {
            ev.preventDefault();
            ev.stopPropagation();

            // if (this.parentElement.classList.contains('close-confirm')) return false;
            // let confirmMenu = CreatePopupMenu();
            // confirmMenu.classList.add('close-confirm');
            // AppendMenu(confirmMenu, String, {disabled:true}, "Are you sure you want to close the menu?");
            // AppendMenu(confirmMenu, 'separator');
            // AppendMenu(confirmMenu, String, { align: 'center' }, "Yes", function () {
            //     backdrop.parentElement.dispatchEvent(new PointerEvent('pointerup'));
            // });
            // AppendMenu(confirmMenu, String, { align: 'center' }, "No");
            // TrackPopupMenu(confirmMenu, 'center', 'center');
            backdrop.parentElement.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

            return false;
        }
        menu.append(backdrop);

        menu.append(document.createElement('div'));

        menu.addEventListener('pointerup', stop);

        return menu;
    }
    window.AppendMenu = function AppendMenu(hMenu, type, config, data, event) {
        if (type === 'separator') {
            let sub = document.createElement('hr');
            sub.tabIndex = -1;
            sub.setAttribute('disabled', '');
            sub.addEventListener('pointerup', stop);
            hMenu.lastElementChild.append(sub);
            return sub;
        }
        if (type === String) {
            let sub = document.createElement('div');
            sub.tabIndex = 0;
            sub.append(document.createTextNode(data));
            if (config && config.submenu) {
                sub.addEventListener('pointerup', () => {
                    TrackPopupMenu(event, LAST_POSITION);
                });
            }
            else if (event) sub.addEventListener('pointerup', event);
            {
                let flags = false;
                sub.onblur = function () { flags = false };
                sub.onkeydown = function (ev) {
                    if (ev.key.includes('Enter')) flags = true;
                }
                sub.onkeyup = function (ev) {
                    if (!flags) return;
                    if (ev.key.includes('Enter')) {
                        ev.target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                    }
                }
            }
            if (config && config.disabled) {
                sub.addEventListener('pointerup', stop);
                sub.setAttribute('disabled', '');
                sub.tabIndex = -1;
            } else {
                sub.setAttribute('role', 'button');
            }
            if (config && config.align) {
                sub.style.textAlign = config.align;
            }
            hMenu.lastElementChild.append(sub);
            return sub;
        }

    }
    function min() {
        let $ = Infinity;
        for (let _ of arguments) if(_<$)$=_
        return $;
    }
    function max() {
        let $ = -Infinity;
        for (let _ of arguments) if(_>$)$=_
        return $;
    }
    window.TrackPopupMenu = function TrackPopupMenu(hMenu, x, y, flags = 0) {

        if (do_not_show_new_popup) return false;
        if (x === LAST_POSITION) {
            x = lastPosition.x, y = lastPosition.y;
        }
        else lastPosition.x = x, lastPosition.y = y;

        (document.documentElement).append(hMenu);

        if (x === 'center') {
            x = document.documentElement.clientWidth / 2 - hMenu.lastElementChild.clientWidth / 2;
        }
        if (y === 'center') {
            y = document.documentElement.clientHeight / 2 - hMenu.lastElementChild.clientHeight / 2;
        }
        if (typeof x === 'number')
            hMenu.lastElementChild.style[(flags && flags.align && flags.align.right) ? 'right' : 'left'] = x + 'px';
        if (typeof y === 'number')
            hMenu.lastElementChild.style[(flags && flags.align && flags.align.bottom) ? 'bottom' : 'top'] = y + 'px';
        // 对越界进行处理
    
        {
            const right = max(document.documentElement.offsetWidth, window.innerWidth);
            const bottom = max(document.documentElement.offsetHeight, window.innerHeight);
            if (parseInt(hMenu.lastElementChild.style.left) + hMenu.lastElementChild.clientWidth > right) {
                hMenu.lastElementChild.style.left = '';
                hMenu.lastElementChild.style.right = '3px';
            }
            if (parseInt(hMenu.lastElementChild.style.top) + hMenu.lastElementChild.clientHeight > bottom) {
                hMenu.lastElementChild.style.top = '';
                hMenu.lastElementChild.style.bottom = '3px';
            }
        }

        let _s = function () {
            return stop.apply(stop, arguments);
        }

        let currentFocus = null;

        let fh = function (ev) {
            if (/tab/i.test(ev.key)) {
                ev.preventDefault();
                ev.stopPropagation();
                return false;
            }
            if (/Up/i.test(ev.key) || /down/i.test(ev.key)) {
                if (!currentFocus) currentFocus =
                    (hMenu.querySelector('[tabindex]:not([disabled])'));
                
                if (!currentFocus) return false;

                let elem = currentFocus;
                while ((elem = elem[(/Up/i.test(ev.key) ?
                    'previous' : 'next') + 'ElementSibling'])) {
                    if (elem.getAttribute('disabled') != null) continue;
                    currentFocus = elem;
                    elem.focus();
                    break;
                }

                return;
            }
            if (/escape/i.test(ev.key)) {
                return evh(ev);
            }
        }

        function close(hMenu) {
            hMenu.removeAttribute('open');

            hMenu.remove();

            do_not_show_new_popup = true;
            setTimeout(function () {
                do_not_show_new_popup = false;
                document.removeEventListener('contextmenu', _s, {
                    capture: true
                });
            }, 100);
            hMenu.removeEventListener('pointerup', evh, {
                capture: false,
            });
            hMenu.removeEventListener('keydown', fh, {
                capture: true
            });

        }

        function evh(ev) {
            if (flags && flags.closeOnBlur) return close(hMenu);
            if (ev.target.classList.contains('backdrop')) return false;
            if (ev.target.classList.contains('disabled')) return false;
            if (ev.target === hMenu.lastElementChild) return false;

            close(hMenu);

            stop(ev);
        }

        hMenu.setAttribute('open', '');
        (hMenu.querySelector('[tabindex]:not([disabled])') || { focus: new(Function) }).focus();

        // document.addEventListener('pointerup', evh, {
        //     capture: false,
        //     once: true
        // });
        hMenu.addEventListener('pointerup', evh, {
            capture: false,
        });
        document.addEventListener('contextmenu', _s, {
            capture: true
        });
        hMenu.addEventListener('keydown', fh, {
            capture: true
        });
        if (flags && flags.closeOnBlur) {
            hMenu.lastElementChild.addEventListener('pointerover', function () {
                // bug: menu disappears automatically with the second call
                //hMenu.firstElementChild.addEventListener('pointerover', function () {
                //    close(hMenu);
                //}, {
                //    capture: true,
                //    once: true
                //});
                hMenu.firstElementChild.onpointerover =
                    () => close(hMenu);
            }, { once: true });
            hMenu.firstElementChild.onpointerover = null;
        }

        return true;
    }

    addCSS(`
    .${menu_class} {
        user-select: none;
        cursor: default;

        visibility: hidden;
    }
    .${menu_class}[open] {
        visibility: visible;
    }
    .${menu_class} > *:not(:nth-child(1)) {
        position: fixed;
        z-index: 800001;

        background: #ffffff;
        box-sizing: border-box;
        box-shadow: 3px 3px 2px 0px #aaa;

        display: flex;
        flex-direction: column;

        min-width: 80px;
        border: 1px solid #ccc;
        padding: 5px;

        transition: opacity 0.2s;
        opacity: 0;

        max-height: calc(100% - 3px);
        overflow: auto;
    }
    .${menu_class}[open] > * {
        opacity: 1;
    }
    .${menu_class} > * > * {
        display: block;
        padding: 4px;
        cursor: pointer;
        -webkit-app-region: no-drag;
        app-region: no-drag;
    }
    .${menu_class} > * > *:not(:nth-child(1)) {
        margin-top: 3px;
    }
    .${menu_class} > * > *[disabled] {
        color: gray;
        cursor: not-allowed !important;
    }
    .${menu_class} > * > *:hover:not([disabled]) {
        background: #D0D0D0;
    }
    .${menu_class}[open] > *.backdrop {
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        z-index: 800001;
        background: rgba(0, 0, 0, 0);
        cursor: not-allowed;
    }
    .${menu_class} > * > hr {
        width: 100%;
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }
    `);


    function stop(ev) {
        ev.preventDefault();
        ev.stopPropagation();
    }





    function addCSS(text) {
        if ('adoptedStyleSheets' in document) {
            const css = new CSSStyleSheet;
            css.replace(text);
            document.adoptedStyleSheets.push(css);
        }
        let css = document.createElement('style');
        css.innerHTML = text;
        document.head.append(css);
        return css;
    }

})(window.exports || window);


