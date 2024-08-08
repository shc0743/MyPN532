# MyPN532: 一个NFC标签读写程序，支持多种读卡器，包括PN532和ACR122U

简体中文 | [English](./README-en.md)

# 介绍
一个基于[libnfc](https://github.com/nfc-tools/libnfc)的开源程序（仿MCT），支持PN532读卡器(ACR122U等其他常见读卡器应该也支持，待测试~~（没钱）~~)。

~~**动机**: 某宝上30块包邮的PN532读卡器确实划算，但\*CR5\*2软件居然要单独购买VIP，实在是。。。遂自行基于libnfc进行开发~~

界面*借鉴*了[MCT](https://github.com/ikarus23/MifareClassicTool)，基于web进行开发，前后端基本分离。

# 特性

- [x] 读取/写入Mifare Classic (M1卡)
- [x] 读写Mifare Classic特定扇区
- [x] 读取/写入 UID/CUID/FUID/UFUID卡（魔术标签）
- [x] 锁定UFUID卡
- [x] 解锁UID卡（1代魔术标签）
- [x] 克隆标签
- [x] 格式化标签
- [x] 读取/写入 Ntag或Mifare Ultralight
- [x] 以十六进制格式读写数据
- [x] 以ASCII格式读取数据
- [x] 以NDEF格式读写数据
- [x] 自带mfoc
- [x] 全64位支持
- [x] 识别MIFARE Classic值块
- [ ] 解码和编码MIFARE Classic值块
- [ ] 解码和编码MIFARE Classic访问控制条件
- [x] 显示标签的一般信息
- [x] 内置monaco-editor编辑器
- [x] 自动计算BCC(Block Check Character/信息组校验码)
- [x] 更快速的响应速度 (在选择默认设备后)
- [x] 它是一个免费软件(开源哦) ;)

## 支持的读卡器
- [x] PN532
- [x] PCR532 (貌似和上面是一个东西?(
- [x] ACR122U (以普遍理性而论应该是支持的，但作者家境贫寒，欢迎各位帮忙测试)
- [?] 按照libnfc文档，(应该)兼容PCSC的大部分读卡器

# License
GPL-3.0

另外，**禁止未经作者同意转载到CSDN**，转载到其他地方需注明原仓库。

