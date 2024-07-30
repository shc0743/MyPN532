// PN532_libnfc_Host.cpp : 此文件包含 "main" 函数。程序执行将在此处开始并结束。
//

#include <iostream>
#include "../../resource/tool.h"
using namespace std;

#pragma comment(linker, "/subsystem:windows")
#pragma comment(lib, "../libnfc/libnfc/nfc.lib")

#if 0
class _hPipe {
protected:
	HANDLE data;
public:
	operator HANDLE() { return data; }
	_hPipe() { data = NULL; }
	_hPipe(HANDLE input) { data = input; }
	~_hPipe()
	{
		Process.suspend(Process.GetCurrentProcess());
		if (data && data != INVALID_HANDLE_VALUE) {
			//DWORD ctl[4]{};
			//char bin[8]{
			//	(char)0xdd, (char)0x53, (char)0x46, (char)0x16,
			//	(char)0xc8, (char)0x44, (char)0xac, (char)0x99
			//};
			//WriteFile(data, bin, 8, ctl + 0, NULL);
			//(void)ReadFile(data, ctl + 1, 1, ctl + 3, NULL);
			CloseHandle(data);
		}
	}
} hPipe; // 用于在进程退出时自动关闭句柄
#else
HANDLE hPipe;
#endif
DWORD Echo(PVOID buffer, DWORD count);
DWORD Echo(std::wstring str);
DWORD Echo(std::string str);
DWORD Echo(PVOID buffer, DWORD count) {
	HANDLE hFile = hPipe;
	if (!hFile) {
		fwrite(buffer, 1, count, stdout);
		return count;
	}
	DWORD written = 0;
	WriteFile(hFile, buffer, count, &written, NULL);
	return written;
}
DWORD Echo(string str) {
	DWORD write, written = 0;
	write = DWORD(
		(SIZE_T(str.length()) + 1) *
		sizeof(decltype(str)::allocator_type::value_type));
	return Echo(str.data(), write);
}
DWORD Echo(std::wstring str) {
	return Echo(ws2s(str));
}


int nfc_scan_device();
int nfc_query_card_info();
int nfc_mful(CmdLineW&);
int nfc_mfclassic(CmdLineW&);
int nfc_mfclassic_read(CmdLineW&);




int APIENTRY wWinMain(_In_ HINSTANCE hInstance,
	_In_opt_ HINSTANCE hPrevInstance,
	_In_ LPWSTR    lpCmdLine,
	_In_ int       nCmdShow)
{
	UNREFERENCED_PARAMETER(hInstance);
	UNREFERENCED_PARAMETER(hPrevInstance);
	UNREFERENCED_PARAMETER(lpCmdLine);
	UNREFERENCED_PARAMETER(nCmdShow);

	CmdLineW cl(GetCommandLineW());
	wstring type, pipe;
	cl.getopt(L"type", type);
	cl.getopt(L"pipe", pipe);
	if (!pipe.empty()) {
		hPipe = CreateFileW(pipe.c_str(), GENERIC_READ | GENERIC_WRITE, 0,
			0, OPEN_EXISTING, 0, 0);
		if (hPipe == INVALID_HANDLE_VALUE) hPipe = 0;
		if (hPipe) {
			DWORD dwMode = PIPE_READMODE_MESSAGE | PIPE_WAIT;
			SetNamedPipeHandleState(hPipe, &dwMode, NULL, NULL);
		}
	}
	

	if (type == L"scan-device") {
		return nfc_scan_device();
	}
	if (type == L"query-card-info") {
		return nfc_query_card_info();
	}
	if (type == L"mfclassic") {
		return nfc_mfclassic(cl);
	}
	if (type == L"mfclassic-read") {
		return nfc_mfclassic_read(cl);
	}
	if (type == L"mful") {
		return nfc_mful(cl);
	}

	if (type == L"test-app") {
		return 0x12345678;
	}


	return ERROR_INVALID_PARAMETER;
}


