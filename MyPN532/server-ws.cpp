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
class wsNativeNfcApiData_ReadMifare {
public:
	wsNativeNfcApiData_ReadMifare() :
		hPipe_outbound_keyfile(0),
		use_mfoc(false),
		use_raw_mfoc(false),
		unlock(false),
		read_ndef(false)
	{};
	vector<wstring> keyfiles;
	HANDLE hPipe_outbound_keyfile;
	bool use_mfoc, use_raw_mfoc;
	bool unlock;
	bool read_ndef;
	wstring sectorsStr;
	wstring internalDataProvider;
};
class DUMPDATA_T {
public:
	static constexpr size_t data_size = 1048576;
	DUMPDATA_T() {
		data = new uint8_t[data_size];
	}
	~DUMPDATA_T() {
		delete[] data;
	}

	uint8_t& operator[](size_t index) {
		if (index >= data_size) throw std::out_of_range("Index out-of-range");
		return this->data[index];
	}
	const uint8_t& operator[](size_t index) const {
		if (index >= data_size) throw std::out_of_range("Index out-of-range");
		return this->data[index];
	}
	uint8_t* getData() {
		return data;
	}
	const uint8_t* getData() const {
		return data;
	}

protected:
	uint8_t* data;
};
class wsNativeNfcApiData_WriteMifare {
public:
	wsNativeNfcApiData_WriteMifare() :
		hPipe_outbound_keyfile(NULL),
		isFormat(false),
		unlock(false),
		reset(false),
		writeB0(false),
		noBccCheck(false)
	{};
	vector<wstring> keyfiles;
	HANDLE hPipe_outbound_keyfile;
	bool isFormat;
	bool unlock, reset;
	bool writeB0;
	bool noBccCheck;
	wstring dumpfile;
	unique_ptr<DUMPDATA_T> dumpdata;
	wstring sectors;
	wstring reset_newuid;
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
bool wsSessionSessionEnd(WS_SESSIONID sessionId);
std::string base64_decode(const std::string& encoded_data);

map<WS_SESSIONID, wsNativeNfcApiData_ReadMifare> wsSessionIdData_ReadMifare;
DWORD WINAPI wsNativeReadNfcMfClassic(PVOID pConnInfo);

map<WS_SESSIONID, wsNativeNfcApiData_WriteMifare> wsSessionIdData_WriteMifare;
DWORD WINAPI wsNativeWriteNfcMfClassic(PVOID pConnInfo);



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

#define declare_bool_data(varName) bool varName = json.isMember( # varName ) ?\
			(json[ # varName ].isBool() ? json[ # varName ].asBool() : false) : false;
		if (type == "read-nfc-tag-mfclassic") {
			WS_SESSIONID sessionId = json["sessionId"].asUInt64();
			Json::Value val;
			val["success"] = false;
			val["sessionId"] = sessionId;
			wstring sz_keyfiles = ConvertUTF8ToUTF16(json["keyfiles"].asString());
			declare_bool_data(use_mfoc); declare_bool_data(use_raw_mfoc);
			declare_bool_data(unlock);
			declare_bool_data(read_ndef);
			wstring sectors;
			if (json.isMember("sector_range") && json["sector_range"].isArray()) {
				auto& start = json["sector_range"][0];
				auto& end = json["sector_range"][1];
				if (!(start.isIntegral() && end.isIntegral())) {
					//val["code"] = 400;
					//val["error"] = ccs8("范围不明确");
					//val["type"] = "action-ended";
					//wsSessionSessionEnd(sessionId);
					//Json::FastWriter fastWriter;
					//wsConnPtr->send(fastWriter.write(val));
					//return;
				}
				else {
					size_t s = start.asLargestUInt();
					size_t e = end.asLargestUInt();
					for (size_t v = s; v <= e; ++v) sectors += to_wstring(v) + L",";
					if (!sectors.empty()) sectors.erase(sectors.end() - 1);
				}
			}
			
			if (sz_keyfiles.empty() && !use_mfoc && !unlock) {
				val["code"] = 400;
				val["error"] = ccs8("需要指定keyfile");
				wsSessionSessionEnd(sessionId);
			}
			else if (wsSessionIdData_ReadMifare.contains(sessionId)) {
				val["code"] = 400;
				val["error"] = ccs8("正在进行其他操作");
				val["type"] = "action-ended";
				wsSessionSessionEnd(sessionId);
			}
			else if (!wsSessionIdPtr.contains(sessionId)) {
				val["code"] = 404;
				val["error"] = ccs8("No such session id");
				val["type"] = "action-ended";
				wsSessionSessionEnd(sessionId);
			}
			else {
				wsNativeNfcApiData_ReadMifare ad;
				if (!sz_keyfiles.empty()) str_split(sz_keyfiles, L"|", ad.keyfiles);
				ad.use_mfoc = use_mfoc;
				ad.use_raw_mfoc = use_raw_mfoc;
				ad.unlock = unlock;
				ad.sectorsStr = sectors;
				ad.read_ndef = read_ndef;
				wsSessionIdData_ReadMifare.insert(std::make_pair(sessionId, ad));

				val["code"] = 0;
				val["success"] = CloseHandleIfOk(CreateThread(0, 0,
					wsNativeReadNfcMfClassic, (PVOID)sessionId, 0, 0));
			}

			Json::FastWriter fastWriter;
			wsConnPtr->send(fastWriter.write(val));
			return;
		}

		if (type == "write-mfclassic" || type == "format-mfclassic") {
			WS_SESSIONID sessionId = json["sessionId"].asUInt64();
			Json::Value val;
			val["success"] = false;
			val["sessionId"] = sessionId;
			wstring sz_keyfiles = ConvertUTF8ToUTF16(json["keyfiles"].asString());
			wstring sz_dumpfile = ConvertUTF8ToUTF16(json["dumpfile"].asString());
			wstring sz_dumpdata = ConvertUTF8ToUTF16(json["dumpdata"].asString());
			declare_bool_data(unlock);
			declare_bool_data(writeB0);
			declare_bool_data(reset);
			declare_bool_data(noBccCheck);
			wstring sectors, newUid;
			if (json.isMember("sectors") && json["sectors"].isString()) {
				sectors = ConvertUTF8ToUTF16(json["sectors"].asString());
			}
			if (json.isMember("newUid") && json["newUid"].isString()) {
				newUid = ConvertUTF8ToUTF16(json["newUid"].asString());
			}
			
			if (type != "format-mfclassic" && (sz_dumpfile.empty() && sz_dumpdata.empty())) {
				val["code"] = 400;
				val["error"] = ccs8("需要指定dump，可以选择dumpfile或base64的dumpdata");
				wsSessionSessionEnd(sessionId);
			}
			else if (wsSessionIdData_WriteMifare.contains(sessionId)) {
				val["code"] = 400;
				val["error"] = ccs8("正在进行其他操作");
				val["type"] = "action-ended";
				wsSessionSessionEnd(sessionId);
			}
			else if (!wsSessionIdPtr.contains(sessionId)) {
				val["code"] = 404;
				val["error"] = ccs8("No such session id");
				val["type"] = "action-ended";
				wsSessionSessionEnd(sessionId);
			}
			else {
				wsNativeNfcApiData_WriteMifare ad;
				if (!sz_keyfiles.empty()) str_split(sz_keyfiles, L"|", ad.keyfiles);
				ad.unlock = unlock;
				ad.writeB0 = writeB0;
				ad.reset = reset;
				ad.sectors = sectors;
				ad.noBccCheck = noBccCheck;
				ad.isFormat = (type == "format-mfclassic");
				ad.dumpfile = sz_dumpfile;
				ad.reset_newuid = newUid;
				if (!sz_dumpdata.empty()) {
					ad.dumpdata.reset(new DUMPDATA_T);
					auto data = (*ad.dumpdata).getData();
					string buffer = base64_decode(ws2s(sz_dumpdata));
					if (buffer.size() > 1048500) {
						wsSessionSessionEnd(sessionId);
						throw "Data too large";
					}
					memcpy(data, buffer.data(), buffer.size());
				}
				wsSessionIdData_WriteMifare.insert(std::make_pair(sessionId, std::move(ad)));

				val["code"] = 0;
				val["success"] = CloseHandleIfOk(CreateThread(0, 0,
					wsNativeWriteNfcMfClassic, (PVOID)sessionId, 0, 0));
			}

			Json::FastWriter fastWriter;
			wsConnPtr->send(fastWriter.write(val));
			return;
		}

#undef declare_bool_data

		throw "No handler found with type " + type;
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
		wsSessionIdData_ReadMifare.erase(sessionId);
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
	wsNativeNfcApiData_ReadMifare* data = NULL;
	HANDLE hPipe;
	try {
		data = &wsSessionIdData_ReadMifare.at(sessionId);
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

	if (!wsSessionIdData_ReadMifare.contains(sessionId)) {
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
	wsNativeNfcApiData_ReadMifare* data = NULL;
	HANDLE hPipe;
	try {
		data = &wsSessionIdData_ReadMifare.at(sessionId);
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

	if (!wsSessionIdData_ReadMifare.contains(sessionId)) {
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
	wsNativeNfcApiData_ReadMifare* data = nullptr;
	try {
		ptr = wsSessionIdPtr.at(sessionId);
		data = &wsSessionIdData_ReadMifare.at(sessionId);
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
	if (data->read_ndef && data->use_mfoc) data->use_mfoc = false;

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
		HANDLE hThread = CreateThread(NULL, 0,
			wsNativeReadNfcMfClassic_srv, (LPVOID)sessionId, 0, NULL);
		if (hThread == NULL) {
			SERVER_EVENT_BEGIN("action-ended")
				SERVER_EVENT_SET_PARAMETER(success, false)
				SERVER_EVENT_SET_PARAMETER(errorText, L"创建管道1的线程失败")
				SERVER_EVENT_END()
			SERVER_SESSION_END()
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
				if (!data->sectorsStr.empty()) cmd += L" --sectors=" + data->sectorsStr;
			}
			if (data->read_ndef) {
				cmd = L"bin/self/service --type=mfclassic -cr --ndef-only --pipe=" + pipe;
			}
			SERVER_EVENT_BEGIN("run-log");
			SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(L"run-command: " + cmd + L"\n"));
			SERVER_EVENT_END();
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
			SERVER_EVENT_SET_PARAMETER(errorText, ccs8("读取标签时出现错误。\n异常来自 service.exe (" + to_wstring(dwCode) + 
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
		if (data->use_raw_mfoc)
			GetProcessStdOutputWithExitCodeEnhanced(L"bin/mfoc/mfoc64 -f " + pipeKeyFile +
				L" -O autodump/" + filename, &dwCode, std, true, rlcb, (PVOID)sessionId);
		else GetProcessStdOutputWithExitCodeEnhanced(L"bin/self/service --type=better-mfoc -f" +
			pipeKeyFile + L" -Oautodump/" + filename, &dwCode, std, true, rlcb, (PVOID)sessionId);

		if (dwCode) {//failed
			SERVER_EVENT_BEGIN("action-ended");
			SERVER_EVENT_SET_PARAMETER(success, false);
			SERVER_EVENT_SET_PARAMETER(code, (uint64_t)dwCode);
			SERVER_EVENT_SET_PARAMETER(errorText, ccs8("读取标签时出现错误。\n异常来自 mfoc64.exe ("
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




static DWORD WINAPI wsNativeWriteNfcMfClassic_srv(LPVOID lpParam) {
	WS_SESSIONID sessionId = (WS_SESSIONID)lpParam;
	wsNativeNfcApiData_WriteMifare* data = NULL;
	HANDLE hPipe;
	try {
		data = &wsSessionIdData_WriteMifare.at(sessionId);
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

	for (size_t i = 0; i < 2; ++i) {
		if (!ConnectNamedPipe(hPipe, NULL)) {
			if (GetLastError() != ERROR_PIPE_CONNECTED) {
				CloseHandle(hPipe);
				wsSessionSessionEnd(sessionId);
				return GetLastError();
			}
		}

		if (!wsSessionIdData_WriteMifare.contains(sessionId)) {
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
					&bytesWritten, NULL) || bytesWritten != message.size()) {
					break;
				}
			}
			file.close();
		}
	}
	CloseHandle(hPipe);
	return 0;
}
static std::string extractTextBetweenDoubleAtSigns(const std::string& input) {
	size_t start = input.find("@@"); // 查找第一个"@@"的位置  
	if (start == std::string::npos) {
		// 如果没有找到第一个"@@"，则直接返回空字符串  
		return "";
	}

	start += 2; // 移动到第一个"@@"之后的位置  

	size_t end = input.find("@@", start); // 从start之后的位置开始查找第二个"@@"  
	if (end == std::string::npos) {
		// 如果没有找到第二个"@@"，则表明"@@"不成对出现，返回空字符串  
		return "";
	}

	// 如果start和end是相邻的，则表明"@@"之间没有字符，返回空字符串  
	if (end - start == 0) {
		return "";
	}

	// 提取两个"@@"之间的内容  
	return input.substr(start, end - start);
}
DWORD __stdcall wsNativeWriteNfcMfClassic(PVOID pConnInfo) {
	WS_SESSIONID sessionId = (WS_SESSIONID)pConnInfo;
	WebSocketConnectionPtr ptr;
	wsNativeNfcApiData_WriteMifare* data = nullptr;
	try {
		ptr = wsSessionIdPtr.at(sessionId);
		data = &wsSessionIdData_WriteMifare.at(sessionId);
		if (!ptr || !data) throw -1;
	}
	catch (...) {
		return 87l;
	}

	auto& keyfiles = data->keyfiles;

	bool unlock = data->unlock;

	// check BCC
	if (!data->isFormat && !data->noBccCheck) {
		HANDLE file = CreateFileW((L"dumps/" + data->dumpfile).c_str(), FILE_READ_DATA,
			FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0);
		if (!file || file == INVALID_HANDLE_VALUE) {
			SERVER_EVENT_BEGIN("action-ended")
				SERVER_EVENT_SET_PARAMETER(success, false)
				SERVER_EVENT_SET_PARAMETER(location, __LINE__)
				SERVER_EVENT_SET_PARAMETER(errorText, ccs8("BCC校验失败: 无法打开转储文件: Could not open dump file: " + LastErrorStr() + L"\n"))
			SERVER_EVENT_END()
			SERVER_SESSION_END()
			return 1;
		}
		uint8_t data[6]{}; DWORD readed = 0;
		if (!ReadFile(file, data, 5, &readed, 0)) {
			SERVER_EVENT_BEGIN("action-ended")
				SERVER_EVENT_SET_PARAMETER(success, false)
				SERVER_EVENT_SET_PARAMETER(location, __LINE__)
				SERVER_EVENT_SET_PARAMETER(errorText, ccs8("BCC校验失败: 无法读取转储文件"))
			SERVER_EVENT_END()
			SERVER_SESSION_END()
			return 1;
		}
		CloseHandle(file);
		if (data[0] ^ data[1] ^ data[2] ^ data[3] ^ data[4]) {
			SERVER_EVENT_BEGIN("action-ended")
				SERVER_EVENT_SET_PARAMETER(success, false)
				SERVER_EVENT_SET_PARAMETER(location, __LINE__)
				SERVER_EVENT_SET_PARAMETER(errorText, ccs8("BCC校验失败! 请前往编辑该文件，在编辑器中可以计算正确的BCC值"))
			SERVER_EVENT_END()
			SERVER_SESSION_END()
			return 1;
		}

		SERVER_EVENT_BEGIN("run-log");
		SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(L"BCC校验: 已通过\n"));
		SERVER_EVENT_END();
	}

	// connect
#pragma region Create pipeKeyFile
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
				SERVER_EVENT_SET_PARAMETER(errorText, ccs8("创建管道1失败"))
			SERVER_EVENT_END()
			SERVER_SESSION_END()
			return 1;
		}
		data->hPipe_outbound_keyfile = hPipe;
		// 创建线程以处理管道连接  
		HANDLE hThread = CreateThread(NULL, 0,
			wsNativeWriteNfcMfClassic_srv, (LPVOID)sessionId, 0, NULL);
		if (hThread == NULL) {
			SERVER_EVENT_BEGIN("action-ended")
				SERVER_EVENT_SET_PARAMETER(success, false)
				SERVER_EVENT_SET_PARAMETER(errorText, ccs8("创建管道1的线程失败"))
			SERVER_EVENT_END()
			SERVER_SESSION_END()
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
#pragma endregion

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

	wstring read_filename = data->unlock ? L"" :
		s2ws(uid) + L"-" + to_wstring(time(0)) + L"-" + to_wstring(sessionId) + L".temp";
	if (!data->unlock) {
		wstring std;
		DWORD dwCode = -1;

		auto rlcb = [](wstring& data, PVOID pvoid) { // Run Log CallBack
			WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;

			SERVER_EVENT_BEGIN("run-log");
			SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(data));
			SERVER_EVENT_END();
		};
		GetProcessStdOutputWithExitCodeEnhanced(L"bin/self/service --type=better-mfoc -f" + pipeKeyFile +
			L" -Oautodump/" + read_filename + (data->sectors.empty() ? L"" : (L" --sectors=\"" +
				data->sectors + L"\" ")), &dwCode, std, true, rlcb, (PVOID)sessionId);

		if (dwCode) {//failed
			SERVER_EVENT_BEGIN("action-ended");
			SERVER_EVENT_SET_PARAMETER(success, false);
			SERVER_EVENT_SET_PARAMETER(code, (uint64_t)dwCode);
			SERVER_EVENT_SET_PARAMETER(errorText, ccs8("读取标签时出现错误。\n异常来自 service.exe ("
				+ to_wstring(dwCode) + L": " + ErrorCodeToStringW(dwCode) + L")\n" + std));
			SERVER_EVENT_END();
			SERVER_SESSION_END_WITH_CLEAN();
		}
	}
	
	SERVER_EVENT_BEGIN("tag-read-ended");
	SERVER_EVENT_END();

	wstring write_filename = data->isFormat ? (data->unlock ? L"" :
		(L"autodump/" + read_filename)) : (L"dumps/" + data->dumpfile);
	if (write_filename.empty() && !data->unlock) {
		// TODO
		DeleteFileW((L"autodump/" + read_filename).c_str());
		SERVER_EVENT_BEGIN("action-ended");
		SERVER_EVENT_SET_PARAMETER(success, false);
		SERVER_EVENT_SET_PARAMETER(errorText, ccs8("暂不支持"));
		SERVER_EVENT_END();
		SERVER_SESSION_END_WITH_CLEAN();
	}

	SERVER_EVENT_BEGIN("tag-write-started");
	SERVER_EVENT_END();
	string resultJson;
	{
		wstring command = L"bin/self/service -c"s +
			(data->isFormat ? (data->unlock ? L"F" : L"f") : (data->unlock ? L"W" : L"w")) +
			(data->unlock ? L"" : (L" --keyfile=\"autodump/" + read_filename + L"\"")) +
			L" --dumpfile=\"" + write_filename + L"\" ";
		if (!data->sectors.empty()) command += L"--sectors=\"" + data->sectors + L"\" ";
		if (data->writeB0) command += L"--write-block-0 ";
		command += L" --type=mfclassic ";

		wstring std, text, pipe; string ansi;
		DWORD dwCode = -1;
		size_t pipeId = sessionId;
		pipe = L"\\\\.\\pipe\\" + s2ws(app_token) +
			L".cardwrite-" + to_wstring(pipeId) + L".pipe";
		command += L" --pipe=" + pipe + L" ";

		if (data->reset && (!data->reset_newuid.empty())) command = L"bin/nfc/nfc-mfsetuid " + data->reset_newuid;
		else if (data->reset) command = L"bin/nfc/nfc-mfsetuid -f " + (GenerateUUIDWithoutDelimW().substr(0, 8));
		else if (data->isFormat && data->unlock) command = L"bin/nfc/nfc-mfsetuid -f " + s2ws(uid);

		SERVER_EVENT_BEGIN("run-log");
		SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(L"[debug] new uid: " + data->reset_newuid + L"\r\n"));
		SERVER_EVENT_END();
		SERVER_EVENT_BEGIN("run-log");
		SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(L"run-command: " + command + L"\r\n"));
		SERVER_EVENT_END();

		auto rlcb = [](wstring& data, PVOID pvoid) { // Run Log CallBack
			WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;

			SERVER_EVENT_BEGIN("run-log");
			SERVER_EVENT_SET_PARAMETER(data, ConvertUTF16ToUTF8(data));
			SERVER_EVENT_END();
		};
		auto rlca = [](string& data, PVOID pvoid) { // Run Log Callback Ansi
			WS_SESSIONID sessionId = (WS_SESSIONID)pvoid;

			SERVER_EVENT_BEGIN("run-log");
			SERVER_EVENT_SET_PARAMETER(data, (data));
			SERVER_EVENT_END();
		};

		if (data->reset || (data->isFormat && data->unlock)) {
			GetProcessStdOutputWithExitCodeEnhanced(command, &dwCode, std, true, rlcb, (PVOID)sessionId);

			DeleteFileW((L"autodump/" + read_filename).c_str());

			if (dwCode) {//failed
				SERVER_EVENT_BEGIN("action-ended");
				SERVER_EVENT_SET_PARAMETER(success, false);
				SERVER_EVENT_SET_PARAMETER(code, (uint64_t)dwCode);
				SERVER_EVENT_SET_PARAMETER(errorText, ccs8("写入标签时出现错误。\n异常来自 nfc-mfsetuid.exe ("
					+ to_wstring(dwCode) + L": " + ErrorCodeToStringW(dwCode) + L")\n" + std));
				SERVER_EVENT_END();
				SERVER_SESSION_END_WITH_CLEAN();
			}
		}
		else {
			HANDLE hThread = NULL;
			if (pipeutil::CreateAndReadPipeAsync(pipe, &ansi, hThread, rlca, (PVOID)sessionId)) {
				GetProcessStdOutputWithExitCodeEnhanced(command, &dwCode, std, true, rlcb, (PVOID)sessionId);
				text = s2ws(ansi);
			}
			else {
				if (!read_filename.empty()) DeleteFileW((L"autodump/" + read_filename).c_str());
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

			if (!read_filename.empty()) DeleteFileW((L"autodump/" + read_filename).c_str());

			if (dwCode) {//failed
				SERVER_EVENT_BEGIN("action-ended");
				SERVER_EVENT_SET_PARAMETER(success, false);
				SERVER_EVENT_SET_PARAMETER(code, (uint64_t)dwCode);
				SERVER_EVENT_SET_PARAMETER(errorText, ccs8("写入标签时出现错误。\n异常来自 service.exe ("
					+ to_wstring(dwCode) + L": " + ErrorCodeToStringW(dwCode) + L")\n" + std));
				SERVER_EVENT_END();
				SERVER_SESSION_END_WITH_CLEAN();
			}
			resultJson = extractTextBetweenDoubleAtSigns(ansi);
		}
	}


	SERVER_EVENT_BEGIN("action-ended");
	SERVER_EVENT_SET_PARAMETER(success, true);
	SERVER_EVENT_SET_PARAMETER(code, (uint64_t)0);
	SERVER_EVENT_SET_PARAMETER(result, resultJson);
	SERVER_EVENT_END();
	wsSessionSessionEnd(sessionId);
	cleanPipe1();
	return 0;
}






#pragma endregion


