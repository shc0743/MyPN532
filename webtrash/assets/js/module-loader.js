// This is a solution to load module without MIME-Types check.

export default async function LoadModule(module_path, fetch_options = undefined) {
    const resp = await fetch(module_path, fetch_options);
    if (!resp.ok) throw resp;
    const blob = await resp.blob();
    const newBlob = new Blob([blob], { type: 'text/javascript' });
    const url = URL.createObjectURL(newBlob);
    let _Mymodule;
    try {
        _Mymodule = await import(url);
    }
    finally {
        URL.revokeObjectURL(url);
    }
    return _Mymodule;
}
