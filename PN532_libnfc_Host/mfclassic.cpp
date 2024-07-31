#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#include <string.h>
#include <ctype.h>

#ifndef _WIN32
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

#include <nfc/nfc.h>

#include "mifare.h"
#include "../../resource/tool.h"
using namespace std;

static nfc_context *context;
static nfc_device *pnd;
static nfc_target nt;
static mifare_param mp;
static mifare_classic_tag mtKeys;
static mifare_classic_tag mtDump;
static bool bUseKeyA;
static bool bUseKeyFile;
//static bool bForceKeyFile;
static bool bTolerateFailures;
static bool bFormatCard;
static bool dWrite = false;
static bool unlocked = false;
static uint8_t uiBlocks;
static uint8_t keys[] = {
	0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
	0xd3, 0xf7, 0xd3, 0xf7, 0xd3, 0xf7,
	0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5,
	0xb0, 0xb1, 0xb2, 0xb3, 0xb4, 0xb5,
	0x4d, 0x3a, 0x99, 0xc3, 0x51, 0xdd,
	0x1a, 0x98, 0x2c, 0x7e, 0x45, 0x9a,
	0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0xab, 0xcd, 0xef, 0x12, 0x34, 0x56
};
static uint8_t default_key[] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
static uint8_t default_acl[] = {0xff, 0x07, 0x80, 0x69};

static const nfc_modulation nmMifare = {
	.nmt = NMT_ISO14443A,
	.nbr = NBR_106,
};

static size_t num_keys = sizeof(keys) / 6;

#define MAX_FRAME_LEN 264

static uint8_t abtRx[MAX_FRAME_LEN];
static int szRxBits;

uint8_t abtHalt[4] = { 0x50, 0x00, 0x00, 0x00 };

// special unlock command
uint8_t abtUnlock1[1] = { 0x40 };
uint8_t abtUnlock2[1] = { 0x43 };
DWORD Echo(PVOID buffer, DWORD count);
DWORD Echo(std::wstring str);

static bool
transmit_bits(const uint8_t *pbtTx, const size_t szTxBits)
{
	// Transmit the bit frame command, we don't use the arbitrary parity feature
	if ((szRxBits = nfc_initiator_transceive_bits(pnd, pbtTx, szTxBits, NULL, abtRx, sizeof(abtRx), NULL)) < 0)
		return false;

	// Succesful transfer
	return true;
}


static bool
transmit_bytes(const uint8_t *pbtTx, const size_t szTx)
{
	// Transmit the command bytes
	int res;
	if ((res = nfc_initiator_transceive_bytes(pnd, pbtTx, szTx, abtRx, sizeof(abtRx), 0)) < 0)
		return false;

	// Succesful transfer
	return true;
}

static void
print_success_or_failure(bool bFailure, uint32_t *uiBlockCounter)
{
	printf("%c", (bFailure) ? 'x' : '.');
	if (uiBlockCounter && !bFailure)
		*uiBlockCounter += 1;
}

static bool
is_first_block(uint32_t uiBlock)
{
	// Test if we are in the small or big sectors
	if (uiBlock < 128)
		return ((uiBlock) % 4 == 0);
	else
		return ((uiBlock) % 16 == 0);
}

static bool
is_trailer_block(uint32_t uiBlock)
{
	// Test if we are in the small or big sectors
	if (uiBlock < 128)
		return ((uiBlock + 1) % 4 == 0);
	else
		return ((uiBlock + 1) % 16 == 0);
}

static uint32_t
get_trailer_block(uint32_t uiFirstBlock)
{
	// Test if we are in the small or big sectors
	uint32_t trailer_block = 0;
	if (uiFirstBlock < 128) {
		trailer_block = uiFirstBlock + (3 - (uiFirstBlock % 4));
	} else {
		trailer_block = uiFirstBlock + (15 - (uiFirstBlock % 16));
	}
	return trailer_block;
}

#define ERR(x) (fprintf(stderr, "%s\n", (x)))

