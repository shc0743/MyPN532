/*
parseTLV.js
Author: [shc0743](https://github.com/shc0743)
License: GPL-3.0

Thanks to [this article](https://nfcdeveloper.com/blog/2022/01/17/how-to-read-ndef-from-ntag21x-using-pc-reader.html), which helped me understand the TLV structure!

*/



class TLVRangeException extends Error {
    constructor(message) {
        super(message);
    }
}

/**
 * 
 * @param {Uint8Array} data An Uint8Array contains TLV data
 * @returns An ArrayBuffer contains TLV body
 */
export async function parseTLV(data) {
    const parts = [];
    let byte = 0, length = 0;
    for (let i = 0, l = data.byteLength; i < l; ++i) {
        byte = data[i];
        if (byte === 0x00) continue; // ignore
        if (byte === 0xFE) break; // Terminator TLV

        // read length (1 byte)
        ++i;
        if (i >= l) throw new TLVRangeException('(in parseTLV) Data out-of-range, trying to read ' + i + ' in an array contains ' + l);
        length = data[i];
        if (length === 0xFF) {
            let lengthRealSize = 1;
            do {
                ++lengthRealSize;
                length = data[++i];
            } while (length === 0xFF);
            if (undefined == length || isNaN(length)) throw new Error('unexpected data');
            const arr = [];
            for (let I = 0; I < lengthRealSize; ++I) arr.push(data[i + I]);
            i += lengthRealSize - 1;
            arr.reverse();
            length = BigInt(0);
            for (let I = 0, L = arr.length; I < L; ++I) {
                const byte = arr[I];
                length += BigInt(byte) << BigInt(8 * I);
            }
            length = Number(length);
        }
        i += length;
        if (i >= l) throw new TLVRangeException('(in parseTLV) Data out-of-range, trying to read ' + i + ' in an array contains ' + l);

        if (byte !== 0x03) continue;
        const block = data.slice(i - length + 1, i + 1);
        parts.push(block);
    }
    return await ((new Blob(parts)).arrayBuffer());
}

