#include "GeminiRemoverCommand.h"
#include <shlwapi.h>
#include <fstream>
#include <filesystem>
#include <chrono>
#include <sstream>

static const wchar_t* SUPPORTED_EXT[] = {
    L".mp4", L".mov", L".webm", L".m4v", nullptr
};

static bool IsSupportedVideoFile(const std::wstring& path) {
    size_t dotPos = path.find_last_of(L'.');
    if (dotPos == std::wstring::npos) return false;
    std::wstring ext = path.substr(dotPos);
    for (auto& c : ext) c = towlower(c);
    for (int i = 0; SUPPORTED_EXT[i]; ++i)
        if (ext == SUPPORTED_EXT[i]) return true;
    return false;
}

IFACEMETHODIMP GeminiRemoverCommand::QueryInterface(REFIID riid, void** ppv) {
    static const QITAB qit[] = {
        QITABENT(GeminiRemoverCommand, IExplorerCommand),
        QITABENT(GeminiRemoverCommand, IObjectWithSite),
        { 0 },
    };
    return QISearch(this, qit, riid, ppv);
}
IFACEMETHODIMP_(ULONG) GeminiRemoverCommand::AddRef() { return InterlockedIncrement(&_cRef); }
IFACEMETHODIMP_(ULONG) GeminiRemoverCommand::Release() {
    ULONG cRef = InterlockedDecrement(&_cRef);
    if (!cRef) delete this;
    return cRef;
}

IFACEMETHODIMP GeminiRemoverCommand::GetTitle(IShellItemArray*, LPWSTR* ppszName) {
    return SHStrDupW(L"Remove AI Watermark", ppszName);
}

IFACEMETHODIMP GeminiRemoverCommand::GetIcon(IShellItemArray*, LPWSTR* ppszIcon) {
    std::wstring iconPath = GetAppExecutablePath() + L",0";
    return SHStrDupW(iconPath.c_str(), ppszIcon);
}

IFACEMETHODIMP GeminiRemoverCommand::GetToolTip(IShellItemArray*, LPWSTR* ppszInfotip) {
    return SHStrDupW(L"Remove AI watermark from selected video(s)", ppszInfotip);
}

IFACEMETHODIMP GeminiRemoverCommand::GetCanonicalName(GUID* pguidCommandName) {
    *pguidCommandName = CLSID_GeminiRemoverCommand;
    return S_OK;
}

IFACEMETHODIMP GeminiRemoverCommand::GetState(
    IShellItemArray* psia, BOOL, EXPCMDSTATE* pCmdState)
{
    if (!psia) { *pCmdState = ECS_HIDDEN; return S_OK; }
    
    DWORD count = 0;
    psia->GetCount(&count);
    if (count == 0) { *pCmdState = ECS_HIDDEN; return S_OK; }
    
    bool hasVideo = false;
    for (DWORD i = 0; i < count && !hasVideo; ++i) {
        Microsoft::WRL::ComPtr<IShellItem> item;
        if (SUCCEEDED(psia->GetItemAt(i, &item))) {
            LPWSTR pszPath = nullptr;
            if (SUCCEEDED(item->GetDisplayName(SIGDN_FILESYSPATH, &pszPath))) {
                hasVideo = IsSupportedVideoFile(pszPath);
                CoTaskMemFree(pszPath);
            }
        }
    }
    
    *pCmdState = hasVideo ? ECS_ENABLED : ECS_HIDDEN;
    return S_OK;
}

