# MyPN532

[简体中文](./README.md) | English

**WARNING** The project is not fully completed, so the English document is translated **BY GOOGLE TRANSLATE**. If there are some mistakes feel free to tell us.

# Introduction
An open source program based on [libnfc](https://github.com/nfc-tools/libnfc), supporting PN532 card readers (other common card readers should also be supported, to be tested ~~(i have no money :( ))~~ ).

The interface *borrowed* from [MCT](https://github.com/ikarus23/MifareClassicTool), developed based on the web, and the front and back ends are basically separated.

# Features (not yet completed, the ones listed below are completed)

[x] Read/write Mifare Classic (M1 card) (optionally block by block)
[x] Read/write UID/CUID card
[x] Clone tag
[x] Format tag
[x] Read/write Ntag or Mifare Ultralight
[x] Read and write data in hexadecimal format
[x] Read and write data in NDEF format
[x] Built-in mfoc
[x] Full 64-bit support
[ ] Decode and encode MIFARE Classic value blocks
[ ] Decode and encode MIFARE Classic access control conditions
[x] Display general information of the tag
[x] Built-in monaco-editor editor
[x] Calculate BCC (Block Check Character/Information Group Check Code)
[x] Faster response speed (after default device selection)
[x] It is a free software (open source) ;)

# License
GPL-3.0

In addition, **it is forbidden to reprint to CSDN without the author's consent**, and the original warehouse must be indicated when reprinting to other places.
