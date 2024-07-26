#include <iostream>  
#include <winsock2.h>  
#include <ws2tcpip.h>  
#pragma comment(lib, "ws2_32.lib") // 链接到WS2_32.lib  

bool 检测端口是否被占用(unsigned short 要检测的端口号) {
    // 初始化Winsock  
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        return true;
    }

    // 创建socket  
    SOCKET sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock == INVALID_SOCKET) {
        WSACleanup();
        return true;
    }

    // 绑定socket到本地地址和端口  
    sockaddr_in service{};
    service.sin_family = AF_INET;
    service.sin_addr.s_addr = INADDR_ANY; // 监听所有本地地址  
    service.sin_port = htons(要检测的端口号);

    if (bind(sock, (SOCKADDR*)&service, sizeof(service)) == SOCKET_ERROR) {
        int error = WSAGetLastError();
        if (error == WSAEADDRINUSE) {
            // 端口已被占用  
            closesocket(sock);
            WSACleanup();
            return true;
        }
        else {
            closesocket(sock);
            WSACleanup();
            return true;
        }
    }

    // 如果绑定成功，说明端口未被占用，但我们实际上不需要这个socket  
    closesocket(sock);
    WSACleanup();
    return false;
}
