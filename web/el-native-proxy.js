export const observer = new MutationObserver(function (data) {
    for (const i of data) {
        // 检测是不是 element-plus 组件
        if (!i.target?.classList) continue;
        if (!(Array.from(i.target.classList).filter(el => el.startsWith('el-')).length)) continue;
        // 判断属性名称
        switch (i.attributeName) {
            case 'disabled': {
                const r = null != i.target.getAttribute('disabled'); // 是否disabled
                const c = i.target.classList.contains('is-disabled'); // 是否有对应class
                const n = (r ? (!c) : c); // 是否需要操作 
                if (n) {
                    i.target.classList.toggle('is-disabled');
                }
            }
                break;
        
            default:;
        }
    }
})

observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['disabled'],
    subtree: true,
})