IFACEMETHODIMP GeminiRemoverCommand::Invoke(IShellItemArray* psia, IBindCtx*) {
    if (!psia) return E_INVALIDARG;
    
    auto paths = CollectFilePaths(psia);
    if (paths.empty()) return S_OK;
    
    std::wstring manifestPath = BuildJobManifestPath(paths);
    std::wstring appExe = GetAppExecutablePath();
    std::wstring cmdLine = L"\"" + appExe + L"\" --manifest \"" + manifestPath + L"\"";
    
    STARTUPINFOW si = { sizeof(si) };
    PROCESS_INFORMATION pi = {};
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_SHOW;
    
    std::wstring cmdLineMutable = cmdLine;
    if (CreateProcessW(
        appExe.c_str(),
        cmdLineMutable.data(),
        nullptr, nullptr, FALSE,
        NORMAL_PRIORITY_CLASS | CREATE_NEW_PROCESS_GROUP,
        nullptr, nullptr, &si, &pi))
    {
        CloseHandle(pi.hThread);
        CloseHandle(pi.hProcess);
    }
    
    return S_OK;
}

IFACEMETHODIMP GeminiRemoverCommand::GetFlags(EXPCMDFLAGS* pFlags) {
    *pFlags = ECF_DEFAULT;
    return S_OK;
}

IFACEMETHODIMP GeminiRemoverCommand::EnumSubCommands(IEnumExplorerCommand** ppEnum) {
    *ppEnum = nullptr;
    return E_NOTIMPL;
}

IFACEMETHODIMP GeminiRemoverCommand::SetSite(IUnknown* punkSite) {
    _spunkSite = punkSite;
    return S_OK;
}
IFACEMETHODIMP GeminiRemoverCommand::GetSite(REFIID riid, void** ppvSite) {
    return _spunkSite ? _spunkSite->QueryInterface(riid, ppvSite) : E_NOINTERFACE;
}

std::wstring GeminiRemoverCommand::GetAppExecutablePath() {
    wchar_t dllPath[MAX_PATH] = {};
    HMODULE hModule = nullptr;
    GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS,
        reinterpret_cast<LPCWSTR>(&CLSID_GeminiRemoverCommand), &hModule);
    GetModuleFileNameW(hModule, dllPath, MAX_PATH);
    std::wstring dir(dllPath);
    auto pos = dir.find_last_of(L"\\/");
    if (pos != std::wstring::npos) dir = dir.substr(0, pos);
    return dir + L"\\AI Watermark Remover.exe";
}

std::vector<std::wstring> GeminiRemoverCommand::CollectFilePaths(IShellItemArray* psia) {
    std::vector<std::wstring> result;
    DWORD count = 0;
    if (FAILED(psia->GetCount(&count))) return result;
    
    for (DWORD i = 0; i < count; ++i) {
        Microsoft::WRL::ComPtr<IShellItem> item;
        if (SUCCEEDED(psia->GetItemAt(i, &item))) {
            LPWSTR pszPath = nullptr;
            if (SUCCEEDED(item->GetDisplayName(SIGDN_FILESYSPATH, &pszPath))) {
                std::wstring path(pszPath);
                CoTaskMemFree(pszPath);
                if (IsSupportedVideoFile(path)) result.push_back(path);
            }
        }
    }
    return result;
}

std::wstring GeminiRemoverCommand::BuildJobManifestPath(const std::vector<std::wstring>& paths) {
    wchar_t tempDir[MAX_PATH] = {};
    GetTempPathW(MAX_PATH, tempDir);
    
    auto now = std::chrono::steady_clock::now().time_since_epoch().count();
    std::wstring manifestPath = std::wstring(tempDir) + L"ai-remover-" + std::to_wstring(now) + L".json";
    
    std::wostringstream json;
    json << L"{\n  \"files\": [\n";
    for (size_t i = 0; i < paths.size(); ++i) {
        std::wstring escaped = paths[i];
        std::wstring result;
        for (wchar_t c : escaped) {
            if (c == L'\\') result += L"\\\\";
            else if (c == L'"') result += L"\\\"";
            else result += c;
        }
        json << L"    \"" << result << L"\"";
        if (i + 1 < paths.size()) json << L",";
        json << L"\n";
    }
    json << L"  ]\n}";
    
    std::wofstream f(manifestPath);
    f << json.str();
    return manifestPath;
}
