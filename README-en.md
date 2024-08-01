# MyPN532: A NFC tag reader program which supports a wide range of card readers including PN532 and ACR122U

[简体中文](./README.md) | English

**WARNING** The project is not fully completed, so the English document is translated **BY GOOGLE TRANSLATE**. If there are some mistakes feel free to tell us.

# Introduction
An open source program based on [libnfc](https://github.com/nfc-tools/libnfc), which supports PN532 card readers and ACR122U *should be* supported too (other common card readers *should* also be supported).

The interface *borrowed* from [MCT](https://github.com/ikarus23/MifareClassicTool), developed based on the web, and the front and back ends are basically separated.

# Features (The project is not completed; these features listed below are TO-DOs)

- [x] Read/write Mifare Classic (M1 card)
- [x] Read/write specified sector(s) of Mifare Classic
- [x] Read/write Magic Tag (Gen1/Gen2) (especially "UID", "CUID", - "FUID", etc...)
- [x] Lock UFUID card
- [x] Unlock UID card
- [x] Clone tag
- [x] Format tag
- [x] Read/write Ntag or Mifare Ultralight
- [x] Read and write data in hexadecimal format
- [x] **ONLY Read** data in **ASCII** format
- [x] Read and write data in NDEF format
- [x] Built-in mfoc
- [x] Full 64-bit support
- [x] Identify MIFARE Classic value blocks
- [ ] Decode and encode MIFARE Classic value blocks
- [ ] Decode and encode MIFARE Classic access control conditions
- [x] Display general information of the tag
- [x] Built-in monaco-editor editor
- [x] Calculate BCC automatically (Block Check Character/Information Group Check Code)
- [x] Faster response speed (after default device selection)
- [x] It is a free software (open source) ;)

## Supported card readers
**Note**: This project uses [libnfc](https://github.com/nfc-tools/libnfc), so a wide range of readers should be supported
- [x] PN532
- [x] ACR122U (it should work; but I have no money to buy one. If there are problems feel free to tell me)
- [?] PCSC-based readers (according to libnfc documents)

# License
GPL-3.0

In addition, **it is forbidden to reprint to CSDN without the author's consent**, and the original warehouse must be indicated when reprinting to other places.
