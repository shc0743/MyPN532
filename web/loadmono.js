await new Promise((resolve, reject) => {
    require.config({ paths: { vs: './modules/monaco-editor/vs' } });
    require.config({
        'vs/nls': {
            availableLanguages: {
                //'*': navigator.language
            }
        }
    });

    require(['vs/editor/editor.main'], function () {
        const css = new CSSStyleSheet();
        css.replaceSync(`
        monaco-editor {
            display: block;
            overflow: hidden;
        }
        monaco-editor > div {
            width: 100%;
            height: 100%;
            box-sizing: border-box;
        }
        `);
        document.adoptedStyleSheets.push(css);
        customElements.define('monaco-editor', class MyEditor extends HTMLElement {
            // #shadowRoot = null;
            #el = null;
            #editor = null;
            #language = null;
            #observer = null;
            #options = null;
            #createType = null;
            constructor(language) {
                super();
                // this.#shadowRoot = this//.attachShadow({ mode: 'open' });
                // this.#el = document.createElement('div');
                // // this.#el.id = 'editor';
                // this.#el.class = 'monaco-editor-container-7c479da4-59b5-4d4b-9167-75674a4145db';
                // this.#shadowRoot.append(this.#el);
                this.#language = language;

                // // const css = new CSSStyleSheet();
                // // css.replaceSync(`
                // // :host {
                // //     display: block;
                // // }
                // // #editor {
                // //     width: 100%;
                // //     height: 100%;
                // //     box-sizing: border-box;
                // // }
                // // `);
                // // this.#shadowRoot.adoptedStyleSheets.push(css);

                this.#observer = new ResizeObserver(() => {
                    if (this.#editor) this.#editor.layout({
                        height: this.clientHeight,
                        width: this.clientWidth,
                    });
                });
            }

            connectedCallback() {
                this.#observer.observe(this);
                this.#el = document.createElement('div');
                // this.#el.id = 'editor';
                this.append(this.#el);
                this.#loadEditor(this.#language);
            }
            disconnectedCallback() {
                this.#observer.disconnect();
                this.#el.remove(); this.#el = null;
                this.#editor = null;
            }

            #value = '';
            get value() {
                if (this.#editor) return this.#editor.getValue();
                return this.#value
            }
            set value(newValue) {
                this.#value = newValue;
                if (this.#editor) this.#editor.setValue(newValue);
                return true;
            }

            get language() {
                return this.#language;
            }
            set language(newValue) {
                this.#language = newValue;

                return true;
            }

            get options() { return null }
            set options(newValue) {
                if (this.#editor) throw new Error('Application initialization already finished');
                this.#options = newValue;
                return true;
            }
            get create() { return null }
            set create(newValue) {
                if (this.#editor) throw new Error('Application initialization already finished');
                this.#createType = newValue;
                return true;
            }

            #loadEditor(language) {
                this.#editor = monaco.editor[this.#createType || 'create'](this.#el, this.#options || {
                    value: this.#value,
                    language,
                    minimap: { enabled: false },
                });
            }

            get editor() { return this.#editor }

        });
        resolve();
    });
})