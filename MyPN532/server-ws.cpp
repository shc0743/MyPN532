#include "server.h"
#include <string>
#include "../../resource/tool.h"
#include <openssl/evp.h>
using namespace server;
using namespace drogon;

using namespace std;

#define ccs8(x) (ConvertUTF16ToUTF8(L ## x))



using WS_SESSIONID = unsigned long long;
std::atomic<WS_SESSIONID> appSession_LastId;
class wsNativeNfcApiData {
public:
	wsNativeNfcApiData() :
		hPipe_outbound_keyfile(0),
		use_mfoc(false),
		unlock(false)
	{};
	vector<wstring> keyfiles;
	HANDLE hPipe_outbound_keyfile;
	bool use_mfoc;
	bool unlock;
	wstring internalDataProvider;
};


extern size_t appConnectedTimes;



static void wsProcessMessage(const WebSocketConnectionPtr& wsConnPtr, std::string message, const WebSocketMessageType& wstype);
void WebSocketService::handleNewMessage(const WebSocketConnectionPtr& wsConnPtr, std::string&& message, const WebSocketMessageType& wstype)
{
	//write your application logic here
	if (wstype == WebSocketMessageType::Text)
		wsProcessMessage(wsConnPtr, message, wstype);

}
void WebSocketService::handleNewConnection(const HttpRequestPtr& req, const WebSocketConnectionPtr& wsConnPtr)
{
	//write your application logic here

	++::appConnectedTimes;

	LOG_DEBUG << "[ws] connected " << req->peerAddr().toIpPort() << ", session token=";
}
void WebSocketService::handleConnectionClosed(const WebSocketConnectionPtr& wsConnPtr)
{
	//write your application logic here

	--appConnectedTimes;
	CloseHandleIfOk(CreateThread(0, 0, [](PVOID)->DWORD {
		Sleep(5000);
		if (!::appConnectedTimes) {
			drogon::app().quit();
		}
		return 0; // 延迟5s退出，以防万一（e.g.刷新页面）
	}, 0, 0, 0));

	LOG_DEBUG << "[ws] disconnected, session token= ";
}



map<WS_SESSIONID, WebSocketConnectionPtr> wsSessionIdPtr;
map<WS_SESSIONID, wsNativeNfcApiData> wsSessionIdData;
DWORD WINAPI wsNativeReadNfcMfClassic(PVOID pConnInfo);
bool wsSessionSessionEnd(WS_SESSIONID sessionId);



static void wsProcessMessage(const WebSocketConnectionPtr& wsConnPtr, std::string message, const WebSocketMessageType& wstype) {
	if (message[0] != '{') {
		if (message == "Here's some text that the server is urgently awaiting!") {
			wsConnPtr->send("Thank you! I need them! By the way, do you know Genshin Impact? "
				"It is a popular video game which is developed by miHoYo. It's really "
				"interesting and fun to play! If you want to play it, just go to "
				"https://genshin.hoyoverse.com/en/ to download it! Have a good day!");
			return;
		}
	}
	try {
		Json::Value json;
		Json::CharReaderBuilder rbuilder;
		Json::CharReader* reader = rbuilder.newCharReader();
		string err;
		if (!reader->parse(message.c_str(), message.c_str() + message.length(), &json, &err)) {
			throw err;
		}

		string type = json["type"].asString();

		if (type == "echo") {
			Json::Value val = json["data"];
			Json::FastWriter fastWriter;
			wsConnPtr->send(fastWriter.write(val));
			return;
		}

		if (type == "create-session") {
			WS_SESSIONID newId = ++appSession_LastId;
			wsSessionIdPtr.insert(std::make_pair(newId, wsConnPtr));
			Json::Value val;
			val["type"] = "session-created";
			val["senderId"] = json["senderId"];
			val["sessionId"] = newId;
			Json::FastWriter fastWriter;
			wsConnPtr->send(fastWriter.write(val));
			return;
		}

		if (type == "end-session") {
			wsSessionIdPtr.erase(json["sessionId"].asUInt64());
			Json::Value val;
			val["type"] = "session-ended";
			val["senderId"] = json["senderId"];
			val["sessionId"] = json["sessionId"].asUInt64();
			Json::FastWriter fastWriter;
			wsConnPtr->send(fastWriter.write(val));
			return;
		}

		if (type == "read-nfc-tag-mfclassic") {
			WS_SESSIONID sessionId = json["sessionId"].asUInt64();
			Json::Value val;
			val["success"] = false;
			val["sessionId"] = sessionId;
			wstring sz_keyfiles = ConvertUTF8ToUTF16(json["keyfiles"].asString());
			bool use_mfoc = json["use_mfoc"].asBool();
			bool unlock = json.isMember("unlock") ?
				(json["unlock"].isBool() ? json["unlock"].asBool() : false) : false;
			
			if (sz_keyfiles.empty() && !use_mfoc && !unlock) {
				val["code"] = 400;
				val["error"] = ccs8("需要指定keyfile");
				wsSessionSessionEnd(sessionId);
			}
			else if (wsSessionIdData.contains(sessionId)) {
				val["code"] = 400;
				val["error"] = ccs8("正在进行其他操作");
			}
			else if (!wsSessionIdPtr.contains(sessionId)) {
				val["code"] = 404;
				val["error"] = ccs8("No such session id");
			}
			else {
				wsNativeNfcApiData ad;
				if (!sz_keyfiles.empty()) str_split(sz_keyfiles, L"|", ad.keyfiles);
				ad.use_mfoc = use_mfoc;
				ad.unlock = unlock;
				wsSessionIdData.insert(std::make_pair(sessionId, ad));

				val["code"] = 0;
				val["success"] = CloseHandleIfOk(CreateThread(0, 0,
					wsNativeReadNfcMfClassic, (PVOID)sessionId, 0, 0));
			}

			Json::FastWriter fastWriter;
			wsConnPtr->send(fastWriter.write(val));
			return;
		}


	}
	catch (std::string errText) {
		Json::Value json;
		json["success"] = false;
		json["type"] = "error";
		json["error"] = errText;
		Json::FastWriter fastWriter;
		wsConnPtr->send(fastWriter.write(json));
	}
	catch (std::exception exc) {
		Json::Value json;
		json["success"] = false;
		json["type"] = "error";
		json["level"] = "exception";
		json["exception"] = exc.what();
		Json::FastWriter fastWriter;
		wsConnPtr->send(fastWriter.write(json));
	}
	catch (...) {
		// 无法处理
	}
}