static bool
authenticate(uint32_t uiBlock)
{
	mifare_cmd mc;

	// Set the authentication information (uid)
	memcpy(mp.mpa.abtAuthUid, nt.nti.nai.abtUid + nt.nti.nai.szUidLen - 4, 4);

	// Should we use key A or B?
	mc = (bUseKeyA) ? MC_AUTH_A : MC_AUTH_B;

#if 1
	// Key file authentication.
	if (bUseKeyFile) {

		// Locate the trailer (with the keys) used for this sector
		uint32_t uiTrailerBlock;
		uiTrailerBlock = get_trailer_block(uiBlock);

		// Extract the right key from dump file
		if (bUseKeyA)
			memcpy(mp.mpa.abtKey, mtKeys.amb[uiTrailerBlock].mbt.abtKeyA, sizeof(mp.mpa.abtKey));
		else
			memcpy(mp.mpa.abtKey, mtKeys.amb[uiTrailerBlock].mbt.abtKeyB, sizeof(mp.mpa.abtKey));

		// Try to authenticate for the current sector
		if (nfc_initiator_mifare_cmd(pnd, mc, uiBlock, &mp))
			return true;

		// If formatting or not using key file, try to guess the right key
	}
#if 1
	else 
#endif
#endif
	 {
		for (size_t key_index = 0; key_index < num_keys; key_index++) {
			memcpy(mp.mpa.abtKey, keys + (key_index * 6), 6);
			if (nfc_initiator_mifare_cmd(pnd, mc, uiBlock, &mp)) {
				if (bUseKeyA)
					memcpy(mtKeys.amb[uiBlock].mbt.abtKeyA, &mp.mpa.abtKey, sizeof(mtKeys.amb[uiBlock].mbt.abtKeyA));
				else
					memcpy(mtKeys.amb[uiBlock].mbt.abtKeyB, &mp.mpa.abtKey, sizeof(mtKeys.amb[uiBlock].mbt.abtKeyB));
				return true;
			}
			if (nfc_initiator_select_passive_target(pnd, nmMifare, nt.nti.nai.abtUid, nt.nti.nai.szUidLen, NULL) <= 0) {
				ERR("tag was removed");
				return false;
			}
		}
	}

	return false;
}

static bool
unlock_card(bool write)
{
	// Configure the CRC
	if (nfc_device_set_property_bool(pnd, NP_HANDLE_CRC, false) < 0) {
		nfc_perror(pnd, "nfc_configure");
		return false;
	}
	// Use raw send/receive methods
	if (nfc_device_set_property_bool(pnd, NP_EASY_FRAMING, false) < 0) {
		nfc_perror(pnd, "nfc_configure");
		return false;
	}

	iso14443a_crc_append(abtHalt, 2);
	transmit_bytes(abtHalt, 4);
	// now send unlock
	if (!transmit_bits(abtUnlock1, 7)) {
		printf("Warning: Unlock command [1/2]: failed / not acknowledged.\n");
		dWrite = true;
		if (write) {
			printf("Trying to rewrite block 0 on a direct write tag.\n");
		}
	} else {
		if (transmit_bytes(abtUnlock2, 1)) {
			printf("Card unlocked\n");
			unlocked = true;
		} else {
			printf("Warning: Unlock command [2/2]: failed / not acknowledged.\n");
		}
	}

	// reset reader
	if (!unlocked) {
		if (nfc_initiator_select_passive_target(pnd, nmMifare, nt.nti.nai.abtUid, nt.nti.nai.szUidLen, NULL) <= 0) {
			printf("Error: tag was removed\n");
			nfc_close(pnd);
			nfc_exit(context);
			return(EXIT_FAILURE);
		}
		return true;
	}
	// Configure the CRC
	if (nfc_device_set_property_bool(pnd, NP_HANDLE_CRC, true) < 0) {
		nfc_perror(pnd, "nfc_device_set_property_bool");
		return false;
	}
	// Switch off raw send/receive methods
	if (nfc_device_set_property_bool(pnd, NP_EASY_FRAMING, true) < 0) {
		nfc_perror(pnd, "nfc_device_set_property_bool");
		return false;
	}
	return true;
}

