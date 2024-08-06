
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.Ndef= factory();
    }
}(this, function () {
    /**
     * Utility functions used for working with NDEF
     *
     * @constructor
     * @throws if you attempt to intsantiate NdefUtils
     */
    var NdefUtils = function() {
        throw "Dont construct NdefUtils!";
    };

    /**
     * Check if a value has a bit flag
     *
     * @param {!integer} value
     * @param {!integer} flag
     * @return {!boolean} true if flag is set, false otherwise
     */
    NdefUtils.hasFlag = function(value,flag) {
        return (value & flag) === flag;
    };

    /**
     * Get the type from this NDEF Record
     *
     * @constructor
     * @this {NdefRecord}
     * @param {!boolean} chunked if this record has a chunked flag
     * @param {!integer} tnf the Type Name Format for this record
     * @param {!Uint8Array} type the type data for this record
     * @param {?Uint8Array} id the id for this record, if present
     * @param {!payload} payload the payload contained in this record
     */
    var NdefRecord = function (chunked,tnf,type,id,payload) {
        if(typeof chunked == "undefined" ||
                typeof tnf == "undefined" ||
                typeof type == "undefined" ||
                typeof id == "undefined" ||
                typeof payload == "undefined") {
                    throw "Parameters missing from NdefRecord constructor call";
                }

        if(chunked === null ||
                tnf === null ||
                type === null ||
                payload === null) {
                    throw "Passed null to non-nullable constructor parameter in NdefRecord";
                }


        this.chunked = chunked;
        this.tnf = tnf;
        this.type = type;
        this.id = id;
        this.payload = payload;
    };

    /**
     * These flags and masks are used for packing/unpacking
     * the record header
     */
    NdefRecord.HDR_FLAG_MESSAGE_BEGIN = 0x80;
    NdefRecord.HDR_FLAG_MESSAGE_END = 0x40;
    NdefRecord.HDR_FLAG_CHUNKED = 0x20;
    NdefRecord.HDR_FLAG_SHORT_RECORD = 0x10;
    NdefRecord.HDR_FLAG_ID_LENGTH_PRESENT = 0x08;
    NdefRecord.HDR_MASK_TNF = 0x07;

    /**
     * Type Name Format values
     */
    NdefRecord.TNF_EMPTY = 0x00;
    NdefRecord.TNF_WELL_KNOWN = 0x01;
    NdefRecord.TNF_MEDIA = 0x02;
    NdefRecord.TNF_ABSOLUTE_URI = 0x03;
    NdefRecord.TNF_EXTERNAL = 0x04;
    NdefRecord.TNF_UNKNOWN = 0x05;
    NdefRecord.TNF_UNCHANGED = 0x06;
    NdefRecord.TNF_RESERVED = 0x07;

    /**
     * NDEF URI Prefixes
     */
    NdefRecord.URI_PRE_NONE = 0x00;
    NdefRecord.URI_PRE_HTTP_WWW = 0x01;
    NdefRecord.URI_PRE_HTTPS_WWW = 0x02;
    NdefRecord.URI_PRE_HTTP = 0x03;
    NdefRecord.URI_PRE_HTTPS = 0x04;
    NdefRecord.URI_PRE_TEL = 0x05;
    NdefRecord.URI_PRE_MAILTO = 0x06;
    NdefRecord.URI_PRE_FTP_ANON = 0x07;
    NdefRecord.URI_PRE_FTP_FTP = 0x08; // ftp://ftp
    NdefRecord.URI_PRE_FTPS = 0x09;
    NdefRecord.URI_PRE_SFTP = 0x0A;
    NdefRecord.URI_PRE_SMB = 0x0B;
    NdefRecord.URI_PRE_NFS = 0x0C;
    NdefRecord.URI_PRE_FTP = 0x0D;
    NdefRecord.URI_PRE_DAV = 0x0E;
    NdefRecord.URI_PRE_NEWS = 0x0F;
    NdefRecord.URI_PRE_TELNET = 0x10;
    NdefRecord.URI_PRE_IMAP = 0x11;
    NdefRecord.URI_PRE_RTSP = 0x12;
    NdefRecord.URI_PRE_URN = 0x13;
    NdefRecord.URI_PRE_POP = 0x14;
    NdefRecord.URI_PRE_SIP = 0x15;
    NdefRecord.URI_PRE_SIPS = 0x16;
    NdefRecord.URI_PRE_TFTP = 0x17;
    NdefRecord.URI_PRE_BTSPP = 0x18;
    NdefRecord.URI_PRE_BTL2CAP = 0x19;
    NdefRecord.URI_PRE_BTGOEP = 0x1A;
    NdefRecord.URI_PRE_TCPOBEX = 0x1B;
    NdefRecord.URI_PRE_IRDAOBEX = 0x1C;
    NdefRecord.URI_PRE_FILE = 0x1D;
    NdefRecord.URI_PRE_URN_EPC_ID = 0x1E;
    NdefRecord.URI_PRE_URN_EPC_TAG = 0x1F;
    NdefRecord.URI_PRE_URN_EPC_PAT = 0x20;
    NdefRecord.URI_PRE_URN_EPC_RAW = 0x21;
    NdefRecord.URI_PRE_URN_EPC = 0x22;
    NdefRecord.URI_PRE_URN_NFC = 0x23;

    /**
     * Indicate if this record has its chunked flag set
     *
     * @return {!boolean} isChunked;
     */
    NdefRecord.prototype.isChunked = function() {
        return this.chunked;
    };

    /**
     * Get the TNF for this record
     *
     * @return {!integer} tnf;
     */
    NdefRecord.prototype.getTnf = function() {
        return this.tnf;
    };

    /**
     * Get the type from this NDEF Record
     *
     * @return {!Uint8Array} type;
     */
    NdefRecord.prototype.getType = function() {
        return this.type;
    };

    /**
     * Get the id from this NDEF Record
     *
     * @return {?Uint8Array} id;
     */
    NdefRecord.prototype.getId = function() {
        return this.id;
    };

    /**
     * Get the payload from this NDEF Record
     *
     * @return {!Uint8Array} payload;
     */
    NdefRecord.prototype.getPayload = function() {
        return this.payload;
    };

    /**
     * Convert an NDEF Record to a byte array for writing
     *
     * @param {boolean} isBegin if this record starts a message
     * @param {boolean} isEnd if this record concludes a message
     * @return {Uint8Array} byte array representation
     */
    NdefRecord.prototype.toByteArray = function(isBegin, isEnd) {
        var shortRecord = true;
        var hasId = true;

        if(this.payload.length >= 255) {
            shortRecord = false;
        }

        if(typeof this.id === "undefined" || this.id === null || this.id.length === 0) {
            hasId = false;
        }

        var messageSize = 2; // control byte, type length

        messageSize += this.type.length;
        if(shortRecord) {
            messageSize += 1; // single byte length
        }
        else {
            messageSize += 4; // four byte length
        }

        if(hasId) {
            messageSize += 1; // id length
            messageSize += this.id.length;
        }

        messageSize += this.payload.length;

        var result = new Uint8Array(messageSize);

        // this mask should be unecessary
        var firstByte = (this.tnf & NdefRecord.HDR_MASK_TNF);

        if(shortRecord) {
            firstByte |= NdefRecord.HDR_FLAG_SHORT_RECORD;
        }

        if(hasId) {
            firstByte |= NdefRecord.HDR_FLAG_ID_LENGTH_PRESENT;
        }

        if(isBegin) {
            firstByte |= NdefRecord.HDR_FLAG_MESSAGE_BEGIN;
        }

        if(isEnd) {
            firstByte |= NdefRecord.HDR_FLAG_MESSAGE_END;
        }

        if(this.isChunked()) {
            firstByte |= NdefRecord.HDR_FLAG_CHUNKED;
        }

        var count = 0;

        result[count++] = firstByte;
        result[count++] = this.type.length;

        if(shortRecord) {
            result[count++] = 0xff & this.payload.length;
        }
        else {
            result[count++] = 0xff & (this.payload.length >>> 24);
            result[count++] = 0xff & (this.payload.length >>> 16);
            result[count++] = 0xff & (this.payload.length >>> 8);
            result[count++] = 0xff & (this.payload.length >>> 0);
        }

        if(hasId) {
            result[count++] = 0xff & this.id.length;
        }

        //add type bytes
        for(var typeCntr = 0; typeCntr < this.type.length; typeCntr++) {
            result[count++] = this.type[typeCntr];
        }

        if(hasId) {
            for(var idCntr = 0; idCntr < this.id.length; idCntr++) {
                result[count++] = this.id[idCntr];
            }
        }

        for(var pldCntr = 0; pldCntr < this.payload.length; pldCntr++) {
            result[count++] = this.payload[pldCntr];
        }

        if(result.length !== count) {
            throw "NDEF Record was not successfully generated";
        }

        return result;
    };

    /**
     * Constructs an NdefMessage from an array of NdefRecord
     *
     * @constructor
     * @param {!NdefRecord[]}  ndefRecords the records this message contains
     */
    var NdefMessage = function(ndefRecords) {
        if(typeof ndefRecords === "undefined" ||
                ndefRecords === null ||
                ndefRecords.length === 0) {
                    throw "You must supply a non-zero length array of NdefRecords to construct an NdefMessage";
                }
        this.ndefRecords = ndefRecords;
    };


    /**
     * Returns the array of records this NdefMessage contains
     *
     * @return {!NdefRecord[]} the NDEF records contained
     */
    NdefMessage.prototype.getRecords = function() {
        return this.ndefRecords;
    };

    /**
     * Returns a byte array of the message ready to be written to a tag
     *
     * @return {!Uint8Array} byte array representation
     */
    NdefMessage.prototype.toByteArray = function() {
        var result = new Uint8Array(0);
        for(var i = 0; i < this.ndefRecords.length; i++) {
            // this is very inefficient, but it shouldn't really matter
            // unless very large multi-record messages are being constructed
            var recordBytes = this.ndefRecords[i].toByteArray(i===0, i===(this.ndefRecords.length - 1));
            var grownArray = new Uint8Array(result.length + recordBytes.length);
            grownArray.set(result);
            grownArray.set(recordBytes,result.length);
            result = grownArray;
        }
        return result;
    };

    /**
     * Creates an NdefMessage from a byte array
     *
     * @param {!Uint8Array} bytes
     * @return {?NdefMessage} resulting message, null if a parse error occured
     */
    NdefMessage.fromBytes = function(bytes) {
        if(typeof bytes === "undefined" ||
                bytes === null) {
                    throw "Bytes must be defined and non-null";
                }
        // fixes odd issue when normal arrays are passed 
        bytes = new Uint8Array(bytes);
        // theoretical minimum is 3 bytes
        if(bytes.length < 3) {
            throw "Byte array is too short to contain any kind of NDEF message";
        }


        var throwOnMsgTooShort = function(bytes, idx) {
            if(bytes.length < (idx+1)) {
                throw "Message ended abruptly, trying to access index "+idx+" from an array of "+bytes.length+" items.";
            }
        };

        var ndefRecords = [];
        var done = false;
        var foundStart = false;

        var currentIndex = 0;
        while (!done) {
            if(currentIndex >= bytes.length || isNaN(currentIndex)) { // modified the current line
                // ran out of bytes before message ended
                throw "Ran out of bytes before message started";
            }

            var recordFirstByte = bytes[currentIndex];


            // check for message beginning
            foundStart = foundStart || NdefUtils.hasFlag(recordFirstByte,NdefRecord.HDR_FLAG_MESSAGE_BEGIN);

            if(foundStart) {
                done = NdefUtils.hasFlag(recordFirstByte,NdefRecord.HDR_FLAG_MESSAGE_END);
                var isChunked = NdefUtils.hasFlag(recordFirstByte,NdefRecord.HDR_FLAG_CHUNKED);
                var isShortRecord = NdefUtils.hasFlag(recordFirstByte,NdefRecord.HDR_FLAG_SHORT_RECORD);
                var hasIdLength = NdefUtils.hasFlag(recordFirstByte,NdefRecord.HDR_FLAG_ID_LENGTH_PRESENT);

                var tnf = recordFirstByte & NdefRecord.HDR_MASK_TNF;

                var typeIdx = currentIndex + 1;
                throwOnMsgTooShort(bytes,typeIdx);
                var typeLength = bytes[typeIdx];

                var payloadLength = 0;
                var payloadLengthLength = isShortRecord ? 1 : 4;
                var payloadLengthStartIdx = typeIdx+1;

                if(isShortRecord) {
                    throwOnMsgTooShort(bytes,payloadLengthStartIdx);
                    payloadLength = bytes[payloadLengthStartIdx];
                }
                else {
                    throwOnMsgTooShort(bytes,payloadLengthStartIdx+3);
                    var valueArr = new Uint32Array(bytes.slice(payloadLengthStartIdx,payloadStartIdx+4));
                    payloadLength = valueArr[0];
                }

                var idLength = 0;
                var idLengthStartIdx = payloadLengthStartIdx+payloadLengthLength;

                throwOnMsgTooShort(bytes,idLengthStartIdx);
                if(hasIdLength) {
                    idLength = bytes[idLengthStartIdx];
                }
                
                var idLengthEndIdx = idLengthStartIdx + (hasIdLength ? 1 : 0);
                var typeEndIdx = idLengthEndIdx + typeLength;
                throwOnMsgTooShort(bytes,typeEndIdx);
                var type = new Uint8Array(bytes.buffer,idLengthEndIdx,typeLength);

                var idStartIdx = typeEndIdx;                
                throwOnMsgTooShort(bytes,idStartIdx+idLength);
                var id = new Uint8Array(bytes.buffer,idStartIdx,idLength);

                var payloadStartIdx = idStartIdx+idLength;
                throwOnMsgTooShort(bytes,payloadStartIdx+payloadLength-1);
                var payload = new Uint8Array(bytes.buffer,payloadStartIdx,payloadLength);

                currentIndex = payloadStartIdx+payloadLength;
                ndefRecords.push(new NdefRecord(isChunked,tnf,type,id,payload));
            }
            else {
                currentIndex++;
            }
        }

        return new NdefMessage(ndefRecords);
    };

    /**
     * Utility functions for Ndef operations and debugging
     *
     * @version 1.0.2
     */
    var NdefRecordUtils = function() {
        throw "Do not instantiate ndef record utils";
    };

    /**
     * Resolves a URI into the appropriate NDEF record using 
     * the standard URI prefixes
     *
     * @param {string} uri uri to write
     * @returns {NdefRecord} record with the uri prefix extracted
     */
    NdefRecordUtils.createUriRecord = function(uri) {
        var parsed = NdefRecordUtils.resolveUriToPrefix(uri);
        var prefixCode = parsed.prefixCode;
        var content = parsed.content;

        var contentArray = NdefRecordUtils.stringToUint8Array(content);

        var payload = new Uint8Array(contentArray.length+1);
        payload[0] = prefixCode;
        payload.set(contentArray,1);

        return new NdefRecord(false,NdefRecord.TNF_WELL_KNOWN,new Uint8Array([0x55]),null,payload);
    };

    /**
     * Resolves a string into the appropriate UTF8 
     * text record
     *
     * @param {string} content record contents
     * @param {?string} language language code for record
     * @returns {NdefRecord}
     */
    NdefRecordUtils.createTextRecord = function(content, language) {

        var contentArray = NdefRecordUtils.stringToUint8Array(content);
        if(typeof language === "undefined") {
            language = "en";
        }
        var languageArray = NdefRecordUtils.stringToUint8Array(language);


        var payload = new Uint8Array(contentArray.length+languageArray.length+1);
        payload[0] = languageArray.length;
        payload.set(languageArray,1);
        payload.set(contentArray,1+languageArray.length);

        return new NdefRecord(false,NdefRecord.TNF_WELL_KNOWN,new Uint8Array([0x54]),null,payload);
    };

    /**
     * Internal function for converting a string
     * into a Uint8Array for creating NdefRecords
     *
     * @param {string} string record contents
     * @return {Uint8Array} binary representation
     */
    NdefRecordUtils.stringToUint8Array = function(string) {
        var escstr = encodeURIComponent(string);
        var binstr = escstr.replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
        });
        var ua = new Uint8Array(binstr.length);
        Array.prototype.forEach.call(binstr, function (ch, i) {
            ua[i] = ch.charCodeAt(0);
        });
        return ua;
    };

    /**
     * Internal function for converting a Uint8Array 
     * into a string for parsing NdefRecords
     *
     * @param {Uint8Array} binary representation
     * @return {string} string record contents
     */
    NdefRecordUtils.uint8ArrayToString = function (arr) {//MODIFIED//
        return (new TextDecoder()).decode((new Uint8Array(arr)).buffer)

        // The following code dies when meeting Chinese chars
        // so I use another plan
        var binstr = Array.prototype.map.call(arr, function (ch) {
            return String.fromCharCode(ch);
        }).join('');

        var escstr = binstr.replace(/(.)/g, function (m, p) {
            var code = p.charCodeAt(0).toString(16).toUpperCase();
            if (code.length < 2) {
                code = '0' + code;
            }
            return '%' + code;
        });
        return decodeURIComponent(escstr);    
    };

    /**
     * Resolves a URI into the appropriate prefix/data
     * pair for NDEF writing
     *
     * @param {string} uri string of supposed uri
     * @returns { prefixCode: int, prefix: string, content: string, fullUri: string}
     */
    NdefRecordUtils.resolveUriString = function(uri) {
        return NdefRecordUtils.resolveUriToPrefix(uri);
    };

    /**
     * Resolves a URI into the appropriate prefix/data
     * pair for NDEF writing
     *
     * @deprecated Use NdefRecordUtils.resolveUriString instead
     * @param uri string of supposed uri
     * @returns { prefixCode: int, prefix: string, content: string, fullUri: string}
     */
    NdefRecordUtils.resolveUriToPrefix = function(url) {
        var u = url;
        var stripper = function(prefix,prefixCode,fullUri) {
            return {
                "prefixCode": prefixCode,
                    "prefix": prefix,
                    "content": fullUri.slice(prefix.length),
                    "fullUri": fullUri
            };
        };

        if(u.startsWith("http")) {
            if(u.startsWith("https://www.")) {
                return stripper("https://www.",NdefRecord.URI_PRE_HTTPS_WWW,u);
            } else if(u.startsWith("https://")) {
                return stripper("https://",NdefRecord.URI_PRE_HTTPS,u);
            } else if(u.startsWith("http://www.")) {
                return stripper("http://www.",NdefRecord.URI_PRE_HTTP_WWW,u);
            } else if(u.startsWith("http://")) {
                return stripper("http://",NdefRecord.URI_PRE_HTTP,u);
            }
        }
        else if(u.startsWith("ftp")) {
            if(u.startsWith("ftp://ftp.")) {
                return stripper("ftp://ftp.",NdefRecord.URI_PRE_FTP_FTP,u);
            }
            else if (u.startsWith("ftps://")) {
                return stripper("ftps://",NdefRecord.URI_PRE_FTPS,u);
            }
            else if (u.startsWith("ftp://anonymous:anonymous@")) {
                return stripper("ftp://anonymous:anonymous@",NdefRecord.URI_PRE_FTP_ANON,u);
            }
            else if(u.startsWith("ftp://")) {
                return stripper("ftp://",NdefRecord.URI_PRE_FTP,u);
            }
        }
        else if (u.startsWith("mailto:")) {
            return stripper("mailto:",NdefRecord.URI_PRE_MAILTO,u);
        }
        else if (u.startsWith("tel:")) {
            return stripper("tel:",NdefRecord.URI_PRE_TEL,u);
        }
        else if (u.startsWith("sftp://")) {
            return stripper("sftp://",NdefRecord.URI_PRE_SFTP,u);
        }
        else if (u.startsWith("smb://")) {
            return stripper("smb://",NdefRecord.URI_PRE_SMB,u);
        }
        else if (u.startsWith("nfs://")) {
            return stripper("nfs://",NdefRecord.URI_PRE_NFS,u);
        }
        else if (u.startsWith("dav://")) {
            return stripper("dav://",NdefRecord.URI_PRE_DAV,u);
        }
        else if (u.startsWith("news:")) {
            return stripper("news:",NdefRecord.URI_PRE_NEWS,u);
        }
        else if (u.startsWith("telnet://")) {
            return stripper("telnet://",NdefRecord.URI_PRE_TELNET,u);
        }
        else if (u.startsWith("imap:")) {
            return stripper("imap:",NdefRecord.URI_PRE_IMAP,u);
        }
        else if (u.startsWith("rtsp://")) {
            return stripper("rtsp://",NdefRecord.URI_PRE_RTSP,u);
        }
        else if (u.startsWith("pop:")) {
            return stripper("pop:",NdefRecord.URI_PRE_POP,u);
        }
        else if (u.startsWith("sip:")) {
            return stripper("sip:",NdefRecord.URI_PRE_SIP,u);
        }
        else if (u.startsWith("sips:")) {
            return stripper("sips:",NdefRecord.URI_PRE_SIPS,u);
        }
        else if (u.startsWith("tftp:")) {
            return stripper("tftp:",NdefRecord.URI_PRE_TFTP,u);
        }
        else if (u.startsWith("btspp://")) {
            return stripper("btspp://",NdefRecord.URI_PRE_BTSPP,u);
        }
        else if (u.startsWith("btl2cap://")) {
            return stripper("btl2cap://",NdefRecord.URI_PRE_BTL2CAP,u);
        }
        else if (u.startsWith("btgoep://")) {
            return stripper("btgoep://",NdefRecord.URI_PRE_BTGOEP,u);
        }
        else if (u.startsWith("tcpobex://")) {
            return stripper("tcpobex://",NdefRecord.URI_PRE_TCPOBEX,u);
        }
        else if (u.startsWith("irdaobex://")) {
            return stripper("irdaobex://",NdefRecord.URI_PRE_IRDAOBEX,u);
        }
        else if (u.startsWith("file://")) {
            return stripper("file://",NdefRecord.URI_PRE_FILE,u);
        }
        else if (u.startsWith("urn:epc:id:")) {
            return stripper("urn:epc:id:",NdefRecord.URI_PRE_URN_EPC_ID,u);
        }
        else if (u.startsWith("urn:epc:tag:")) {
            return stripper("urn:epc:tag:",NdefRecord.URI_PRE_URN_EPC_TAG,u);
        }
        else if (u.startsWith("urn:epc:pat:")) {
            return stripper("urn:epc:pat:",NdefRecord.URI_PRE_URN_EPC_PAT,u);
        }
        else if (u.startsWith("urn:epc:raw:")) {
            return stripper("urn:epc:raw:",NdefRecord.URI_PRE_EPC_RAW,u);
        }
        else if (u.startsWith("urn:epc:")) {
            return stripper("urn:epc:",NdefRecord.URI_PRE_URN_EPC,u);
        }
        else if (u.startsWith("urn:nfc:")) {
            return stripper("urn:nfc:",NdefRecord.URI_PRE_URN_NFC,u);
        }
        else if (u.startsWith("urn:")) {
            return stripper("urn:",NdefRecord.URI_PRE_URN,u);
        }

        return stripper("",NdefRecord.URI_PRE_NONE,url);
    };

    /**
     * Resolves the completely from a WELL_KNOWN URI record
     * by prepending the appropriate URI prefix.
     *
     * @throws if record isn't a WELL_KNOWN URI
     * @throws if the record prefix isn't known
     * @param {NdefRecord} record to extract string
     * @return {string} resulting URI string
     */
    NdefRecordUtils.resolveUriRecordToString = function(ndefRecord) {
        return NdefRecordUtils.resolveUrlFromPrefix(ndefRecord);  
    };

    /**
     * Resolves the completely from a WELL_KNOWN URI record
     * by prepending the appropriate URI prefix.
     *
     * @deprecated use NdefRecordUtils.resolveUriToString instead
     * @throws if record isn't a WELL_KNOWN URI
     * @throws if the record prefix isn't known
     * @param {NdefRecord} record to extract string
     * @return {string} resulting URI string
     */
    NdefRecordUtils.resolveUrlFromPrefix = function(ndefRecord) {
        if(ndefRecord.getTnf() !== NdefRecord.TNF_WELL_KNOWN || (ndefRecord.getType())[0] !== 0x55) {
            throw "Not a WELL_KNOWN URI record";
        }
        else {
            var payload = ndefRecord.getPayload();
            var prefixCode = payload[0];
            var data = payload.slice(1);
            var prefix = "";

            switch(prefixCode) {
                case NdefRecord.URI_PRE_NONE:
                    break;
                case NdefRecord.URI_PRE_HTTP_WWW:
                    prefix = "http://www.";
                    break;
                case NdefRecord.URI_PRE_HTTPS_WWW:
                    prefix = "https://www.";
                    break;
                case NdefRecord.URI_PRE_HTTP:
                    prefix = "http://";
                    break;
                case NdefRecord.URI_PRE_HTTPS:
                    prefix = "https://";
                    break;
                case NdefRecord.URI_PRE_TEL:
                    prefix = "tel:";
                    break;
                case NdefRecord.URI_PRE_MAILTO:
                    prefix = "mailto:";
                    break;
                case NdefRecord.URI_PRE_FTP_ANON:
                    prefix = "ftp://anonymous:anonymous@";
                    break;
                case NdefRecord.URI_PRE_FTP_FTP:
                    prefix = "ftp://ftp.";
                    break; // ftp://ftp
                case NdefRecord.URI_PRE_FTPS:
                    prefix = "ftps://";
                    break;
                case NdefRecord.URI_PRE_SFTP:
                    prefix = "sftp://";
                    break;
                case NdefRecord.URI_PRE_SMB:
                    prefix = "smb://";
                    break;
                case NdefRecord.URI_PRE_NFS:
                    prefix = "nfs://";
                    break;
                case NdefRecord.URI_PRE_FTP:
                    prefix = "ftp://";
                    break;
                case NdefRecord.URI_PRE_DAV:
                    prefix = "dav://";
                    break;
                case NdefRecord.URI_PRE_NEWS:
                    prefix = "news:";
                    break;
                case NdefRecord.URI_PRE_TELNET:
                    prefix = "telnet://";
                    break;
                case NdefRecord.URI_PRE_IMAP:
                    prefix = "imap:";
                    break;
                case NdefRecord.URI_PRE_RTSP:
                    prefix = "rtsp://";
                    break;
                case NdefRecord.URI_PRE_URN:
                    prefix = "urn:";
                    break;
                case NdefRecord.URI_PRE_POP:
                    prefix = "pop:";
                    break;
                case NdefRecord.URI_PRE_SIP:
                    prefix = "sip:";
                    break;
                case NdefRecord.URI_PRE_SIPS:
                    prefix = "sips:";
                    break;
                case NdefRecord.URI_PRE_TFTP:
                    prefix = "tftp:";
                    break;
                case NdefRecord.URI_PRE_BTSPP:
                    prefix = "btspp://";
                    break;
                case NdefRecord.URI_PRE_BTL2CAP:
                    prefix = "btl2cap://";
                    break;
                case NdefRecord.URI_PRE_BTGOEP:
                    prefix = "btgoep://";
                    break;
                case NdefRecord.URI_PRE_TCPOBEX:
                    prefix = "tcpobex://";
                    break;
                case NdefRecord.URI_PRE_IRDAOBEX:
                    prefix = "irdaobex://";
                    break;
                case NdefRecord.URI_PRE_FILE:
                    prefix = "file://";
                    break;
                case NdefRecord.URI_PRE_URN_EPC_ID:
                    prefix = "urn:epc:id:";
                    break;
                case NdefRecord.URI_PRE_URN_EPC_TAG:
                    prefix = "urn:epc:tag:";
                    break;
                case NdefRecord.URI_PRE_URN_EPC_PAT:
                    prefix = "urn:epc:pat:";
                    break;
                case NdefRecord.URI_PRE_URN_EPC_RAW:
                    prefix = "urn:epc:raw:";
                    break;
                case NdefRecord.URI_PRE_URN_EPC:
                    prefix = "urn:epc:";
                    break;
                case NdefRecord.URI_PRE_URN_NFC:
                    prefix = "urn:nfc:";
                    break;
                default:
                    throw "Invalid URI code";
            }

            return prefix + NdefRecordUtils.uint8ArrayToString(data);
        }
    };

    /**
     * Resolves a WELL_KNOWN text record
     * extracting the language code and content
     *
     * @throws if record isn't a WELL_KNOWN TEXT 
     * @throws if the language code bytes are invalid
     * @returns {language: language code string, content: text contained} or null
     */
    NdefRecordUtils.resolveTextRecord = function(ndefRecord) {
        if(ndefRecord.getTnf() !== NdefRecord.TNF_WELL_KNOWN || (ndefRecord.getType())[0] !== 0x54) {
            throw "Not a WELL_KNOWN text record";
        }
        else {
            var payload = ndefRecord.getPayload();
            if(payload.length === 0) {
                throw "Missing error code";
            }

            //masking out the utf bit
            var languageCodeLength = payload[0] & 0x3F;
            if(payload.length < (languageCodeLength+1)) {
                throw "Payload too short to contain language code";
            }

            var language = NdefRecordUtils.uint8ArrayToString(payload.slice(1,1+languageCodeLength));
            var content = "";

            if(payload.length > 1+languageCodeLength) {
                content = NdefRecordUtils.uint8ArrayToString(payload.slice(1+languageCodeLength));
            }

            return {language: language, content: content}; 
        }
    };

    var Ndef = {};
    Ndef.Message = NdefMessage;
    Ndef.Record = NdefRecord;
    Ndef.Utils = NdefRecordUtils;
    return Ndef;
}));
