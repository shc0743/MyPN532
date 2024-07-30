#include "server.h"
#include <string>
#include "../../resource/tool.h"
using namespace server;
using namespace drogon;

using namespace std;

string app_token;
size_t appConnectedTimes;


void server::AuthFilter::doFilter(const HttpRequestPtr& req, FilterCallback&& fcb, FilterChainCallback&& fccb)
{
	string sess = [&] () -> string {
		try {
			//return req->getHeader("Authorization");
			return req->getParameter("token");
		}
		catch (...) { return ""; }
	}();
	string cookie = [&]() -> string {
		try {
			return req->getCookie("MyPN532_web_token");
		}
		catch (...) { return ""; }
	}();
	if (req->method() == Options || (sess == app_token || cookie == app_token)) {
		return fccb();
	}
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	resp->addHeader("access-control-allow-origin", "*");
	resp->addHeader("access-control-allow-methods", req->getHeader("access-control-request-method") + ",OPTIONS");
	resp->addHeader("access-control-allow-headers", req->getHeader("access-control-request-headers"));
	resp->setContentTypeCode(CT_APPLICATION_JSON);
	resp->setStatusCode(k401Unauthorized);
	//resp->addHeader("WWW-Authenticate", "Basic");
	//resp->setBody("");
	resp->setBody("{\"success\":false,\"code\":401,\"error\":\"Authenticate failed\"}");
	fcb(resp);
}




#define SECURITY_WIN32 1
#include <Security.h>
#include <secext.h>
#include <lmcons.h>
#pragma comment(lib, "Secur32.lib")
void server::MainServer::meinfo(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);

	Json::Value data;
	
	DWORD userNameSize = UNLEN + 1;
	WCHAR os_userName[UNLEN + 1]{};
	userNameSize = UNLEN + 1;
	(void)GetUserNameExW(NameDisplay, os_userName, &userNameSize);
	data["name.friendly"] = ConvertUTF16ToUTF8(os_userName);
	userNameSize = UNLEN + 1;
	(void)GetUserNameExW(NameServicePrincipal, os_userName, &userNameSize);
	data["name.service"] = ConvertUTF16ToUTF8(os_userName);
	userNameSize = UNLEN + 1;
	(void)GetUserNameExW(NameSamCompatible, os_userName, &userNameSize);
	data["name"] = ConvertUTF16ToUTF8(os_userName);

	data["current_version"] = double(4.8);

	Json::FastWriter fastWriter;
	std::string jsonString = fastWriter.write(data);

	resp->setContentTypeCode(CT_APPLICATION_JSON);
	resp->setBody(jsonString);

	callback(resp);
}



void server::MainServer::ssov2(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	
	string sess = [&]() -> string {
		try {
			return req->getParameter("token");
		}
		catch (...) { return ""; }
		}();
	string cookie = [&]() -> string {
		try {
			return req->getCookie("MyPN532_web_token");
		}
		catch (...) { return ""; }
		}();
	if (sess != app_token && cookie != app_token) {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		resp->setStatusCode(k401Unauthorized);
		resp->setBody("<h1 style=color:red>Access denied");
		callback(resp);
		return;
	}
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	if (cookie != app_token) {
		Cookie cook("MyPN532_web_token", app_token);
		cook.setHttpOnly(true);
		cook.setPath("/");
		resp->addCookie(cook);
	}
	resp->setStatusCode(k307TemporaryRedirect);
	resp->addHeader("location", "/");
	//CORSadd(req, resp);
	callback(resp);
}



