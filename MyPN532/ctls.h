


const auto text = [MYCTLS_VAR_HWND](PCWSTR text, int x = 0, int y = 0, int w = 1, int h = 1, DWORD sty = 0) {
	HWND hw = CreateWindowExW(0, L"Static", text, WS_CHILD | WS_VISIBLE
		| sty, x, y, w, h, MYCTLS_VAR_HWND, 0, MYCTLS_VAR_HINST, 0);
	SendMessageW(hw, WM_SETFONT, (WPARAM)MYCTLS_VAR_HFONT, 0);
	return hw;
};
const auto edit = [MYCTLS_VAR_HWND](PCWSTR text = L"", int x = 0, int y = 0, int w = 1, int h = 1, DWORD sty = 0) {
	HWND hw = CreateWindowExW(0, L"Edit", text, WS_CHILD | WS_VISIBLE | WS_BORDER | WS_TABSTOP | ES_AUTOHSCROLL
		| sty, x, y, w, h, MYCTLS_VAR_HWND, 0, MYCTLS_VAR_HINST, 0);
	SendMessageW(hw, WM_SETFONT, (WPARAM)MYCTLS_VAR_HFONT, 0);
	return hw;
};
const auto button = [MYCTLS_VAR_HWND](PCWSTR text, int id = 0, int x = 0, int y = 0, int w = 1, int h = 1, DWORD sty = 0) {
	HWND hw = CreateWindowExW(0, L"Button", text, WS_CHILD | WS_VISIBLE | BS_CENTER | WS_TABSTOP
		| sty, x, y, w, h, MYCTLS_VAR_HWND, (HMENU)(UINT_PTR)id, MYCTLS_VAR_HINST, 0);
	SendMessageW(hw, WM_SETFONT, (WPARAM)MYCTLS_VAR_HFONT, 0);
	return hw;
};

const auto custom = [MYCTLS_VAR_HWND](PCWSTR text, PCWSTR c, int x = 0, int y = 0, int w = 1, int h = 1, DWORD sty = 0) {
	HWND hw = CreateWindowExW(0, c, text, WS_CHILD | WS_VISIBLE
		| sty, x, y, w, h, MYCTLS_VAR_HWND, 0, MYCTLS_VAR_HINST, 0);
	SendMessageW(hw, WM_SETFONT, (WPARAM)MYCTLS_VAR_HFONT, 0);
	return hw;
};


#undef MYCTLS_VAR_HWND
#undef MYCTLS_VAR_HINST
#undef MYCTLS_VAR_HFONT