static int
get_rats(void)
{
	int res;
	uint8_t abtRats[2] = { 0xe0, 0x50};
	// Use raw send/receive methods
	if (nfc_device_set_property_bool(pnd, NP_EASY_FRAMING, false) < 0) {
		nfc_perror(pnd, "nfc_configure");
		return -1;
	}
	res = nfc_initiator_transceive_bytes(pnd, abtRats, sizeof(abtRats), abtRx, sizeof(abtRx), 0);
	if (res > 0) {
		// ISO14443-4 card, turn RF field off/on to access ISO14443-3 again
		if (nfc_device_set_property_bool(pnd, NP_ACTIVATE_FIELD, false) < 0) {
			nfc_perror(pnd, "nfc_configure");
			return -1;
		}
		if (nfc_device_set_property_bool(pnd, NP_ACTIVATE_FIELD, true) < 0) {
			nfc_perror(pnd, "nfc_configure");
			return -1;
		}
	}
	// Reselect tag
	if (nfc_initiator_select_passive_target(pnd, nmMifare, NULL, 0, &nt) <= 0) {
		printf("Error: tag disappeared\n");
		nfc_close(pnd);
		nfc_exit(context);
		return(EXIT_FAILURE);
	}
	return res;
}

static bool
read_card(bool read_unlocked)
{
	int32_t iBlock;
	bool bFailure = false;
	uint32_t uiReadBlocks = 0;

	if (read_unlocked) {
		unlock_card(false);
		//If the user is attempting an unlocked read, but has a direct-write type magic card, they don't
		//need to use the R mode. We'll trigger a warning and let them proceed.
		if (dWrite) {
			printf("Note: This card can't do an unlocked read (R) \n");
			read_unlocked = 0;
			return false;
		}
	}

	printf("Reading out %d blocks |", uiBlocks + 1);
	// Read the card from end to begin
	for (iBlock = uiBlocks; iBlock >= 0; iBlock--) {
		// Authenticate everytime we reach a trailer block
		if (is_trailer_block(iBlock)) {
			if (bFailure) {
				// When a failure occured we need to redo the anti-collision
				if (nfc_initiator_select_passive_target(pnd, nmMifare, NULL, 0, &nt) <= 0) {
					printf("!\nError: tag was removed\n");
					nfc_perror(pnd, "nfc_initiator_select_passive_target");
					return false;
				}
				bFailure = false;
			}

			fflush(stdout);

			// Try to authenticate for the current sector
			if (!read_unlocked && !authenticate(iBlock)) {
				printf("!\nError: authentication failed for block %i #0x%%02x\n", iBlock);
				continue;
				//return false;
			}
			// Try to read out the trailer
			if (nfc_initiator_mifare_cmd(pnd, MC_READ, iBlock, &mp)) {
				if (read_unlocked) {
					memcpy(mtDump.amb[iBlock].mbd.abtData, mp.mpd.abtData, sizeof(mtDump.amb[iBlock].mbd.abtData));
				} else {
					 // Copy the keys over from our key dump and store the retrieved access bits
					 memcpy(mtDump.amb[iBlock].mbt.abtKeyA, mtKeys.amb[iBlock].mbt.abtKeyA, sizeof(mtDump.amb[iBlock].mbt.abtKeyA));
					 memcpy(mtDump.amb[iBlock].mbt.abtAccessBits, mp.mpt.abtAccessBits, sizeof(mtDump.amb[iBlock].mbt.abtAccessBits));
					 memcpy(mtDump.amb[iBlock].mbt.abtKeyB, mtKeys.amb[iBlock].mbt.abtKeyB, sizeof(mtDump.amb[iBlock].mbt.abtKeyB));
					}
			} else {
				printf("!\nfailed to read trailer block %i\n", iBlock);
				nfc_perror(pnd, "nfc_initiator_mifare_cmd");
				bFailure = true;
			}
		} else {
			// Make sure a earlier readout did not fail
			if (!bFailure) {
				// Try to read out the data block
				if (nfc_initiator_mifare_cmd(pnd, MC_READ, iBlock, &mp)) {
					memcpy(mtDump.amb[iBlock].mbd.abtData, mp.mpd.abtData, sizeof(mtDump.amb[iBlock].mbd.abtData));
				} else {
					printf("!\nError: unable to read block %i #0x%%02x\n", iBlock);
					bFailure = true;
				}
			}
		}
		// Show if the readout went well for each block
		print_success_or_failure(bFailure, &uiReadBlocks);
		if ((!bTolerateFailures) && bFailure)
			return false;
	}
	printf("|\n");
	printf("Done, %d of %d blocks read.\n", uiReadBlocks, uiBlocks + 1);
	fflush(stdout);

	return true;
}