void server::MainServer::webconfig(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	if (req->method() == Options) return callback(resp);

	string key = req->getParameter("key");

	if (req->method() == Get || req->method() == Post) {
		if (key.empty()) key = req->getBody();
		std::string filePath = "./config/userconfig.json";
		if (!file_exists(filePath)) {
			resp->setStatusCode(k204NoContent);
			return callback(resp);
		}
		if (MyGetFileSizeW(s2ws(filePath)) > static_cast<unsigned long long>(64 * 1024) * 1024) {
			// json file > 64MiB
			resp->setStatusCode(k507InsufficientStorage);
			resp->setBody("{\"error\":\"JSON file too large\"}");
			return callback(resp);
		}
		std::ifstream file(filePath);
		if (!file.is_open()) {
			resp->setStatusCode(k500InternalServerError);
			return callback(resp);
		}
		std::stringstream buffer;
		buffer << file.rdbuf();
		file.close();
		Json::Value root;
		Json::Reader reader;
		bool parsingSuccessful = reader.parse(buffer.str(), root);
		if (!parsingSuccessful) {
			resp->setStatusCode(k400BadRequest);
			return callback(resp);
		}
		std::string data;
		if (root.isMember(key) && root[key].isString()) {
			resp->setStatusCode(k200OK);
			resp->setContentTypeCode(CT_APPLICATION_JSON);
			data = root[key].asString();
			resp->setBody(data);
		}
		else {
			resp->setStatusCode(k204NoContent);
		}
		return callback(resp);
	}
	if (req->method() == Put || req->method() == Patch || req->method() == Delete) {
		Json::Value root;
		Json::Reader reader;
		std::string filePath = "./config/userconfig.json";
		bool fileExists = file_exists(filePath);
		if (fileExists) {
			if (MyGetFileSizeW(s2ws(filePath)) > static_cast<unsigned long long>(64 * 1024) * 1024) {
				// json file > 64MiB
				resp->setStatusCode(k507InsufficientStorage);
				resp->setBody("{\"error\":\"JSON file too large\"}");
				return callback(resp);
			}
			std::ifstream file(filePath);
			if (!file.is_open()) {
				resp->setStatusCode(k500InternalServerError);
				return callback(resp);
			}
			std::stringstream buffer;
			buffer << file.rdbuf();
			file.close();
			bool parsingSuccessful = reader.parse(buffer.str(), root);
			if (!parsingSuccessful) {
				resp->setStatusCode(k500InternalServerError);
				return callback(resp);
			}
		}
		bool keyExists = root.isMember(key);
		if (req->method() == Delete) {
			root.removeMember(key);
		}
		else {
			root[key] = Json::Value(req->getBody().data());
		}

		Json::StreamWriterBuilder builder;
		builder["indentation"] = "  ";
		std::unique_ptr<Json::StreamWriter> writer(builder.newStreamWriter());
		std::ostringstream oss;
		writer->write(root, &oss);
		std::ofstream outFile(filePath);
		if (!outFile.is_open()) {
			resp->setStatusCode(k500InternalServerError);
			return callback(resp);
		}
		outFile << oss.str();
		outFile.close();

		resp->setStatusCode(
			req->method() == Delete ? k204NoContent :
			((fileExists && keyExists) ? k204NoContent : k201Created)
		);
		return callback(resp);
	}

	return callback(resp);
}




static bool ListFilesInDirectory(const std::wstring& directoryPath, std::wstring& names) {
	WIN32_FIND_DATA findFileData;
	HANDLE hFind = FindFirstFile((directoryPath + L"\\*").c_str(), &findFileData);

	if (hFind == INVALID_HANDLE_VALUE) {
		return false;
	}

	do {
		// ����Ƿ����ļ�������Ŀ¼��  
		if (!(findFileData.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) &&
			!(findFileData.cFileName[0] == L'.' && (findFileData.cFileName[1] == L'\0' ||
			(findFileData.cFileName[1] == L'.' && findFileData.cFileName[2] == L'\0')))) {
			names.append(findFileData.cFileName);
			names.append(L"\n");
		}
	} while (FindNextFile(hFind, &findFileData) != 0);

	if (GetLastError() != ERROR_NO_MORE_FILES) {
	}

	FindClose(hFind);
	if (!names.empty()) names.pop_back();
	return true;
}

