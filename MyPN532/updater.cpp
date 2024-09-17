#include "../../resource/tool.h"



#include <iostream>
using namespace std;


#include <wininet.h>  
#include <iostream>
#include "resource.h"
#include "wizard.user.h"
#include <json/json.h>

#pragma comment(lib, "wininet.lib")  


static HANDLE ggfile;
static HANDLE hPipe;
static wstring gsFileName;
constexpr size_t buffer_size = 256 * 1024 * 1024; // 256MiB
static void CALLBACK InternetCallback(HINTERNET hInternet, DWORD_PTR dwContext, DWORD dwInternetStatus, LPVOID lpvStatusInformation, DWORD dwStatusInformationLength);
static DWORD download_main(wstring url, wstring filename, wstring ua, bool ) {

	HINTERNET hInternet = InternetOpenW(ua.c_str(), INTERNET_OPEN_TYPE_DIRECT, NULL, NULL, 0);
	if (hInternet == NULL) {
		return GetLastError();
	}

	HINTERNET hRequest = InternetOpenUrlW(hInternet,
		url.c_str(),
		NULL, 0, INTERNET_FLAG_RELOAD, 0);
	if (hRequest == NULL) {
		DWORD dwErr = GetLastError();
		InternetCloseHandle(hInternet);
		return dwErr;
	}

	// 查询文件大小  
	DWORD dwFileSize = 0;
	DWORD dwSize = sizeof(dwFileSize);
	if (!HttpQueryInfo(hRequest, HTTP_QUERY_CONTENT_LENGTH | HTTP_QUERY_FLAG_NUMBER, &dwFileSize, &dwSize, NULL)) {
		std::cerr << "[WARN]  Cannot query file size. Maybe the server doesn't provide Content-Length header.\n";
	}

	// 打开文件用于写入
	gsFileName = filename;
	if (file_exists(filename)) DeleteFileW(filename.c_str());
	ggfile = CreateFileW(filename.c_str(), GENERIC_ALL, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
	if (!ggfile || ggfile == INVALID_HANDLE_VALUE) {
		DWORD dwErr = GetLastError();
		InternetCloseHandle(hRequest);
		InternetCloseHandle(hInternet);
		return dwErr;
	}

	// 设置回调函数以接收下载进度通知  
	InternetSetStatusCallbackW(hRequest, InternetCallback);

	 // 开始下载文件  
	char* buffer = new char[buffer_size];
	DWORD bytesRead = 0, bytesWrite = 0;
	wstring sz;
	wchar_t* ccsz = new wchar_t[8192];
	__int64 totalBytesRead = 0; // 使用64位整数来存储总读取字节数，以支持大文件
	int lastPerc = 0;
	while (InternetReadFile(hRequest, buffer, sizeof(buffer), &bytesRead) && bytesRead > 0) {
		WriteFile(ggfile, buffer, bytesRead, &bytesWrite, NULL);

		totalBytesRead += bytesRead;
		// 在这里更新下载进度  
		int percentage = static_cast<int>((totalBytesRead * 100.0) / dwFileSize);
		//std::cout << "Download progress: " << percentage << "%" << std::endl;
		if (percentage != lastPerc) {
			string str = to_string(percentage);
			DWORD toW = (DWORD)str.size(), Wd = 0;
			(void)WriteFile(hPipe, str.data(), toW, &Wd, 0);
			lastPerc = percentage;
		}
	}

	// 关闭文件和连接  
	CloseHandle(ggfile);
	InternetCloseHandle(hRequest);
	InternetCloseHandle(hInternet);
	delete[] buffer;
	delete[] ccsz;

	return 0;
}

// 回调函数，用于接收下载进度通知  
static void CALLBACK InternetCallback(HINTERNET hInternet, DWORD_PTR dwContext, DWORD dwInternetStatus, LPVOID lpvStatusInformation, DWORD dwStatusInformationLength) {
	return;
}



int UpdaterEntry(CmdLineW& cl) {
	wstring download_url; cl.getopt(L"download", download_url);
	if (download_url.empty()) return 87;

	wstring pipe; cl.getopt(L"pipe", pipe);
	hPipe = CreateFileW(pipe.c_str(), GENERIC_ALL, 0, 0, OPEN_EXISTING, 0, 0);

	SetCurrentDirectoryW(GetProgramPathW().c_str());
	begin_download:
	size_t download_retry_count = 0;
	int err = download_main(download_url, L"update.pkg", L"MyPN532 Updater Version/1.2.0.0", true);
	if (!err) {
		// 校验
		FreeResFile(IDR_BIN_7z_x64, L"BIN", L"x.exe");
		auto pi = Process.Start_HiddenWindow(L"x t update.pkg");
		WaitForSingleObject(pi.hProcess, INFINITE);
		DWORD exitcode = 0;
		GetExitCodeProcess(pi.hProcess, &exitcode);
		Process.CloseProcessHandle(pi);

		if (exitcode) {
			if (download_retry_count++ < 5) {
				string str = "0";
				DWORD toW = (DWORD)str.size(), Wd = 0;
				(void)WriteFile(hPipe, str.data(), toW, &Wd, 0);
				goto begin_download;
			}
			err = 1;
			string str = "FAIL";
			DWORD toW = (DWORD)str.size(), Wd = 0;
			(void)WriteFile(hPipe, str.data(), toW, &Wd, 0);
			 str = "FAIL=Update package is corrupt";
			 toW = (DWORD)str.size(), Wd = 0;
			(void)WriteFile(hPipe, str.data(), toW, &Wd, 0);
		}
	}
	if (err) {
		string str = "FAIL";
		DWORD toW = (DWORD)str.size(), Wd = 0;
		(void)WriteFile(hPipe, str.data(), toW, &Wd, 0);
		 str = "FAIL=" + to_string(err);
		 toW = (DWORD)str.size(), Wd = 0;
		(void)WriteFile(hPipe, str.data(), toW, &Wd, 0);
	} 
	wstring evt; if (cl.getopt(L"event", evt)) {
		HANDLE h = (HANDLE)(LONGLONG)atoll(ws2c(evt));
		SetEvent(h);
	}
	CloseHandle(hPipe);
	if (err) return err;

	Process.flush();
	HANDLE parent = OpenProcess(GENERIC_READ | SYNCHRONIZE, FALSE, Process.GetParentProcessId(GetCurrentProcessId()));
	if (!parent) {
		MessageBoxW(0, LastErrorStrW().c_str(), 0, MB_ICONERROR);
		return GetLastError();
	}
	WaitForSingleObject(parent, INFINITE);
	CloseHandle(parent);

	Sleep(1500);

	// main logic
	HMPRGOBJ hObj = CreateMprgObject();
	HMPRGWIZ hWiz = CreateMprgWizard(hObj, MPRG_CREATE_PARAMS{
		.szTitle = L"MyPN532 Standard Updater",
		.szText = L"Applying updates...",
		.max = size_t(-1),
		});
	OpenMprgWizard(hWiz);
	MoveFileW(L"../config/userconfig.json", L"../config/U");
	FileDeleteTreeW(L"../webroot");
	SetCurrentDirectoryW(L"../../");
	auto pi = Process.Start_HiddenWindow(L"\"" + GetProgramPathW() +
		L"/x\" x -y \"" + GetProgramPathW() + L"/update.pkg\" ");
	WaitForSingleObject(pi.hProcess, INFINITE);
	DWORD exitcode = 0;
	GetExitCodeProcess(pi.hProcess, &exitcode);
	Process.CloseProcessHandle(pi);

	SetCurrentDirectoryW(GetProgramPathW().c_str());
	CopyFileW(L"../config/U", L"../config/userconfig.json", FALSE);
	DeleteFileW(L"../config/u~g.bak");
	MoveFileW(L"../config/U", L"../config/u~g.bak");

	do {
		Json::Value root;
		Json::Reader reader;
		std::string filePath = "../config/userconfig.json";
		bool fileExists = file_exists(filePath);
		if (fileExists) {
			if (MyGetFileSizeW(s2ws(filePath)) > static_cast<unsigned long long>(64 * 1024) * 1024) {
				// json file > 64MiB
				break;
			}
			std::ifstream file(filePath);
			if (!file.is_open()) {
				break;
			}
			std::stringstream buffer;
			buffer << file.rdbuf();
			file.close();
			bool parsingSuccessful = reader.parse(buffer.str(), root);
			if (!parsingSuccessful) {
				break;
			}
		}
		root.removeMember("updatechecker.pending");

		Json::StreamWriterBuilder builder;
		builder["indentation"] = "  ";
		std::unique_ptr<Json::StreamWriter> writer(builder.newStreamWriter());
		std::ostringstream oss;
		writer->write(root, &oss);
		std::ofstream outFile(filePath);
		if (!outFile.is_open()) {
			break;
		}
		outFile << oss.str();
		outFile.close();
	} while (0);
	
	DeleteFileW(L"x.exe");
	if (exitcode) {
		TaskDialog(NULL, NULL, L"MyPN532 Standard Updater",
			L"An error has occurred during the update progress.",
			(L"The unzip utility has returned an exit code of " + to_wstring(exitcode) +
				L", which usually means an unexpected error. Please retry or "
				"contact the software developer team.").c_str(),
			TDCBF_CLOSE_BUTTON | TDCBF_CANCEL_BUTTON, TD_ERROR_ICON, NULL);
	}
	else {
		int l = 0;
		TaskDialog(NULL, NULL, L"MyPN532 Standard Updater",
			L"The product has successfully updated to the new version.",
			L"Do you want to launch it now?",
			TDCBF_YES_BUTTON | TDCBF_CANCEL_BUTTON, TD_INFORMATION_ICON, &l);
		if (l == IDYES) Process.StartOnly(L"../../MyPN532_x64.exe");
	}
	DeleteFileW(L"update.pkg");
	FreeResFile(IDR_BIN_SELF_DELETE, L"BIN", L"d.bat");
	Process.StartOnly_HiddenWindow(L"cmd /c d.bat \"" + GetProgramDirW() + L"\"");
	return exitcode;

	return 0;
}