#pragma region ws NFC apis

extern string app_token;

#define SERVER_EVENT_BEGIN(type) {  \
Json::Value pipeEvent; \
pipeEvent["type"] = type; {
#define SERVER_EVENT_SET_PARAMETER(name, value) \
pipeEvent[ #name ] = (value);
#define SERVER_EVENT_END() }\
wsSessionSessionSendEvent(sessionId, pipeEvent); }
#define SERVER_SESSION_END() ;{wsSessionSessionEnd(sessionId);};
#define SERVER_SESSION_END_WITH_CLEAN() ;{SERVER_SESSION_END();cleanPipe1();return 0;};



bool wsSessionSessionEnd(WS_SESSIONID sessionId) {
	try {
		WebSocketConnectionPtr ptr = wsSessionIdPtr.at(sessionId);
		wsSessionIdPtr.erase(sessionId);
		wsSessionIdData.erase(sessionId);
		Json::Value val;
		val["type"] = "session-ended";
		val["sessionId"] = sessionId;
		Json::FastWriter fastWriter;
		ptr->send(fastWriter.write(val));
		return true;
	}
	catch (...) { return false; }
}
bool wsSessionSessionSendEvent(WS_SESSIONID sessionId, const Json::Value& event) {
	try {
		auto& ptr = wsSessionIdPtr.at(sessionId);
		Json::Value val;
		val["type"] = "session-event";
		val["sessionId"] = sessionId;
		val["data"] = event;
		Json::FastWriter fastWriter;
		ptr->send(fastWriter.write(val));
		return true;
	}
	catch (...) { return false; }
}
static std::atomic<size_t> wsSessionSessionSendEventReqId;
static std::deque<std::pair<size_t, std::pair<WS_SESSIONID, Json::Value>>>
	wsSessionSessionSendEventQueue;
static std::mutex wsSessionSessionSendEventMutex;
DWORD WINAPI wsSessionSessionSendEventThread(PVOID nReqId) {
	try {
		do {
			auto& first = wsSessionSessionSendEventQueue.at(0);
			if (first.first == (size_t)nReqId) break;
			Sleep(10);
		} while (1);

		auto& req = wsSessionSessionSendEventQueue.at(0);
		DWORD ret = (0 == wsSessionSessionSendEvent(req.second.first, req.second.second));
		wsSessionSessionSendEventQueue.pop_front();
		return ret;
	}
	catch (...) {}
	return -1;
}
bool wsSessionSessionSendEventAsync(WS_SESSIONID sessionId, const Json::Value& event) {
	size_t req = ++wsSessionSessionSendEventReqId;
	wsSessionSessionSendEventQueue.push_back(make_pair(
		req, make_pair(sessionId, event)));
	HANDLE hThread = CreateThread(0, 0, wsSessionSessionSendEventThread, (PVOID)req, 0, 0);
	if (hThread) {
		CloseHandle(hThread);
		return true;
	}
	return false;
}


wstring wsSessionFormatCurrentTime(
	wstring date_format = L"",
	wstring middle = L" ",
	wstring time_format = L""
);
wstring wsSessionFormatCurrentTime(
	wstring date_format,
	wstring middle,
	wstring time_format
) {
	SYSTEMTIME st{};
	WCHAR buffer[512]{};
	WCHAR buffer2[512]{};
	wstring result;

	GetLocalTime(&st);
	PCWSTR pDateFormat = NULL, pTimeFormat = NULL;
	if (!date_format.empty()) pDateFormat = date_format.c_str();
	if (!time_format.empty()) pTimeFormat = time_format.c_str();
	GetTimeFormatEx(LOCALE_NAME_USER_DEFAULT, 0, &st, pTimeFormat, buffer, 512);
	GetDateFormatEx(LOCALE_NAME_USER_DEFAULT, 0, &st, pDateFormat, buffer2, 512, 0);
	result = buffer2;
	result += middle;
	result += buffer;

	return result;
}



#if 1
static DWORD WINAPI wsNativeReadNfcMfClassic_srv(LPVOID lpParam) {
	WS_SESSIONID sessionId = (WS_SESSIONID)lpParam;
	wsNativeNfcApiData* data = NULL;
	HANDLE hPipe;
	try {
		data = &wsSessionIdData.at(sessionId);
		if (!data) throw - 1;
		hPipe = data->hPipe_outbound_keyfile;
		if (!hPipe) throw - 1;
	}
	catch (...) {
		try {
			wsSessionSessionEnd(sessionId);
		}
		catch (...) {}
		return -10;
	}

	if (!ConnectNamedPipe(hPipe, NULL)) {
		if (GetLastError() != ERROR_PIPE_CONNECTED) {
			CloseHandle(hPipe);
			wsSessionSessionEnd(sessionId);
			return GetLastError();
		}
	}

	if (!wsSessionIdData.contains(sessionId)) {
		// session ended
		CloseHandle(hPipe);
		return ERROR_SHUTDOWN_IN_PROGRESS;
	}

	for (auto& i : data->keyfiles) {
		std::fstream file(L"./keys/" + i, ios::in);
		std::string line;
		DWORD bytesWritten;

		while (std::getline(file, line)) {
			std::string message = line + "\n";
			if (message.starts_with("#") || message.starts_with("\n")) continue;
			if (!WriteFile(hPipe, message.c_str(), (DWORD)message.size(),
				&bytesWritten, NULL) ||
				bytesWritten != message.size()) {
				break;
			}
		}
		file.close();
	}
	CloseHandle(hPipe);
	return 0;
}
#endif
#if 0
static DWORD WINAPI wsNativeReadNfcMfClassic_srv2(LPVOID lpParam) {
	WS_SESSIONID sessionId = (WS_SESSIONID)lpParam;
	wsNativeNfcApiData* data = NULL;
	HANDLE hPipe;
	try {
		data = &wsSessionIdData.at(sessionId);
		if (!data) throw - 1;
		hPipe = data->hPipe_outbound_keyfile;
		if (!hPipe) throw - 1;
	}
	catch (...) {
		try {
			wsSessionSessionEnd(sessionId);
		}
		catch (...) {}
		return -10;
	}

	if (!ConnectNamedPipe(hPipe, NULL)) {
		if (GetLastError() != ERROR_PIPE_CONNECTED) {
			CloseHandle(hPipe);
			wsSessionSessionEnd(sessionId);
			return GetLastError();
		}
	}

	if (!wsSessionIdData.contains(sessionId)) {
		// session ended
		CloseHandle(hPipe);
		return ERROR_SHUTDOWN_IN_PROGRESS;
	}
	char* buffer = (char*)VirtualAlloc(0, 16384, MEM_COMMIT, PAGE_READWRITE);
	if (!buffer) {
		CloseHandle(hPipe);
		return ERROR_OUTOFMEMORY;
	}

	DWORD bytesRead = 0;
	data->internalDataProvider.clear();
	while (1) {
		memset(buffer, 0x00, 16384);
		if (!ReadFile(hPipe, buffer, 16384, &bytesRead, NULL)) break;

		wstring str = s2ws(buffer);
		data->internalDataProvider.append(str);
		Json::Value event;
		event["type"] = "run-log";
		event["data"] = ConvertUTF16ToUTF8(str);
		wsSessionSessionSendEventAsync(sessionId, event);
	}

	CloseHandle(hPipe);
	VirtualFree(buffer, 0, MEM_RELEASE);
	return 0;
}
#endif
static wstring wsNativeReadNfcMfClassic_extractKeyFromMfocString(
	wstring text, wstring prefix, size_t length
) {
	// 假设这是你的原始数据  
	//std::wstring text = L"扇区 02 - 找到:   Key A: ffffffffffff    ok";

	// 要查找的前缀  
	//std::wstring prefix = L"Key " + keyType + L": ";

	// 查找前缀在字符串中的位置  
	size_t pos = text.find(prefix);

	// 检查是否找到了前缀  
	if (pos != std::wstring::npos) {
		// 跳过前缀的长度  
		pos += prefix.length();

		// 提取紧随前缀的12个字符  
		// 注意：这里需要检查剩余字符串长度是否足够  
		if (pos + length <= text.length()) {
			std::wstring key = text.substr(pos, length);
			// 输出结果  
			//std::wcout << L"提取的Key是: " << key << std::endl;
			return key;
		}
		else {
			// 如果不足12个字符，则输出警告  
			//std::wcout << L"找到的Key长度不足12个字符" << std::endl;
		}
	}
	else {
		// 如果没有找到前缀，则输出提示  
		//std::wcout << L"未找到指定的前缀" << std::endl;
	}

	return L"";
}
std::string ossl_sha256(const std::string str);
DWORD __stdcall wsNativeReadNfcMfClassic(PVOID pConnInfo) {
	WS_SESSIONID sessionId = (WS_SESSIONID)pConnInfo;
	WebSocketConnectionPtr ptr;
	wsNativeNfcApiData* data = nullptr;
	try {
		ptr = wsSessionIdPtr.at(sessionId);
		data = &wsSessionIdData.at(sessionId);
		if (!ptr || !data) throw -1;
	}
	catch (...) {
		return 87l;
	}

	auto& keyfiles = data->keyfiles;
	if (keyfiles.empty() && !data->use_mfoc && !data->unlock) {
		ptr->send(ccs8("{\"type\":\"error-ui\",\"error\":\"需要keyfile\",\"modal\":true}"));
		wsSessionSessionEnd(sessionId);
		return -1;
	}

	bool unlock = data->unlock;

	// connect
#if 1
	wstring pipeKeyFile = L"\\\\.\\pipe\\" + s2ws(app_token) +
		L".outbound_" + to_wstring(sessionId) + L".keys";

	{ // create named pipe: key
		HANDLE hPipe = CreateNamedPipeW(
			pipeKeyFile.c_str(),            // 管道名称  
			PIPE_ACCESS_DUPLEX,
			PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
			1, 65536, 65536, 0, NULL);

		if (hPipe == INVALID_HANDLE_VALUE) {
			SERVER_EVENT_BEGIN("action-ended")
				SERVER_EVENT_SET_PARAMETER(success, false)
				SERVER_EVENT_SET_PARAMETER(errorText, L"创建管道1失败")
			SERVER_EVENT_END()
			SERVER_SESSION_END()
			return 1;
		}

		data->hPipe_outbound_keyfile = hPipe;
		// 创建线程以处理管道连接  
		HANDLE hThread = CreateThread(
			NULL,                   // 默认安全属性  
			0,                      // 默认堆栈大小  
			wsNativeReadNfcMfClassic_srv,       // 线程函数  
			(LPVOID)sessionId,          // 传递给线程的参数  
			0,                      // 默认创建标志  
			NULL);                  // 不需要获取线程标识符  
		if (hThread == NULL) {
			CloseHandle(hPipe);
			return 1;
		}
		
		CloseHandle(hThread);
		//CloseHandle(hPipe);
	}
	const auto cleanPipe1 = [&] {
		HANDLE hFile = CreateFileW(pipeKeyFile.c_str(), GENERIC_READ, 0, 0, OPEN_EXISTING, 0, 0);
		if (hFile && hFile != INVALID_HANDLE_VALUE) CloseHandle(hFile);
	};
#else
	// nfc-mfclassic不支持读取管道
	ULONGLONG pipeKeyFilesLastChange = 0;
	wstring pipeKeyFile = [&] {
		wstring mergedKeyfiles;
		for (auto& i : data->keyfiles) {
			mergedKeyfiles.append(i);
			mergedKeyfiles.append(L"|");
			{
				HANDLE hFile = CreateFileW(pipeKeyFile.c_str(), GENERIC_READ,
					FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
				FILETIME ft{};
				ULARGE_INTEGER ui{};
				if (hFile && hFile != INVALID_HANDLE_VALUE) {
					GetFileTime(hFile, 0, 0, &ft);
					CloseHandle(hFile);
					ui.LowPart = ft.dwLowDateTime;
					ui.HighPart = ft.dwHighDateTime;
					if (ui.QuadPart > pipeKeyFilesLastChange) {
						pipeKeyFilesLastChange = ui.QuadPart;
					}
				}
			}
		}
		return ConvertUTF8ToUTF16("./cache/" +
			ossl_sha256(ConvertUTF16ToUTF8(mergedKeyfiles)));
	}();
	wsSessionSessionSendEvent(sessionId, "{\"type\":\"keyfile-preload-finished\"}");
	ULONGLONG pipeKeyFilesCacheLastChange = 0;
	{ 
		HANDLE hFile = CreateFileW(pipeKeyFile.c_str(), GENERIC_READ,
			FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
		FILETIME ft{};
		ULARGE_INTEGER ui{};
		if (hFile && hFile != INVALID_HANDLE_VALUE) {
			GetFileTime(hFile, 0, 0, &ft);
			CloseHandle(hFile);
			ui.LowPart = ft.dwLowDateTime;
			ui.HighPart = ft.dwHighDateTime;
			pipeKeyFilesCacheLastChange = ui.QuadPart;
		}
	}
	wsSessionSessionSendEvent(sessionId, "{\"type\":\"keyfile-check-started\"}");
	if ((!pipeKeyFilesCacheLastChange) ||
		(pipeKeyFilesCacheLastChange < pipeKeyFilesLastChange)) {
		HANDLE hFile = CreateFileW(pipeKeyFile.c_str(), GENERIC_WRITE,
			FILE_SHARE_READ, 0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);
		if (!hFile || hFile == INVALID_HANDLE_VALUE) {
			Json::Value pipeEvent;
			pipeEvent["type"] = "action-ended";
			pipeEvent["success"] = false;
			pipeEvent["code"] = (ULONGLONG)GetLastError();
			pipeEvent["errorText"] = ConvertUTF16ToUTF8(LastErrorStrW());
			wsSessionSessionSendEvent(sessionId, pipeEvent);
			wsSessionSessionEnd(sessionId);
			return 1;
		}

		for (auto& i : data->keyfiles) {
			std::fstream file(L"./keys/" + i, ios::in);
			std::string line;
			DWORD bytesWritten;

			if (file)
			while (std::getline(file, line)) {
				std::string message = line + "\n";
				if (message.starts_with("#") || message.starts_with("\n")) continue;
				if (!WriteFile(hFile, message.c_str(), (DWORD)message.size(),
					&bytesWritten, NULL) ||
					bytesWritten != message.size()) {
					break;
				}
			}
			file.close();
		}
		CloseHandle(hFile);
	}
	const auto cleanPipe1 = [&] {
	};

#endif

	SERVER_EVENT_BEGIN("pipe-created")
		SERVER_EVENT_SET_PARAMETER(pipe_type, "pipeKeyFile")
		SERVER_EVENT_SET_PARAMETER(pipe, ConvertUTF16ToUTF8(pipeKeyFile))
	SERVER_EVENT_END()

	string uid, atqa, sak; char cardSize = 1;
	{
		wstring std, text, pipe; string ansi;
		DWORD dwCode = -1;
		size_t pipeId = sessionId;
		pipe = L"\\\\.\\pipe\\" + s2ws(app_token) +
			L".cardquery-" + to_wstring(pipeId) + L".basicinfo";

		HANDLE hThread = NULL;
		if (pipeutil::CreateAndReadPipeAsync(pipe, &ansi, hThread)) {
			GetProcessStdOutputWithExitCodeEnhanced(L"bin/self/service --type="
				L"query-card-info --pipe=\"" + pipe + L"\"", &dwCode, std);
			text = s2ws(ansi);
		}
		else {
			SERVER_EVENT_BEGIN("action-ended")
				SERVER_EVENT_SET_PARAMETER(success, false)
				SERVER_EVENT_SET_PARAMETER(errorText, ConvertUTF16ToUTF8(LastErrorStrW()))
				SERVER_EVENT_SET_PARAMETER(code, (ULONGLONG)GetLastError())
			SERVER_EVENT_END()
			SERVER_SESSION_END_WITH_CLEAN()
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
			if (sak == "00") throw ccs8("卡片为Ultralight或NTag，请选择正确的卡片类型");
			if (sak != "08" && sak != "18") throw ccs8("卡片不是Mifare Classic卡，SAK=" + s2ws(sak));
			if (sak == "18") cardSize = 4;
		}
		catch (std::string str) {
			SERVER_EVENT_BEGIN("action-ended")
				SERVER_EVENT_SET_PARAMETER(success, false)
				SERVER_EVENT_SET_PARAMETER(code, -1)
				SERVER_EVENT_SET_PARAMETER(errorText, str)
			SERVER_EVENT_END()
			SERVER_SESSION_END_WITH_CLEAN()
		}
		catch (...) {
			SERVER_EVENT_BEGIN("action-ended")
				SERVER_EVENT_SET_PARAMETER(success, false)
				SERVER_EVENT_SET_PARAMETER(code, -1)
				SERVER_EVENT_SET_PARAMETER(errorText, ConvertUTF16ToUTF8(L"错误 " + to_wstring(dwCode)
					+ L": " + ErrorCodeToStringW(dwCode) + L"\n" + text + L"\n\nstd.output=\n" + std));
			SERVER_EVENT_END()
			SERVER_SESSION_END_WITH_CLEAN()
		}

		SERVER_EVENT_BEGIN("tag-info-loaded");
		SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(text));
		SERVER_EVENT_END();

	}

	SERVER_EVENT_BEGIN("tag-read-started");
	SERVER_EVENT_END();

	if (!data->use_mfoc) {
		wstring std, text, pipe; string ansi;
		DWORD dwCode = -1;
		size_t pipeId = sessionId;
		pipe = L"\\\\.\\pipe\\" + s2ws(app_token) +
			L".ws.mfread-" + to_wstring(pipeId) + L".req";

		HANDLE hThread = NULL;
		auto rlcb = [](string& ansi, PVOID pvoid) { // Run Log CallBack
			WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;
			wstring data = s2ws(ansi);

			SERVER_EVENT_BEGIN("run-log");
			SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(data));
			SERVER_EVENT_END();
		};
		auto rlcbw = [](wstring& data, PVOID pvoid) { // Run Log CallBack
			WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;

			SERVER_EVENT_BEGIN("run-log");
			SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(data));
			SERVER_EVENT_END();
		};
		if (pipeutil::CreateAndReadPipeAsync(pipe, &ansi, hThread, rlcb, (PVOID)sessionId)) {
			wstring cmd = L"bin/self/service --type=mfclassic";
			if (unlock) {
				cmd += L" -cR --pipe=" + pipe;
			}
			else {
				cmd += L"-read -O\"" + pipe + L"\" -f\"" + pipeKeyFile + L"\" ";
			}
			GetProcessStdOutputWithExitCodeEnhanced(cmd,
				&dwCode, std, true, rlcbw, (PVOID)sessionId);
			text = s2ws(ansi);
		}
		else {
			text = L"failed, errno= " + to_wstring(GetLastError());
		}

		if (hThread) {
			WaitForSingleObject(hThread, 60000);
			CloseHandle(hThread);
		}

		if (dwCode) {//failed
			SERVER_EVENT_BEGIN("action-ended");
			SERVER_EVENT_SET_PARAMETER(success, false);
			SERVER_EVENT_SET_PARAMETER(code, (uint64_t)dwCode);
			SERVER_EVENT_SET_PARAMETER(errorText, ccs8("读取卡片时出现错误。\n异常来自 service.exe (" + to_wstring(dwCode) + 
				L": " + ErrorCodeToStringW(dwCode) + L")\n" + text + L"\n\nstd.output=\n" + std));
			SERVER_EVENT_END();
			SERVER_SESSION_END_WITH_CLEAN();
		}

		wstring filename = s2ws(uid) + L"-" + wsSessionFormatCurrentTime(L"yyyyMMdd", L"-", L"HHmmss") + L"-" + to_wstring(sessionId) + L".autodump";
		{
			// 保存文件
			HANDLE hFile = CreateFileW((L"autodump/" + filename).c_str(), GENERIC_ALL, 0, 0, CREATE_ALWAYS, 0, 0);
			if (!hFile || hFile == INVALID_HANDLE_VALUE) {
				SERVER_EVENT_BEGIN("action-ended");
				SERVER_EVENT_SET_PARAMETER(success, false);
				SERVER_EVENT_SET_PARAMETER(code, (uint64_t)GetLastError());
				SERVER_EVENT_SET_PARAMETER(errorText, ConvertUTF16ToUTF8(LastErrorStrW()));
				SERVER_EVENT_END();
				SERVER_SESSION_END_WITH_CLEAN();
			}
			DWORD written = 0;
			WriteFile(hFile, ansi.data(), (DWORD)ansi.size(), &written, 0);
			CloseHandle(hFile);
		}

		SERVER_EVENT_BEGIN("action-ended");
		SERVER_EVENT_SET_PARAMETER(success, true);
		SERVER_EVENT_SET_PARAMETER(file, ConvertUTF16ToUTF8(filename));
		SERVER_EVENT_SET_PARAMETER(file_type, "autodump");
		SERVER_EVENT_END();
	}
	else {
		wstring filename = s2ws(uid) + L"-" + wsSessionFormatCurrentTime(L"yyyyMMdd", L"-", L"HHmmss") + L"-" + to_wstring(sessionId) + L".autodump";

		wstring std;
		DWORD dwCode = -1;

		auto rlcb = [](wstring& data, PVOID pvoid) { // Run Log CallBack
			WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;

			SERVER_EVENT_BEGIN("run-log");
			SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(data));
			SERVER_EVENT_END();
		};
		GetProcessStdOutputWithExitCodeEnhanced(L"bin/mfoc/mfoc64 -f " + pipeKeyFile +
			L" -O autodump/" + filename, &dwCode, std, true, rlcb, (PVOID)sessionId);

		if (dwCode) {//failed
			SERVER_EVENT_BEGIN("action-ended");
			SERVER_EVENT_SET_PARAMETER(success, false);
			SERVER_EVENT_SET_PARAMETER(code, (uint64_t)dwCode);
			SERVER_EVENT_SET_PARAMETER(errorText, ccs8("读取卡片时出现错误。\n异常来自 mfoc64.exe ("
				+ to_wstring(dwCode) + L": " + ErrorCodeToStringW(dwCode) + L")\n" + std));
			SERVER_EVENT_END();
			SERVER_SESSION_END_WITH_CLEAN();
		}

		SERVER_EVENT_BEGIN("action-ended");
		SERVER_EVENT_SET_PARAMETER(success, true);
		SERVER_EVENT_SET_PARAMETER(file, ConvertUTF16ToUTF8(filename));
		SERVER_EVENT_SET_PARAMETER(file_type, "autodump");
		SERVER_EVENT_END();
	}

	wsSessionSessionEnd(sessionId);
	cleanPipe1();
	return 0;
}