namespace server {
void listfile(
	const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, string folderName
) {
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	if (req->method() == Options) return callback(resp);

	string_view body_view = req->getBody();
	string body = req->getParameter("filename");
	if (body_view.empty() && body.empty()) {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		CORSadd(req, resp);
		string data; wstring wdata;
		resp->setStatusCode(ListFilesInDirectory(L"./" +
			ConvertUTF8ToUTF16(folderName), wdata) ? k200OK : k500InternalServerError);
		data = ConvertUTF16ToUTF8(wdata);

		resp->setContentTypeCode(CT_TEXT_PLAIN);
		resp->setBody(data);
		callback(resp);
	}
	else {
		if (body.empty()) body = body_view.data();
		if (body.find("/") != body.npos || body.find("\\") != body.npos) {
			HttpResponsePtr resp = HttpResponse::newHttpResponse();
			CORSadd(req, resp);
			resp->setContentTypeCode(CT_TEXT_PLAIN);
			resp->setStatusCode(k403Forbidden);
			return callback(resp);
		}

		if (req->method() == Delete) {
			wstring filename = ConvertUTF8ToUTF16("./" + folderName + "/" + body);
			bool fileExists = file_exists(filename);
			resp->setStatusCode((fileExists) ? k204NoContent : k404NotFound);
			if (!fileExists) return callback(resp);

			if (!DeleteFileW(filename.c_str())) {
				resp->setStatusCode(k500InternalServerError);
				resp->setBody(ConvertUTF16ToUTF8(LastErrorStrW()));
			}

			return callback(resp);
		}
		if (req->method() == Put || req->method() == Patch) {
			wstring filename = ConvertUTF8ToUTF16("./" + folderName + "/" + body);
			bool fileExists = file_exists(filename);
			resp->setStatusCode((fileExists) ? k204NoContent : k201Created);
			auto real_body = body_view.data();

			HANDLE hFile = CreateFileW(filename.c_str(),
				GENERIC_WRITE, 0, 0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);
			if (hFile == INVALID_HANDLE_VALUE || !hFile) {
				resp->setStatusCode(k500InternalServerError);
				resp->setBody(ConvertUTF16ToUTF8(LastErrorStrW()));
				return callback(resp);
			}
			DWORD dwToWrite = (DWORD)body_view.size(), dwWritten = 0;
			if (!WriteFile(hFile, real_body, dwToWrite, &dwWritten, NULL)) {
				CloseHandle(hFile);
				resp->setStatusCode(k500InternalServerError);
				resp->setBody(ConvertUTF16ToUTF8(LastErrorStrW()));
				return callback(resp);
			}
			CloseHandle(hFile);

			return callback(resp);
		}
		if (req->getMethod() == Head) {
			HttpResponsePtr resp2 = HttpResponse::newHttpResponse();
			resp2->setContentTypeCode(CT_APPLICATION_OCTET_STREAM);
			resp2->addHeader("content-length", to_string(MyGetFileSizeW(
				ConvertUTF8ToUTF16("./" + folderName + "/" + body))));
			CORSadd(req, resp2);
			return callback(resp2);
		}

		HttpResponsePtr resp2 = HttpResponse::newFileResponse("./" + folderName + "/" + body);
		resp2->setContentTypeCode(CT_APPLICATION_OCTET_STREAM);
		CORSadd(req, resp2);
		callback(resp2);
	}
}
}
void server::MainServer::keyfile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	listfile((req), std::move(callback), "keys");
}
void server::MainServer::dumpfile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	listfile((req), std::move(callback), req->getParameter("autodump") == "true" ? "autodump" : "dumps");
}

void server::MainServer::deleteautodump(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	if (req->method() == Options) return callback(resp);

	string_view body_view = req->getBody();
	string body = req->getParameter("filename");
	if (body_view.empty() && body.empty()) {
		resp->setStatusCode(k400BadRequest);
		resp->setContentTypeCode(CT_TEXT_PLAIN);
		return callback(resp);
	}
	if (body.empty()) body = body_view.data();
	if (body.find("/") != body.npos || body.find("\\") != body.npos) {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		CORSadd(req, resp);
		resp->setContentTypeCode(CT_TEXT_PLAIN);
		resp->setStatusCode(k403Forbidden);
		return callback(resp);
	}

	resp->setStatusCode(DeleteFileW((L"autodump/" + ConvertUTF8ToUTF16(body)).c_str()) ? k204NoContent : k500InternalServerError);
	return callback(resp);
}

