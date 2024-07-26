export function fileinfo(fullpath) {
    if (fullpath.includes('\\')) fullpath = fullpath.replaceAll('\\', '/');
    return {
        fullpath: fullpath,
        path: fullpath.substring(0, fullpath.lastIndexOf('/')),
        name: fullpath.substring(fullpath.lastIndexOf('/') + 1),
        ext: fullpath.substring((fullpath.lastIndexOf('.') + 1) || (fullpath.length)),
    }
}
const prettyPrintFileSize = await (async function () {
    const isMac = /mac|iphone/i.test(navigator.userAgent);
    const userdec = await userdata.get('config', 'file.size.unittype.dec');
    if (userdec == null) {
        await userdata.put('config', 'value should be "true" or "false"', 'file.size.unittype.dec')
    }
    const usedec = ('boolean' === typeof userdec) ? userdec : isMac;
    const units = usedec ?
        ['Byte', 'KB', 'MB', 'GB', 'TB', 'EB'] :
        ['Byte', 'KiB', 'MiB', 'GiB', 'TiB', 'EiB'],
        n = usedec ? 1000 : 1024, d = 6;
    return function prettyPrintFileSize(size) {
        if (isNaN(size)) return size;
        size = +size;
        let newSize = size, unit = units[0];
        for (let i = 0, unitslen = units.length; i < unitslen; ++i) {
            unit = units[i];
            let _val = Math.floor((newSize / n) * (10 ** d)) / (10 ** d);
            if (_val < 1 || i + 2 > unitslen) break;
            newSize = _val;
            unit = units[i + 1];
        }
        return newSize + ' ' + unit + (unit !== units[0] ? (` (${size} ${units[0]})`) : '');
    }
})();
export { prettyPrintFileSize };
