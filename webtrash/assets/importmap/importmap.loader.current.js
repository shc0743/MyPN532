(function (isProd) {
  const maps = {
    dev: 'assets/importmap/index.dev.importmap',
    prod: 'assets/importmap/index.prod.importmap',
  };
  const currentScript = document.currentScript;
  /*
  Although Synchronous `XMLHttpRequest` on the main thread is deprecated because of its detrimental effects to the end user's experience,
  we have to use it because browsers doesn't support 
  <script type="importmap" src="..."></script>
  syntax well. (`External import maps are not yet supported.`)
  For this reason, use a synchronous xhr instead of external import maps can solve this problem now.
  But this is not a really good way, so if modern browsers support external import maps in the future,
  the script will also be changed. 
  */
  /* Changed the way to load */
  // const xhr = new XMLHttpRequest();
  // xhr.open('GET', isProd ? maps.prod : maps.dev, false);
  // let content = '';
  // try {
  //   xhr.send();
  //   if (xhr.status >= 400) throw xhr;
  //   content = (xhr.response);
  // }
  // catch (error) {
  //   console.error('[importmap]', 'FATAL: Failed to get import map:', error);
  //   return error;
  // }
  //
  // const el = document.createElement('script');
  // el.type = 'importmap';
  // el.textContent = (content);
  // document.currentScript.after(el);
  globalThis.importMapLoader = fetch(isProd ? maps.prod : maps.dev)
    .then(v => v.text())
    .then(resp => {
      const el = document.createElement('script');
      el.type = 'importmap';
      el.textContent = resp;
      currentScript.after(el);
    });
  globalThis.importMapLoader.catch(error => console.error('[importmap]', 'FATAL: Failed to get import map:', error));
})(false);
