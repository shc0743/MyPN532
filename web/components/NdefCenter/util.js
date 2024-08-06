import { formatHexFromUint8ArrayBeautifully } from "../DumpEditor/util.js";


export function parseNdefObj(i) {
    if (!i.getTnf) i.getTnf = i.getTypeNameFormat;
    const tnf = i.getTnf(), type = i.getType();
    const typestr = type.length > 1000 ? "We don't process types that's too large" : uint8tostr(type);
    // console.trace(i, typestr);

    let _data = {};

    if (tnf === 1) {
        if (typestr === 'T') { // text record
            _data = (Object.assign({ type: 'text' }, Ndef.Utils.resolveTextRecord(i)));
        }
        else if (typestr === 'U') { // URI record
            const uri = Ndef.Utils.resolveUriRecordToString(i);
            if (uri.startsWith('tel:')) _data = { type: 'tel', content: (uri).substring(4), uri };
            // TODO: else if...
            else _data = { type: 'uri', content: (uri), uri: encodeURI(uri), };
        }
    }
    else if (tnf === 2) {
        if (typestr === 'application/vnd.bluetooth.ep.oob') {
            _data = ({
                type: 'bluetooth',
                mac: formatHexFromUint8ArrayBeautifully(i.getPayload(), ':').replace(/:$/, ''),
            });
        }
        if (typestr === 'text/vcard') {
            const str = uint8tostr(i.getPayload());
            _data = Object.assign(parseVCard(str), {
                type: 'person',
            });
        }
    }
    else if (tnf === 4) {
        if (typestr === 'android.com:pkg') {
            _data = ({
                type: 'android-app',
                pkgName: uint8tostr(i.getPayload()),
            });
        }
    }
    if (!_data) _data = ({ type: 'unknown' });

    _data.tnf = tnf;
    _data.ndef_type = type;
    _data.typestr = typestr;
    _data.payload = i.getPayload();
    _data.id = i.getId();
    return _data;
}

export function unparseNdefObj(object) {
    return new Ndef.Record(false, object.tnf, new Uint8Array(object.ndef_type), object.id || null, object.payload);
}

export function text2Payload(text) {
    const array = [];
    for (let i = 0, l = text.length; i < l; ++i) {
        array.push(text.charCodeAt(i));
    }
    return new Uint8Array(array);
}

export function text2Payload_utf(text) {
    return (new TextEncoder()).encode(text);
}

export function text2Payload_2(text, array = []) {
    for (let i = 0, l = text.length; i < l; ++i) {
        array.push(text.charCodeAt(i));
    }
    return (array);
}

export function uint8tostr(array) {
    return (new TextDecoder()).decode((new Uint8Array(array)).buffer)
    const arr = [];
    for (const i of array) arr.push(String.fromCodePoint(i));
    return arr.join('');
}

export function parseVCard(vcardStr) {
    const lines = vcardStr.split('\n');
    const contact = {};

    for (let line of lines) {
        if (line.startsWith('BEGIN:VCARD') || line.startsWith('END:VCARD')) {
            continue; // 忽略BEGIN和END标记  
        }

        const parts = line.split(':');
        if (parts.length < 2) continue; // 忽略格式不正确的行  

        const key = parts.shift().trim().toLowerCase();
        const value = parts.join(':').trim();

        // 根据字段类型处理值  
        switch (key) {
            case 'fn':
                contact.name = value;
                break;
            case 'org':
                contact.org = value;
                break;
            case 'adr':
                // ADR字段可能包含多个分隔的值，这里简单处理为字符串  
                contact.addr = value.split(';').map(part => part.trim()).join(' ').trim();
                break;
            case 'tel':
                // 假设只有一个电话号码，或者你可以扩展为数组  
                contact.tel = value.split(';');
                break;
            case 'email':
                // 假设只有一个电子邮件地址，或者你可以扩展为数组  
                contact.email = value.split(';');
                break;
            case 'url':
                contact.website = value;
                break;
            default:
                //// 如果需要，可以添加对其他未知字段的支持  
                // contact[key] = value;
        }
    }

    return contact;
}