#if 0
void readmfoc() {

	set<wstring> keysAvailable;
	wstring card_uid = L"uidUnknown";
	{
		// detect key
		wstring& text = data->internalDataProvider;
		DWORD dwCode = -1;

		wstring cmd_line = L"bin/mfoc/mfdetect64 -f \"" +
			pipeKeyFile + L"\" -O NUL";

#if 0
		{
			//srand(time(0) % rand());
			//wstring tempFile = L"pn532_data/temp/" + s2ws(ossl_sha256(to_string(
			//	time(0))) + ossl_sha256(to_string(rand())));

			wstring tempFile = L"\\\\.\\pipe\\" + s2ws(app_token) +
				L".inbound_" + to_wstring(sessionId) + L"-keydetect.console";

			{ // create named pipe: key
				HANDLE hPipe = CreateNamedPipeW(
					tempFile.c_str(),            // 管道名称  
					PIPE_ACCESS_DUPLEX,
					PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
					1, 65536, 65536, 0, NULL);

				if (hPipe == INVALID_HANDLE_VALUE) {
					ptr->send(ccs8("{\"type\":\"error-ui\",\"error\":\"创建管道2失败\",\"modal\":true}"));
					wsSessionSessionEnd(sessionId);
					return 1;
				}

				data->hPipe_outbound_keyfile = hPipe;
				// 创建线程以处理管道连接  
				HANDLE hThread = CreateThread(
					NULL,                   // 默认安全属性  
					0,                      // 默认堆栈大小  
					wsNativeReadNfcMfClassic_srv2,       // 线程函数  
					(LPVOID)sessionId,          // 传递给线程的参数  
					0,                      // 默认创建标志  
					NULL);                  // 不需要获取线程标识符  
				if (hThread == NULL) {
					CloseHandle(hPipe);
					return 1;
				}

				CloseHandle(hThread);
				//CloseHandle(hPipe);
			}
			const auto cleanPipe2 = [&] {
				HANDLE hFile = CreateFileW(pipeKeyFile.c_str(), GENERIC_READ, 0, 0, OPEN_EXISTING, 0, 0);
				if (hFile && hFile != INVALID_HANDLE_VALUE) CloseHandle(hFile);
				};

			SECURITY_ATTRIBUTES sa{};
			sa.nLength = sizeof sa;
			sa.bInheritHandle = TRUE;
			HANDLE hWrite = CreateFileW(tempFile.c_str(), GENERIC_ALL, 0,
				&sa, CREATE_ALWAYS, FILE_ATTRIBUTE_TEMPORARY, 0);
			if (!hWrite || hWrite == INVALID_HANDLE_VALUE) {
				Json::Value pipeEvent;
				pipeEvent["type"] = "action-ended";
				pipeEvent["success"] = false;
				pipeEvent["code"] = (ULONGLONG)GetLastError();
				pipeEvent["errorText"] = ConvertUTF16ToUTF8(LastErrorStrW());
				wsSessionSessionSendEvent(sessionId, pipeEvent);
				wsSessionSessionEnd(sessionId);
				cleanPipe1();
				cleanPipe2();
				return dwCode;
			}

			STARTUPINFOW si;
			PROCESS_INFORMATION pi;
			AutoZeroMemory(si);
			si.cb = sizeof(STARTUPINFO);
			GetStartupInfoW(&si);

			si.hStdInput = hWrite;
			si.hStdError = hWrite;
			si.hStdOutput = hWrite;
			si.wShowWindow = SW_HIDE;
			si.dwFlags = STARTF_USESHOWWINDOW |
				STARTF_USESTDHANDLES;
			if (!CreateProcessW(NULL, (LPWSTR)(cmd_line.c_str())
				, NULL, NULL, TRUE, CREATE_SUSPENDED, NULL, NULL, &si, &pi)) {
				Json::Value pipeEvent;
				pipeEvent["type"] = "action-ended";
				pipeEvent["success"] = false;
				pipeEvent["code"] = (ULONGLONG)GetLastError();
				pipeEvent["errorText"] = ConvertUTF16ToUTF8(LastErrorStrW());
				wsSessionSessionSendEvent(sessionId, pipeEvent);
				wsSessionSessionEnd(sessionId);
				cleanPipe1();
				CloseHandle(hWrite);
				//DeleteFileW(tempFile.c_str());
				return 3;
			}
			ResumeThread(pi.hThread);

			WaitForSingleObject(pi.hProcess, INFINITE);
			GetExitCodeProcess(pi.hProcess, &dwCode);
			Process.CloseProcessHandle(pi);
			CloseHandle(hWrite);
		}
#endif
#if 0
		GetProcessStdOutputWithExitCodeW(L"pn532_bin/mfdetect -f \"" +
			pipeKeyFile + L"\" -O NUL", &dwCode, text, true,
			[](wstring& data, PVOID pvoid) {
				WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;
				Json::Value event;
				event["type"] = "run-log";
				event["data"] = ConvertUTF16ToUTF8(data);
				wsSessionSessionSendEvent(sessionId, event);
			}, (PVOID)sessionId);
#endif

		bool succ = GetProcessStdOutputWithExitCodeEnhanced(
			cmd_line, &dwCode, text,
			true, [](wstring& data, PVOID pvoid)
			{
#if 0
				static wstring lastEventData;
				WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;
				Json::Value event;
				event["type"] = "run-log";
				if ((!lastEventData.empty()) ||
					(lastEventData.size() < 20 && data.size() < 50)) {
					lastEventData += data;
					if (lastEventData.size() < 20) return;
					event["data"] = ConvertUTF16ToUTF8(lastEventData);
					wsSessionSessionSendEvent(sessionId, event);
					lastEventData.clear();
					return;
				}
				event["data"] = ConvertUTF16ToUTF8(data);
				wsSessionSessionSendEvent(sessionId, event);
#else
				WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;
				Json::Value event;
				event["type"] = "run-log";
				event["data"] = ConvertUTF16ToUTF8(data);
				wsSessionSessionSendEvent(sessionId, event);
#endif
			}, (PVOID)sessionId);

		Json::Value pipeEvent;
		pipeEvent["type"] = "key-scanned";
		pipeEvent["success"] = dwCode == 0;
		pipeEvent["result"] = ConvertUTF16ToUTF8(text);
		wsSessionSessionSendEvent(sessionId, pipeEvent);

		if (!succ || dwCode || text.npos == text.find(L"扇区")) {
			// 出错
			Json::Value pipeEvent;
			pipeEvent["type"] = "action-ended";
			pipeEvent["success"] = false;
			pipeEvent["code"] = (ULONGLONG)dwCode;
			pipeEvent["errorText"] = succ ? ConvertUTF16ToUTF8(text) :
				ccs8("无法启动mfoc，请检查相关文件是否存在");
			wsSessionSessionSendEvent(sessionId, pipeEvent);
			wsSessionSessionEnd(sessionId);
			cleanPipe1();
			return dwCode;
		}

		// 处理数据
		vector<wstring> keysBuffer;
		str_split(text, L"\r\n", keysBuffer);
		wstring keytemp;
		for (auto& i : keysBuffer) {
			if (i.starts_with(L"       UID (NFCID1): ")) {
				keytemp = wsNativeReadNfcMfClassic_extractKeyFromMfocString(
					i, L"UID (NFCID1): ", 14);
				if (!keytemp.empty()) {
					vector<wstring> uids;
					str_split(keytemp, L"  ", uids);
					card_uid = L"";
					for (auto& i : uids) {
						card_uid += i;
					}
				}
				continue;
			}
			if (!i.starts_with(L"Sector ")) continue;
			if (i.find(L"A:") != i.npos) {
				keytemp = wsNativeReadNfcMfClassic_extractKeyFromMfocString(
					i, L"Key A: ", 12);
				if (!keytemp.empty() && !keysAvailable.contains(keytemp))
					keysAvailable.insert(keytemp);
			}
			if (i.find(L"B:") != i.npos) {
				keytemp = wsNativeReadNfcMfClassic_extractKeyFromMfocString(
					i, L"Key B: ", 12);
				if (!keytemp.empty() && !keysAvailable.contains(keytemp))
					keysAvailable.insert(keytemp);
			}
		}
		keysBuffer.clear();
		pipeEvent["type"] = "key-processed";
		Json::Value keysResult(Json::arrayValue);
		for (auto& i : keysAvailable) keysResult.append(ConvertUTF16ToUTF8(i));
		pipeEvent["result"] = keysResult;
		wsSessionSessionSendEvent(sessionId, pipeEvent);

	}


	{
		wstring& text = data->internalDataProvider;
		DWORD dwCode = -1;

		wstring dump_name = L"dumps/" + card_uid + L",time=" +
			wsSessionFormatCurrentTime(L"yyyyMMdd", L"-", L"HHmmss");

		wstring cmd_line = L"bin/mfoc/mfoc64 -O \"" +
			dump_name + L"\" ";
		for (auto& i : keysAvailable) {
			cmd_line += L" -k \"" + i + L"\"";
		}

		bool succ = GetProcessStdOutputWithExitCodeEnhanced(
			cmd_line, &dwCode, text,
			true, [](wstring& data, PVOID pvoid)
			{
				WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;
				Json::Value event;
				event["type"] = "run-log";
				event["data"] = ConvertUTF16ToUTF8(data);
				wsSessionSessionSendEvent(sessionId, event);
			}, (PVOID)sessionId);

		Json::Value pipeEvent;
		pipeEvent["type"] = "card-read-ended";
		pipeEvent["success"] = dwCode == 0;
		pipeEvent["result"] = ConvertUTF16ToUTF8(text);
		wsSessionSessionSendEvent(sessionId, pipeEvent);

		if (!succ || dwCode) {
			// 出错
			Json::Value pipeEvent;
			pipeEvent["type"] = "action-ended";
			pipeEvent["success"] = false;
			pipeEvent["code"] = (ULONGLONG)dwCode;
			pipeEvent["errorText"] = succ ? ConvertUTF16ToUTF8(text) :
				ccs8("无法启动mfoc，请检查相关文件是否存在");
			wsSessionSessionSendEvent(sessionId, pipeEvent);
			wsSessionSessionEnd(sessionId);
			cleanPipe1();
			return dwCode;
		}

		pipeEvent["type"] = "card-read";
		pipeEvent["result"] = ConvertUTF16ToUTF8(text);
		wsSessionSessionSendEvent(sessionId, pipeEvent);

	}
}
#endif




#pragma endregion


