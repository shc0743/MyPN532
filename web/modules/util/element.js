const c = new Proxy({}, {
    get(target, p, receiver) {
        if (typeof p !== 'string') return Reflect.get(target, p, receiver);
        if (!isNaN(Number(p))) {
            const n = (Number(p));
            return function createElements(tag, props = {}) {
                const arr = [];
                for (let i = 0; i < n; ++i) {
                    const el = document.createElement(tag);
                    if (props) for (const i in props) el[i] = props[i];
                    arr.push(el);
                }
                return arr;
            }
        }
        return document.createElement(p);
    },
});
export { c as el };