import { formatHexFromUint8Array, formatHexFromUint8ArrayBeautifully } from "../DumpEditor/util.js";


export const Ndef_WiFi_Data = {
    auth: {
        [0x0001]: 'Open',
        [0x0002]: 'WPA-Personal',
        [0x0004]: 'Shared',
        [0x0008]: 'WPA-Enterprise',
        [0x0010]: 'WPA2-Enterprise',
        [0x0020]: 'WPA2-Personal'
    },
    encryption: {
        [0x0001]: 'None',
        [0x0002]: 'WEP',
        [0x0004]: 'TKIP',
        [0x0008]: 'AES',
    },
};


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
        if (typestr === 'application/vnd.wfa.wsc') {
            _data = { type: 'wifi' };
            const pl = new Uint8Array(i.getPayload());
            if (pl[0] == 0x10 && pl[1] == 0x0e) try {
                for (let i = 0, l = pl.byteLength; i < l; ) {
                    const header = pl[i];
                    if (header !== 0x10) break;
                    const type = pl[i + 1];
                    if (type === 0x0e) { i += 4; continue; }
                    const length = ((pl[i + 2]) << 8) | (pl[i + 3]);
                    const data = pl.slice(i + 4, i + 4 + length);
                    const dataMerged = (data[0] << 8) | (data[1]);
                    i += 4 + length;
                    switch (type) {
                        case 0x26: break; // wifi id
                        case 0x20: break; // wifi mac
                        case 0x45: // ssid
                            _data.ssid = uint8tostr(data);
                            break;
                        case 0x27: // pswd
                            _data.password = uint8tostr(data);
                            break;
                        case 0x03: // auth type
                            _data.auth = Ndef_WiFi_Data.auth[dataMerged];
                            _data.authRaw = dataMerged;
                            break;
                        case 0x0f: // enc type
                            _data.enc = Ndef_WiFi_Data.encryption[dataMerged];
                            _data.encRaw = dataMerged;
                            break;
                        default:
                            _data['Unknown' + type] = formatHexFromUint8ArrayBeautifully(data);
                            break;
                    }
                }
            }
            catch (error) {
                _data.failure = String(error);
            }
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
    else if (tnf === 0) {
        _data = ({
            type: 'empty',
        });
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
    if (object.type === 'empty') return new Ndef.Record(false, 0, new Uint8Array(), null, new Uint8Array());
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



export const CORRECT_M1_NDEF_MAD = [
    0x14, 0x01, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1,
    0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1, 0x03, 0xe1,
];
export const CORRECT_M1_TRAILER_MAD = [
    0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0x78, 0x77, 0x88, 0xC1, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
];
export const CORRECT_M1_TRAILER_DATA = [
    0xd3, 0xf7, 0xd3, 0xf7, 0xd3, 0xf7, 0x7f, 0x07, 0x88, 0x40, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
];
export async function getTagBody(buffer = new ArrayBuffer(), type = '') {
    if (type === 'm1') {
        const parts = [];
        const BLOCK_SIZE = 16;
        const head = buffer.slice(1 * BLOCK_SIZE, 3 * BLOCK_SIZE);
        let isNdef = true;
        if (head.byteLength !== CORRECT_M1_NDEF_MAD.length) isNdef = false;
        else {
            const head_u8 = new Uint8Array(head);
            for (let i = 0, l = head.byteLength; i < l; ++i) {
                if (head_u8[i] !== CORRECT_M1_NDEF_MAD[i]) {
                    isNdef = false; break;
                }
            }
        }
        if (isNdef) {
            for (let i = 4, l = buffer.byteLength; (i * BLOCK_SIZE) < l; ++i) { // i==0 = uid block 
                const nStart = i * BLOCK_SIZE, nEnd = (((i + 1) * BLOCK_SIZE) > l) ? undefined : ((i + 1) * BLOCK_SIZE);
                if ((i + 1) % 4 === 0) continue; // key&acl block
                parts.push(buffer.slice(nStart, nEnd));
            }
        }
        // debugger; // for M1 card parts.length should be 45 (15*3)
        return {
            body: await (new Blob(parts)).arrayBuffer(),
            head, isNdef,
        };
    }
    if (type === 'm0') {
        return { body: buffer.slice(4 * 4, buffer.byteLength - (5 * 4)) };
    }
}


/**
 * pack tag payload
 * @param {Uint8Array} payload The payload to be packed
 * @param {Uint8Array} cardData card data
 * @param {Number} maxSize max packed data size
 */
export async function packTagPayload_m0(payload, cardData, maxSize = Number.MAX_SAFE_INTEGER) {
    const data = ([0x03]);
    let payloadSize = payload.length;
    if (payloadSize > 0xFFFE) throw 'payload too large for target tag';
    if (payloadSize > (maxSize - 36 - 4)) throw '写入数据量过大，尝试在 ' + (maxSize - 36 - 4) + ' 字节大小的标签中写入 ' + payloadSize + ' 字节\n;;' + 'payload too large, trying to write ' + payloadSize + ' bytes in a tag contains ' + (maxSize - 36 - 4);
    if (payloadSize > 0xFF) {
        data.push(0xFF, (payloadSize & 0xFF00) >> 8, payloadSize & 0x00FF);
    } else {
        data.push(payloadSize);
    }
    const header = (new Uint8Array(data));
    const pl = (payload);
    const body = new Uint8Array([...header, ...pl]);
    const
        card_head = cardData.slice(0, 4 * 4),
        card_tail = cardData.slice(cardData.byteLength - (5 * 4));
    const final = new Uint8Array([...card_head, ...body, 0xFE, 0, 0, 0, 0]);
    if (final.length > maxSize) throw 'result too large';
    return final//new Uint8Array(await final.arrayBuffer());
}

/**
 * pack tag payload to Mifare Classic
 * @param {Uint8Array} payload Payload
 * @param {Number} size File size (final)
 * @param {Number} sectorSize block count per size, default is 4
 */
export async function packTagPayload_m1(payload, size = 1024, sectorSize = 4) {
    const sector = [];
    for (let i = 0; i < 16; ++i) sector.push(0x00); // skip block 0
    sector.push.apply(sector, CORRECT_M1_NDEF_MAD); // seector 0 trailer block
    sector.push.apply(sector, CORRECT_M1_TRAILER_MAD); // seector 0 trailer block
    const plFiller = new Array(size).fill(0);
    const payloadSize = payload.length;
    const payloadSizeArray = [0x00, 0x03];
    if (payloadSize > 0xFFFE) throw 'payload too large for target tag';
    if (payloadSize > 0xFF) {
        payloadSizeArray.push(0xFF, (payloadSize & 0xFF00) >> 8, payloadSize & 0x00FF);
    } else {
        payloadSizeArray.push(payloadSize);
    }
    const pl =
        // (await (new Blob([payload, plFiller]).arrayBuffer()))
        ((new Uint8Array([...payloadSizeArray, ...payload, ...plFiller])))
            .slice(0, size);
    const sectorCount = size / sectorSize / 16;
    if (isNaN(sectorCount)) throw 'NaN sector count';
    let ptr = 0; let dataWritten = 0;
    for (let i = 1; ((i) < sectorCount); ++i) { // sector-level loop
        for (let j = 0; j < sectorSize; ++j) { // block-level loop
            if ((j + 1) === sectorSize) {
                // trailer block
                sector.push.apply(sector, CORRECT_M1_TRAILER_DATA);
                continue;
            }
            // data block
            sector.push.apply(sector, pl.slice(ptr, ptr + 16));
            ptr += 16; dataWritten += 16;
        }
    }
    sector.push(0xFE);
    if (dataWritten < payload.length) throw `写入数据量过大，该标签最多写入 ${dataWritten} 个字节，但尝试写入 ${payload.length} 字节的数据`;
    return new Uint8Array(sector);
}




