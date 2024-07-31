#include <nfc/nfc.h>
#include <Windows.h>
#include <string>
#include "../../resource/tool.h"

#define MAX_DEVICE_COUNT 4
#define MAX_TARGET_COUNT 4

static nfc_device* pnd;
DWORD Echo(PVOID buffer, DWORD count);
DWORD Echo(std::wstring str);

int nfc_scan_device(bool deep) {
    const char* acLibnfcVersion;
    size_t  i;
    bool verbose = false;

    nfc_context* context;

    if (deep) {
        (void)_putenv("LIBNFC_INTRUSIVE_SCAN=1");
        SetCurrentDirectoryW(L"./bin/self");
    }

    nfc_init(&context);
    if (context == NULL) {
        exit(EXIT_FAILURE);
    }

    // Display libnfc version
    acLibnfcVersion = nfc_version();
    printf("%%s uses libnfc %s\n", acLibnfcVersion);

    nfc_connstring connstrings[MAX_DEVICE_COUNT];
    size_t szDeviceFound = nfc_list_devices(context, connstrings, MAX_DEVICE_COUNT);

    if (szDeviceFound == 0) {
        printf("No NFC device found.\n");
        nfc_exit(context);
        exit(EXIT_FAILURE);
    }
    int code = 0;

    printf("%d NFC device(s) found:\n", (int)szDeviceFound);
    char* strinfo = NULL;
    for (i = 0; i < szDeviceFound; i++) {
        pnd = nfc_open(context, connstrings[i]);
        if (pnd != NULL) {
#if 0
            printf("- %s:\n    %s\n", nfc_device_get_name(pnd), nfc_device_get_connstring(pnd));
            if (verbose) {
                if (nfc_device_get_information_about(pnd, &strinfo) >= 0) {
                    printf("%s", strinfo);
                    nfc_free(strinfo);
                }
            }
#else
            Echo(s2ws(nfc_device_get_name(pnd)) + L"|" +
                s2ws(nfc_device_get_connstring(pnd)) + L"\n");
#endif
            nfc_close(pnd);
        }
        else {
            printf("nfc_open failed for %s\n", connstrings[i]);
            code = 1;
        }
    }
    nfc_exit(context);
    return code;
    exit(EXIT_SUCCESS);
}

