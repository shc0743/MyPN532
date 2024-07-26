


if ('v 1.0 : 不防检测' && false) {

/* 调用 fakeAttachShadow 后，返回获取(closed)的shadowRoot的键名
// 例：
const k = fakeAttachShadow()
const element = document.querySelector('#any_element_with_closed_shadowRoot')
const shadowRoot = element[k] // 对应的shadowRoot
*/
function fakeAttachShadow() {
    const propertyKey = '__shadowRoot__' + Math.floor(Math.random() * 100000) + '__';
    const realAttachShadow = Reflect.get(HTMLElement.prototype, 'attachShadow');
    function attachShadow() {
        const result = realAttachShadow.apply(this, arguments);
        if (arguments[0].mode !== 'open') this['#' + propertyKey] = result;
        return result;
    }
    attachShadow.toString = function () { return 'function attachShadow() { [native code] }' };
    Object.defineProperty(HTMLElement.prototype, 'attachShadow', {
        value: attachShadow,
        writable: true,
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(HTMLElement.prototype, propertyKey, {
        get() {
            return this['#' + propertyKey];
        },
        enumerable: false,
        configurable: false,
    });
    return propertyKey;
}

// const pkey = fakeAttachShadow()

}



// v 2.0 : 究极防检测


/* 调用 fakeAttachShadow_v2 后，返回获取shadowRoot的方法
// 例：
const getShadow = fakeAttachShadow_v2()
const element = document.querySelector('#any_element_with_closed_shadowRoot')
const shadowRoot = getShadow(element) // 对应的shadowRoot
// 参数：
fuck        是否启用终极防检测，改写Function.prototype.toString，没有特殊需求不建议使用，默认false
*/
function fakeAttachShadow_v2(fuck = false) {
    const map = new WeakMap(); // 存放所有 closed 的 shadowRoot
    const fn = function (element) {
        return map.get(element) || element.shadowRoot || null;
    };
    const realAttachShadow = Reflect.get(HTMLElement.prototype, 'attachShadow');
    const attachShadow = (function () {
        'use strict'; // 与原生行为保持一致，防止检测
        return { attachShadow() {
            const result = realAttachShadow.apply(this, arguments);
            if (arguments[0].mode !== 'open') map.set(this, result);
            return result;
        } }.attachShadow;
    })();
    if (fuck) {
        const nativeCode = new WeakSet();
        const originToString = Function.prototype.toString;
        const originToString2 = Object.prototype.toString;
        const [toString, toString2] = (function () {
            'use strict'; // 与原生行为保持一致，防止检测
            return [{ toString() {
                if (nativeCode.has(this)) return `function ${this.name}() { [native code] }`;
                return originToString.apply(this, arguments);
            }}.toString, { toString() {
                if (nativeCode.has(this)) return `function ${this.name}() { [native code] }`;
                return originToString2.apply(this, arguments);
            }}.toString]
        })();
        Object.defineProperty(Function.prototype, 'toString', {
            value: toString,
            writable: true, enumerable: false, configurable: true
        });
        Object.defineProperty(Object.prototype, 'toString', {
            value: toString2,
            writable: true, enumerable: false, configurable: true
        });

        nativeCode.add(toString); nativeCode.add(attachShadow);
    }
    else Object.defineProperty(attachShadow, 'toString', {
        get() { return (function toString() { return 'function attachShadow() { [native code] }' }) },
        set(value) { return false },
        enumerable: false,
        configurable: false,
    });
    Object.defineProperty(HTMLElement.prototype, 'attachShadow', {
        value: attachShadow,
        writable: true,
        enumerable: true,
        configurable: true,
    });
    return fn;
}

// const get = fakeAttachShadow_v2()