static bool
write_card(bool write_block_zero)
{
	uint32_t uiBlock;
	bool bFailure = false;
	uint32_t uiWriteBlocks = 0;

	//Determine if we have to unlock the card
	if (write_block_zero) {
		unlock_card(true);
	}

	Echo(L"Writing " + to_wstring(uiBlocks + (write_block_zero ? 1 : 0)) + L" blocks |");
	// Completely write the card, but skipping block 0 if we don't need to write on it
	for (uiBlock = 0; uiBlock <= uiBlocks; uiBlock++) {
		//Determine if we have to write block 0
		if (!write_block_zero && uiBlock == 0) {
			continue;
		}
		// Authenticate everytime we reach the first sector of a new block
		if (uiBlock == 1 || is_first_block(uiBlock)) {
			if (bFailure) {
				// When a failure occured we need to redo the anti-collision
				if (nfc_initiator_select_passive_target(pnd, nmMifare, NULL, 0, &nt) <= 0) {
					printf("!\nError: tag was removed\n");
					return false;
				}
				bFailure = false;
			}

			fflush(stdout);

			// Try to authenticate for the current sector
			// If we are are writing to a chinese magic card, we've already unlocked
			// If we're writing to a direct write card, we need to authenticate
			// If we're writing something else, we'll need to authenticate
			if ((write_block_zero && dWrite) || !write_block_zero) {
				if (!authenticate(uiBlock) && !bTolerateFailures) {
					printf("!\nError: authentication failed for block %02x\n", uiBlock);
					return false;
				}
			}
		}

			if (is_trailer_block(uiBlock)) {
				if (bFormatCard) {
					// Copy the default key and reset the access bits
					memcpy(mp.mpt.abtKeyA, default_key, sizeof(mp.mpt.abtKeyA));
					memcpy(mp.mpt.abtAccessBits, default_acl, sizeof(mp.mpt.abtAccessBits));
					memcpy(mp.mpt.abtKeyB, default_key, sizeof(mp.mpt.abtKeyB));
				} else {
					// Copy the keys over from our key dump and store the retrieved access bits
					memcpy(mp.mpt.abtKeyA, mtDump.amb[uiBlock].mbt.abtKeyA, sizeof(mp.mpt.abtKeyA));
					memcpy(mp.mpt.abtAccessBits, mtDump.amb[uiBlock].mbt.abtAccessBits, sizeof(mp.mpt.abtAccessBits));
					memcpy(mp.mpt.abtKeyB, mtDump.amb[uiBlock].mbt.abtKeyB, sizeof(mp.mpt.abtKeyB));
				}

				// Try to write the trailer
				if (nfc_initiator_mifare_cmd(pnd, MC_WRITE, uiBlock, &mp) == false) {
					printf("failed to write trailer block %d \n", uiBlock);
					bFailure = true;
				}
			} else {
				// Make sure a earlier write did not fail
				if (!bFailure) {
					// Try to write the data block
					if (bFormatCard && uiBlock)

						memset(mp.mpd.abtData, 0x00, sizeof(mp.mpd.abtData));
					else
						memcpy(mp.mpd.abtData, mtDump.amb[uiBlock].mbd.abtData, sizeof(mp.mpd.abtData));
					// do not write a block 0 with incorrect BCC - card will be made invalid!
					if (uiBlock == 0) {
						if ((mp.mpd.abtData[0] ^ mp.mpd.abtData[1] ^ mp.mpd.abtData[2] ^ mp.mpd.abtData[3] ^ mp.mpd.abtData[4]) != 0x00) {
							Echo(L"!\nError: incorrect BCC in MFD file!\n");
							Echo(L"Expecting BCC=(decimal)" + to_wstring(mp.mpd.abtData[0] ^ mp.mpd.abtData[1] ^ mp.mpd.abtData[2] ^ mp.mpd.abtData[3]) + L"\n");
							return false;
						}
					}
					if (!nfc_initiator_mifare_cmd(pnd, MC_WRITE, uiBlock, &mp)) {
						bFailure = true;
						Echo(L"Failure to write to data block " + to_wstring(uiBlock) + L"\n");
					}
					if (uiBlock == 0 && dWrite) {
						if (nfc_initiator_init(pnd) < 0) {
							nfc_perror(pnd, "nfc_initiator_init");
							nfc_close(pnd);
							nfc_exit(context);
							return(EXIT_FAILURE);
						};
						if (nfc_initiator_select_passive_target(pnd, nmMifare, NULL, 0, &nt) <= 0) {
							printf("!\nError: tag was removed\n");
							return false;
						}
					}
				} else {
					printf("Failure during write process.\n");
				}
			}
		//}
		// Show if the write went well for each block
		print_success_or_failure(bFailure, &uiWriteBlocks);
		if ((! bTolerateFailures) && bFailure)
			return false;
	}

	Echo(L"|\n");
	char szbuffer[256]{};
	sprintf_s(szbuffer, "Done, %d of %d blocks written.\n", uiWriteBlocks, uiBlocks + 1);
	Echo(s2ws(szbuffer));
	fflush(stdout);

	return true;
}

