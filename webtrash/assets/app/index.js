globalThis.importMapLoader.then(function () {
    const main = document.createElement('script');
    main.type = 'module';
    main.src = 'assets/app/index.esm.js';
    (document.body || document.documentElement).append(main);
});