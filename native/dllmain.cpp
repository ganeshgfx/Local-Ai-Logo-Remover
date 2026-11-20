#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <new>
#include "GeminiRemoverCommand.h"

HINSTANCE g_hInst = nullptr;
long g_cDllRef = 0;

BOOL APIENTRY DllMain(HMODULE hModule, DWORD dwReason, LPVOID) {
    switch (dwReason) {
    case DLL_PROCESS_ATTACH:
        g_hInst = hModule;
        DisableThreadLibraryCalls(hModule);
        break;
    }
    return TRUE;
}

STDAPI DllGetClassObject(REFCLSID rclsid, REFIID riid, void** ppv) {
    if (!ppv) return E_POINTER;
    *ppv = nullptr;
    if (!IsEqualCLSID(rclsid, CLSID_GeminiRemoverCommand)) return CLASS_E_CLASSNOTAVAILABLE;
    
    struct CF : IClassFactory {
        ULONG _cRef = 1;
        IFACEMETHODIMP QueryInterface(REFIID r, void** pp) {
            if (IsEqualIID(r, IID_IUnknown) || IsEqualIID(r, IID_IClassFactory))
                { *pp = static_cast<IClassFactory*>(this); AddRef(); return S_OK; }
            return E_NOINTERFACE;
        }
        IFACEMETHODIMP_(ULONG) AddRef() { return InterlockedIncrement(&_cRef); }
        IFACEMETHODIMP_(ULONG) Release() {
            ULONG c = InterlockedDecrement(&_cRef);
            if (!c) delete this;
            return c;
        }
        IFACEMETHODIMP CreateInstance(IUnknown* pUnkOuter, REFIID r, void** pp) {
            if (pUnkOuter) return CLASS_E_NOAGGREGATION;
            auto* cmd = new (std::nothrow) GeminiRemoverCommand();
            if (!cmd) return E_OUTOFMEMORY;
            HRESULT hr = cmd->QueryInterface(r, pp);
            cmd->Release();
            return hr;
        }
        IFACEMETHODIMP LockServer(BOOL) { return S_OK; }
    };
    
    auto* pCF = new (std::nothrow) CF();
    if (!pCF) return E_OUTOFMEMORY;
    HRESULT hr = pCF->QueryInterface(riid, ppv);
    pCF->Release();
    return hr;
}

STDAPI DllCanUnloadNow() {
    return g_cDllRef == 0 ? S_OK : S_FALSE;
}

STDAPI DllRegisterServer() { return S_OK; }
STDAPI DllUnregisterServer() { return S_OK; }
