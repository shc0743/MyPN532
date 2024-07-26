export const NoPrevent = Symbol('NoPrevent');
export default {
    'Ctrl+Shift+I': p_Inspect,
    
};

import { addCSS } from '../js/BindMove.js';
import { el } from 'util/element.js';
function p_Inspect(ev) {
    if (!p_Inspect.__tip__) {
        const tip = p_Inspect.__tip__ = document.createElement('div');
        const id = 'pInspect_' + (new Date().getTime());
        tip.id = id;
        addCSS(`#${id} {
        position: fixed; z-index: 1073741823;
        top: calc(10px); left: 0; right: 0;
        box-sizing: border-box;
        width: fit-content; margin: 0 auto;
        background: var(--color-scheme-background, #ffffff);
        --color: var(--color-scheme-color, #000000); color: var(--color);
        border: 1px solid var(--color);
        border-radius: 5px;
        padding: 10px;
        font-family: Consolas, monospace;
        app-region: drag;\n}
        #${id} #${id}_cont {
        position: relative;
        }
        #${id} #${id}_prog {
        animation: ${id}_anim linear 5s 1;
        display: block; width: 0%;
        background: #f0f0f0;
        box-sizing: border-box;
        position: absolute; left: 0; top: 0; bottom: 0;
        border-radius: 5px;
        }
        @keyframes ${id}_anim {
        from { width: 100% }
        to { width: 0% }
        }
        `, tip, false);
        const [cont, prog] = el[2]('div');
        tip.append(prog, cont);
        prog.id = id + '_prog';
        cont.id = id + '_cont';
        cont.append('Press [Ctrl+Shift+I] again to open native inspector');
        tip.hidden = true;
        (document.body || document.documentElement).append(tip);
    }
    const lasttime = p_Inspect.__time__, now = new Date();
    if (p_Inspect.__timeid__) clearTimeout(p_Inspect.__timeid__);
    if (lasttime && (now - lasttime < 5000)) {
        p_Inspect.__time__ = null;
        if (p_Inspect.__tip__) p_Inspect.__tip__.hidden = true;
        return NoPrevent;
    }
    p_Inspect.__time__ = now;
    p_Inspect.__tip__.hidden = false;
    p_Inspect.__timeid__ = setTimeout(() => { p_Inspect.__tip__.hidden = true; delete p_Inspect.__timeid__ }, 5000);
    userdata.get('config', 'dev.disableJsCon').then(ds => (!ds) &&
        this.appInstance_.con?.open());
}