typedef enum {
	ACTION_READ,
	ACTION_WRITE,
	ACTION_USAGE
} action_t;

static void
print_usage(const char *pcProgramName)
{
	return;
	printf("Usage: ");
	#ifndef _WIN32
	printf("%s f|r|R|w|W a|b u|U<01ab23cd> <dump.mfd> [<keys.mfd> [f] [v]]\n", pcProgramName);
	#else
	printf("%s f|r|R|w|W a|b u|U<01ab23cd> <dump.mfd> [<keys.mfd> [f]]\n", pcProgramName);
	#endif
	printf("  f|r|R|w|W     - Perform format (f) or read from (r) or unlocked read from (R) or write to (w) or block 0 write to (W) card\n");
	printf("                  *** format will reset all keys to FFFFFFFFFFFF and all data to 00 and all ACLs to default\n");
	printf("                  *** unlocked read does not require authentication and will reveal A and B keys\n");
	printf("                  *** note that block 0 write will attempt to overwrite block 0 including UID\n");
	printf("                  *** block 0 write only works with special Mifare cards (Chinese clones)\n");
	printf("  a|A|b|B       - Use A or B keys for action; Halt on errors (a|b) or tolerate errors (A|B)\n");
	printf("  u|U           - Use any (u) uid or supply a uid specifically as U01ab23cd.\n");
	printf("  <dump.mfd>    - MiFare Dump (MFD) used to write (card to MFD) or (MFD to card)\n");
	printf("  <keys.mfd>    - MiFare Dump (MFD) that contain the keys (optional)\n");
	printf("  f             - Force using the keyfile even if UID does not match (optional)\n");
	#ifndef _WIN32
	printf("  v             - Sends libnfc log output to console (optional)\n");
	#endif
	printf("Examples: \n\n");
	printf("  Read card to file, using key A:\n\n");
	printf("    %s r a u mycard.mfd\n\n", pcProgramName);
	printf("  Write file to blank card, using key A:\n\n");
	printf("    %s w a u mycard.mfd\n\n", pcProgramName);
	printf("  Write new data and/or keys to previously written card, using key A:\n\n");
	printf("    %s w a u newdata.mfd mycard.mfd\n\n", pcProgramName);
	printf("  Format/wipe card (note two passes required to ensure writes for all ACL cases):\n\n");
	printf("    %s f A u dummy.mfd keyfile.mfd f\n", pcProgramName);
	printf("    %s f B u dummy.mfd keyfile.mfd f\n\n", pcProgramName);
	printf("  Read card to file, using key A and uid 0x01 0xab 0x23 0xcd:\n\n");
	printf("    %s r a U01ab23cd mycard.mfd\n\n", pcProgramName);
}