void server::MainServer::launchcmd(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	STARTUPINFO si{}; PROCESS_INFORMATION pi{};
	si.cb = sizeof si;
	wchar_t cmd[] = L"cmd";
#pragma warning(push)
#pragma warning(disable: 6335)
	if (CreateProcessW(NULL, cmd, 0, 0, 0, 0, 0, (GetProgramPathW() + L"\\pn532_data\\bin\\nfc").c_str(), &si, &pi)) {
		Process.CloseProcessHandle(pi);
	}
#pragma warning(pop)

	HttpResponsePtr resp = HttpResponse::newHttpResponse(k200OK, CT_TEXT_PLAIN);
	return callback(resp);
}



std::atomic<size_t> nfcClientApiPipeId;



//static void __stdcall detectnfcdevice(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
void server::MainServer::detectnfcdevice(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const {
	wstring text;
	DWORD dwCode = -1;
	GetProcessStdOutputWithExitCodeEnhanced(L"bin/nfc/nfc-scan-device -i", &dwCode, text);

	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	resp->setStatusCode((dwCode == 0) ? k200OK : k418ImATeapot);
	resp->setBody(ConvertUTF16ToUTF8(text));
	callback(resp);
}

#if 0
void server::MainServer::detectnfcdevice(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	std::thread thrd(std::function<void(__stdcall)(const HttpRequestPtr&, std::function<void(const HttpResponsePtr&)>&&)>(::detectnfcdevice));
	if (thrd.joinable()) thrd.join();
}
#endif


void server::MainServer::taginfo(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	wstring text;
	DWORD dwCode = -1;
	GetProcessStdOutputWithExitCodeEnhanced(L"bin/nfc/nfc-anticol", &dwCode, text);

	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	resp->setStatusCode((dwCode == 0) ? k200OK : k418ImATeapot);
	resp->setBody(ConvertUTF16ToUTF8(text));
	callback(resp);
}


void server::MainServer::scandevice(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	wstring std, text, pipe; string ansi;
	DWORD dwCode = -1;
	size_t pipeId = ++nfcClientApiPipeId;
	pipe = L"\\\\.\\pipe\\" + s2ws(app_token) +
		L".http.devicescan-" + to_wstring(pipeId) + L".req";

	HANDLE hThread = NULL;
	if (pipeutil::CreateAndReadPipeAsync(pipe, &ansi, hThread)) {
		GetProcessStdOutputWithExitCodeEnhanced(L"bin/self/service --type="
			L"scan-device --pipe=\"" + pipe + L"\"", &dwCode, std);
		text = s2ws(ansi);
	}
	else {
		text = L"failed, errno= " + to_wstring(GetLastError());
	}

	if (hThread) {
		WaitForSingleObject(hThread, 60000);
		CloseHandle(hThread);
	}

	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	resp->setStatusCode((dwCode == 0) ? k200OK : k418ImATeapot);
	resp->setBody(ConvertUTF16ToUTF8(text));
	callback(resp);
}

void server::MainServer::defaultdevice(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	if (req->method() == Options) return callback(resp);
	//resp->setStatusCode((dwCode == 0) ? k200OK : k418ImATeapot);
	//resp->setBody(ConvertUTF16ToUTF8(text));

	if (req->getMethod() == Get) {
		string u8str;
		HANDLE fp = CreateFileW(L"./config/default_device", GENERIC_READ, 0,
			0, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, 0);
		if (fp && fp != INVALID_HANDLE_VALUE) {
			char* buffer = (char*)calloc(4096, 1);
			if (buffer) {
				DWORD in = 0;
				if (ReadFile(fp, buffer, 4096, &in, 0)) {
					u8str = buffer;
				}
				free(buffer);
			}
			CloseHandle(fp);
		}
		resp->setBody(u8str);
	}

	if (req->getMethod() == Delete) {
		bool r = DeleteFileW(L"./config/libnfc.conf") &&
			DeleteFileW(L"./config/default_device");
		resp->setStatusCode(r ? k204NoContent : k500InternalServerError);
	}

	if (req->getMethod() == Put) {
		auto u8str = req->getBody();
		wstring str = ConvertUTF8ToUTF16(string(u8str.data(), u8str.size()));
		vector<wstring> params;
		str_split(str, L"|", params);
		if (params.size() < 2 || str.find(L"\"") != str.npos) {
			resp->setStatusCode(k400BadRequest);
			return callback(resp);
		}
		HANDLE fp = CreateFileW(L"./config/libnfc.conf", GENERIC_WRITE, 0,
			0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);
		if (fp && fp != INVALID_HANDLE_VALUE) {
			wstring newstr = L"device.name = \"" + params[0] + L"\"\r\n"
				L"device.connstring = \"" + params[1] + L"\"\r\n";
			string newansi = ws2s(newstr);
			DWORD out = 0;
			WriteFile(fp, newansi.data(), (DWORD)newansi.size(), &out, 0);
			CloseHandle(fp);
		} else {
			resp->setStatusCode(k500InternalServerError);
			resp->setBody(ConvertUTF16ToUTF8(LastErrorStrW()));
			return callback(resp);
		}
		fp = CreateFileW(L"./config/default_device", GENERIC_WRITE, 0,
			0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);
		if (fp && fp != INVALID_HANDLE_VALUE) {
			DWORD out = 0;
			WriteFile(fp, u8str.data(), (DWORD)u8str.size(), &out, 0);
			CloseHandle(fp);
		} else {
			resp->setStatusCode(k500InternalServerError);
			return callback(resp);
		}
		resp->setStatusCode(k202Accepted);
	}

	callback(resp);
}

void server::MainServer::testdevice(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	if (req->method() == Options) return callback(resp);
	auto body = req->body();
	int dev = atoi(body.data());
	string szdev = "COM" + to_string(dev);
	{
		HANDLE hCom = CreateFileA(szdev.c_str(),
			GENERIC_READ | GENERIC_WRITE, 0,
			NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
		if (hCom == INVALID_HANDLE_VALUE) {
			resp->setStatusCode(k500InternalServerError);
			return callback(resp);
		}

		{
			if (!SetupComm(hCom, 1024, 1024)) {
				resp->setStatusCode(k500InternalServerError);
				return callback(resp);
			}
			DCB dcb{};
			dcb.DCBlength = sizeof(dcb);
			dcb.BaudRate = 115200; //������Ϊ115200
			dcb.ByteSize = 8; //ÿ���ֽ���8λ
			dcb.Parity = NOPARITY; //����żУ��λ
			dcb.StopBits = ONESTOPBIT; //ֹͣλ
			if (!SetCommState(hCom, &dcb)) {
				resp->setStatusCode(k500InternalServerError);
				return callback(resp);
			}
			COMMTIMEOUTS TimeOuts{}; //�趨����ʱ
			TimeOuts.ReadIntervalTimeout = 1000;
			TimeOuts.ReadTotalTimeoutMultiplier = 500;
			TimeOuts.ReadTotalTimeoutConstant = 5000; //�趨д��ʱ
			TimeOuts.WriteTotalTimeoutMultiplier = 500;
			TimeOuts.WriteTotalTimeoutConstant = 2000;
			SetCommTimeouts(hCom, &TimeOuts); //���ó�ʱ
			PurgeComm(hCom, PURGE_TXCLEAR | PURGE_RXCLEAR);
		}

#pragma warning(push)
#pragma warning(disable: 4309)
#pragma warning(disable: 4838)
		char hex_array[8] = { 0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff, };
#pragma warning(pop)
		DWORD nBytesWritten = 0;
		time_t endTime = time(0) + 10;
		while (time(0) < endTime) {
			for (size_t i = 0; i < 100; ++i)
				WriteFile(hCom, hex_array, sizeof(hex_array), &nBytesWritten, NULL);
		}

		CloseHandle(hCom);
	}
	callback(resp);
}


wstring wsSessionFormatCurrentTime(
	wstring date_format = L"",
	wstring middle = L" ",
	wstring time_format = L""
);

void server::MainServer::readultralight(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	string uid, atqa, sak; char cardSize = 1;
	size_t pipeId = ++nfcClientApiPipeId;
	{
		wstring std, text, pipe; string ansi;
		DWORD dwCode = -1;
		pipe = L"\\\\.\\pipe\\" + s2ws(app_token) +
			L".web.cardquery-" + to_wstring(pipeId) + L".basicinfo";

		HANDLE hThread = NULL;
		if (pipeutil::CreateAndReadPipeAsync(pipe, &ansi, hThread)) {
			GetProcessStdOutputWithExitCodeEnhanced(L"bin/self/service --type="
				L"query-card-info --pipe=\"" + pipe + L"\"", &dwCode, std);
			text = s2ws(ansi);
		}
		else {
			HttpResponsePtr resp = HttpResponse::newHttpResponse();
			CORSadd(req, resp);
			resp->setContentTypeCode(CT_TEXT_PLAIN);
			resp->setStatusCode(k500InternalServerError);
			resp->setBody(ConvertUTF16ToUTF8(text));
			return callback(resp);
		}

		if (hThread) {
			WaitForSingleObject(hThread, 60000);
			CloseHandle(hThread);
		}

		try {
			Json::Value root;
			Json::Reader reader;
			bool parsingSuccessful = reader.parse(ws2s(text), root);
			if (!parsingSuccessful) {
				if (dwCode) throw ConvertUTF16ToUTF8(std);
				throw - 1;
			}
			uid = (root["uid"].asString());
			sak = (root["sak"].asString());
			atqa = (root["atqa"].asString());
			if (uid.empty() || sak.empty() || atqa.empty()) throw - 2;
		}
		catch (...) {
			HttpResponsePtr resp = HttpResponse::newHttpResponse();
			CORSadd(req, resp);
			resp->setContentTypeCode(CT_TEXT_PLAIN);
			resp->setStatusCode(k500InternalServerError);
			resp->setBody(ConvertUTF16ToUTF8(L"��Ƭ��Ϣ��ѯʧ��"));
			return callback(resp);
		}
	}

	wstring filename = s2ws(uid) + L"-" + wsSessionFormatCurrentTime(L"yyyyMMdd", L"-", L"HHmmss") +
		L"-" + to_wstring(pipeId) + L".client.ultralight.autodump";

	auto body_view = req->body();
	auto body = body_view.data();

	wstring cmd = L"bin/nfc/nfc-mfultralight r autodump/" + filename;
	if (!body_view.empty() && body_view.size() < 64) {
		cmd += L" --pw \"" + ConvertUTF8ToUTF16(body) + L"\"";
	}

	wstring text;
	DWORD dwCode = -1;
	GetProcessStdOutputWithExitCodeEnhanced(cmd, &dwCode, text);

	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	resp->setStatusCode((dwCode == 0) ? k200OK : k500InternalServerError);
	resp->setBody((dwCode == 0) ? ConvertUTF16ToUTF8(filename) : ConvertUTF16ToUTF8(text));
	return callback(resp);
}

void server::MainServer::writeultralight(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	size_t pipeId = ++nfcClientApiPipeId;
	auto body_view = req->body();
	auto body = body_view.data();

	Json::Value root;
	Json::Reader reader;
	bool parsingSuccessful = reader.parse(body, root);
	if (!parsingSuccessful) {
		resp->setStatusCode(k400BadRequest);
		return callback(resp);
	}
	if (!root.isMember("file") || !root["file"].isString()) {
		resp->setStatusCode(k400BadRequest);
		return callback(resp);
	}
	wstring filename = ConvertUTF8ToUTF16(root["file"].asString());

	wstring cmd = L"bin/self/service w dumps/" + filename;
	if (root.isMember("pw") && root["pw"].isString() && root["pw"].asString().length() < 64) {
		cmd += L" --pw \"" + ConvertUTF8ToUTF16(root["pw"].asString()) + L"\"";
	}
	cmd += L" --type=mful ";
	if (root.isMember("option") && root["option"].isString()) {
		string opt = root["option"].asString();
		if (opt.length() == 4) {
			if (opt[0] == L'1') cmd += L"--otp ";
			if (opt[1] == L'1') cmd += L"--lock ";
			if (opt[2] == L'1') cmd += L"--dynlock ";
			if (opt[3] == L'1') cmd += L"--uid ";
		}
	}

	wstring text;
	DWORD dwCode = -1;
	GetProcessStdOutputWithExitCodeEnhanced(cmd, &dwCode, text);

	resp->setContentTypeCode(CT_TEXT_PLAIN);
	resp->setStatusCode((dwCode == 0) ? k200OK : k500InternalServerError);
	resp->setBody(ConvertUTF16ToUTF8(text));
	return callback(resp);
}





