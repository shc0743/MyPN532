
async function formatHex(blob) {
    // 读取Blob为ArrayBuffer  
    const arrayBuffer = await blob.arrayBuffer();

    // 使用Uint8Array来访问ArrayBuffer中的每个字节  
    const uint8Array = new Uint8Array(arrayBuffer);

    // 初始化一个字符串用于存放最终的十六进制表示  
    let hexString = '';

    // 遍历Uint8Array  
    for (let i = 0; i < uint8Array.length; i++) {
        // 将每个字节转换为两位的十六进制字符串，并添加到hexString中  
        hexString += uint8Array[i].toString(16).padStart(2, '0');

        // 每16个字节后添加换行符  
        if ((i + 1) % 16 === 0) {
            hexString += '\n';
        }
    }

    // 如果最后一组不足16个字节，则可能不需要添加换行符，但上面的逻辑已经正确处理了这一点  

    return hexString.trimEnd();
}
function hexStringToArrayBuffer(hexString) {
    // 去除字符串中的换行符和空格  
    hexString = hexString.replace(/[\r\n\s]+/g, '');

    // 检查字符串是否为有效的十六进制  
    const hexPattern = /^[0-9a-fA-F]+$/;
    if (!hexPattern.test(hexString)) {
        throw new Error('无效的十六进制字符串');
    }

    // 确保字符串长度为偶数，如果不是，则抛出错误
    if (hexString.length % 2 !== 0) {
        throw new Error('字符串长度校验异常')
    }

    // 创建一个空的Uint8Array，其长度是字符串长度的一半（因为每两个十六进制字符表示一个字节）  
    const uint8Array = new Uint8Array(hexString.length / 2);

    // 遍历字符串，每两个字符转换为一个字节  
    for (let i = 0; i < hexString.length; i += 2) {
        // 使用parseInt将两个十六进制字符转换为十进制数（即一个字节）  
        uint8Array[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }

    // 创建一个ArrayBuffer，其内容为Uint8Array的数据  
    const arrayBuffer = uint8Array.buffer;

    return arrayBuffer;
}  

export { formatHex, hexStringToArrayBuffer };