int nfc_mfclassic(CmdLineW& cl)
{
	action_t atAction = ACTION_USAGE;
	uint8_t *pbtUID;
	uint8_t _tag_uid[4]{};
	uint8_t *tag_uid = _tag_uid;

	bool    unlock = false;

	wstring command; cl.getopt(L"c", command);

	if (command == L"r" || command == L"R") {
		atAction = ACTION_READ;
		if (command == L"R")
			unlock = true;
		bUseKeyA = cl.getopt(L"use-key-a") != 0;
		bTolerateFailures = true;
		bUseKeyFile = true;
	} else if (command == L"w" || command == L"W" || command == L"f") {
		atAction = ACTION_WRITE;
		if (command == L"W")
			unlock = true;
		bFormatCard = (command == L"f");
		bUseKeyA = cl.getopt(L"use-key-a") != 0;
		bTolerateFailures = true;
		bUseKeyFile = true;
	}
	wstring keyFileName; cl.getopt(L"keyfile", keyFileName);
	wstring dumpFileName; cl.getopt(L"dumpfile", dumpFileName);
	if (keyFileName.empty()) {
			ERR("keyfile not specified");
			//return 87;
			bUseKeyFile = false;
	}
	if ((command == L"w" || command == L"W") && dumpFileName.empty()) {
			ERR("not specified dumpfile");
			return 87;
	}

	wstring sectors;
	cl.getopt(L"sectors", sectors);

	tag_uid = NULL;

	if (atAction == ACTION_USAGE) {
		return 87;
	}

#if 1
	// We don't know yet the card size so let's read only the UID from the keyfile for the moment
	if (bUseKeyFile) {
		HANDLE pfKeys = CreateFileW(keyFileName.c_str(), GENERIC_READ, 0, 0, OPEN_EXISTING, 0, 0);
		if (pfKeys == INVALID_HANDLE_VALUE) {
			cerr << "Could not open keys file: " << ws2s(keyFileName) << endl;
			DWORD dwErr = GetLastError(); if (dwErr == 0) dwErr = -1; return dwErr;
		}
		DWORD readed = 0;
		if (!ReadFile(pfKeys, &mtKeys, 4, &readed, 0)) {
			printf("Could not read UID from key file: %%s\n");
			CloseHandle(pfKeys);
			return(EXIT_FAILURE);
		}
		CloseHandle(pfKeys);
	}
#endif
	nfc_init(&context);
	if (context == NULL) {
		ERR("Unable to init libnfc (malloc)");
		return(EXIT_FAILURE);
	}

// Try to open the NFC reader
	pnd = nfc_open(context, NULL);
	if (pnd == NULL) {
		ERR("Error opening NFC reader");
		nfc_exit(context);
		return(EXIT_FAILURE);
	}

	if (nfc_initiator_init(pnd) < 0) {
		nfc_perror(pnd, "nfc_initiator_init");
		nfc_close(pnd);
		nfc_exit(context);
		return(EXIT_FAILURE);
	};

	// Drop the field for a while, so can be reset
	if (nfc_device_set_property_bool(pnd, NP_ACTIVATE_FIELD, true) < 0) {
		nfc_perror(pnd, "nfc_device_set_property_bool activate field");
		nfc_close(pnd);
		nfc_exit(context);
		return(EXIT_FAILURE);
	}

// Let the reader only try once to find a tag
	if (nfc_device_set_property_bool(pnd, NP_INFINITE_SELECT, false) < 0) {
		nfc_perror(pnd, "nfc_device_set_property_bool");
		nfc_close(pnd);
		nfc_exit(context);
		return(EXIT_FAILURE);
	}
// Disable ISO14443-4 switching in order to read devices that emulate Mifare Classic with ISO14443-4 compliance.
	if (nfc_device_set_property_bool(pnd, NP_AUTO_ISO14443_4, false) < 0) {
		nfc_perror(pnd, "nfc_device_set_property_bool");
		nfc_close(pnd);
		nfc_exit(context);
		return(EXIT_FAILURE);
	}

	// Configure the CRC and Parity settings
	if (nfc_device_set_property_bool(pnd, NP_HANDLE_CRC, true) < 0) {
		nfc_perror(pnd, "nfc_device_set_property_bool crc");
		nfc_close(pnd);
		nfc_exit(context);
		return(EXIT_FAILURE);
	}
	if (nfc_device_set_property_bool(pnd, NP_HANDLE_PARITY, true) < 0) {
		nfc_perror(pnd, "nfc_device_set_property_bool parity");
		nfc_close(pnd);
		nfc_exit(context);
		return(EXIT_FAILURE);
	}

	printf("NFC reader: %s opened\n", nfc_device_get_name(pnd));

// Try to find a MIFARE Classic tag
	int tags;
	tags = nfc_initiator_select_passive_target(pnd, nmMifare, tag_uid, tag_uid == NULL ? 0 : 4, &nt);
	if (tags <= 0) {
		printf("Error: no tag was found\n");
		nfc_close(pnd);
		nfc_exit(context);
		return(EXIT_FAILURE);
	}
// Test if we are dealing with a MIFARE compatible tag
	if (((nt.nti.nai.btSak & 0x08) == 0) && (nt.nti.nai.btSak != 0x01)) {
//  if ((nt.nti.nai.btSak & 0x08) == 0) {
		printf("Warning: tag is probably not a MFC!\n");
	}

// Get the info from the current tag
	pbtUID = nt.nti.nai.abtUid;
	
	if (bUseKeyFile) {
		uint8_t fileUid[4];
		memcpy(fileUid, mtKeys.amb[0].mbm.abtUID, 4);
// Compare if key dump UID is the same as the current tag UID, at least for the first 4 bytes
		if (memcmp(pbtUID, fileUid, 4) != 0) {
			printf("Expected MIFARE Classic card with UID starting as: %02x%02x%02x%02x\n",
						 fileUid[0], fileUid[1], fileUid[2], fileUid[3]);
			printf("Got card with UID starting as:                     %02x%02x%02x%02x\n",
						 pbtUID[0], pbtUID[1], pbtUID[2], pbtUID[3]);
		}
	}
	printf("Found MIFARE Classic card:\n");
	//print_nfc_target(&nt, false);

// Guessing size
	if ((nt.nti.nai.abtAtqa[1] & 0x02) == 0x02 || nt.nti.nai.btSak == 0x18)
// 4K
		uiBlocks = 0xff;
	else if (nt.nti.nai.btSak == 0x09)
// 320b
		uiBlocks = 0x13;
	else
// 1K/2K, checked through RATS
		uiBlocks = 0x3f;
// Testing RATS
	int res;
	if ((res = get_rats()) > 0) {
		printf("RATS support: yes\n");
		if ((res >= 10) && (abtRx[5] == 0xc1) && (abtRx[6] == 0x05)
				&& (abtRx[7] == 0x2f) && (abtRx[8] == 0x2f)
				&& ((nt.nti.nai.abtAtqa[1] & 0x02) == 0x00)) {
			// MIFARE Plus 2K
			uiBlocks = 0x7f;
		}
	} else
		printf("RATS support: no\n");
	printf("Guessing size: seems to be a %lu-byte card\n", (unsigned long)(((size_t)uiBlocks + 1) * sizeof(mifare_classic_block)));

	if (bUseKeyFile) {
		HANDLE pfKeys = CreateFileW(keyFileName.c_str(), GENERIC_READ | GENERIC_WRITE, 0, 0, OPEN_EXISTING, 0, 0);
		if (pfKeys == INVALID_HANDLE_VALUE) {
			cerr << "Could not open keys file: " << ws2s(keyFileName) << endl;
			DWORD dwErr = GetLastError(); if (dwErr == 0) dwErr = -1; return dwErr;
		}
		DWORD readed{};
		if (!(ReadFile(pfKeys, &mtKeys, DWORD(((size_t)uiBlocks + 1) * sizeof(mifare_classic_block)), &readed, 0) && readed == DWORD(((size_t)uiBlocks + 1) * sizeof(mifare_classic_block)))) {
			printf("Could not read keys file: %%s\n");
			CloseHandle(pfKeys);
			return (EXIT_FAILURE);
		}
		CloseHandle(pfKeys);
	}

	if (atAction == ACTION_READ) {
		memset(&mtDump, 0x00, sizeof(mtDump));
	}
	else {
		HANDLE pfDump = CreateFileW(dumpFileName.c_str(), GENERIC_READ, FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
		if (pfDump == INVALID_HANDLE_VALUE) {
			cerr << "Could not open dump file: " << ws2s(dumpFileName) << endl;
			DWORD dwErr = GetLastError(); if (dwErr == 0) dwErr = -1; return dwErr;
		}
		DWORD readed{};
		if (!ReadFile(pfDump, &mtDump, ((size_t)uiBlocks + 1) * sizeof(mifare_classic_block), &readed, 0) || readed != ((size_t)uiBlocks + 1) * sizeof(mifare_classic_block)) {
			cerr << "Could not read dump file: " << ws2s(dumpFileName) << endl;
			CloseHandle(pfDump);
			DWORD dwErr = GetLastError(); if (dwErr == 0) dwErr = -1; return dwErr;
		}
		CloseHandle(pfDump);

	}
	printf("Successfully opened required files\n");

	if (atAction == ACTION_READ) {
		if (read_card(unlock)) {
			printf("Writing data to file:  ...");
			fflush(stdout); DWORD written{};
			//HANDLE pfDump = CreateFileW(dumpFileName.c_str(), GENERIC_WRITE, 0, 0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);
			//if (pfDump == INVALID_HANDLE_VALUE) {
			//	printf("Could not open dump file: \n");
			//	nfc_close(pnd);
			//	nfc_exit(context);
			//	return(EXIT_FAILURE);
			//}
			//if (!WriteFile(pfDump, &mtDump, ((size_t)uiBlocks + 1) * sizeof(mifare_classic_block), &written, 0) || written != (((size_t)uiBlocks + 1) * sizeof(mifare_classic_block))) {
			//	printf("\nCould not write to file:\n");
			//	CloseHandle(pfDump);
			//	nfc_close(pnd);
			//	nfc_exit(context);
			//	return(EXIT_FAILURE);
			//}
			Echo(&mtDump, DWORD(((size_t)uiBlocks + 1) * sizeof(mifare_classic_block)));
			printf("Done.\n");
			//CloseHandle(pfDump);
		} else {
			nfc_close(pnd);
			nfc_exit(context);
			return(EXIT_FAILURE);
		}
	} else if (atAction == ACTION_WRITE) {
		if (!write_card(unlock)) {
			nfc_close(pnd);
			nfc_exit(context);
			return(EXIT_FAILURE);
		}
	}

	nfc_close(pnd);
	nfc_exit(context);
	return(EXIT_SUCCESS);
}
