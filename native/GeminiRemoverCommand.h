#pragma once
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <shlobj.h>
#include <shobjidl.h>
#include <wrl/client.h>
#include <string>
#include <vector>

// CLSID for GeminiRemoverCommand
// {A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
static const CLSID CLSID_GeminiRemoverCommand = {
    0xa1b2c3d4, 0xe5f6, 0x7890,
    {0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90}
};

class GeminiRemoverCommand :
    public IExplorerCommand,
    public IObjectWithSite
{
public:
    // IUnknown
    IFACEMETHODIMP QueryInterface(REFIID riid, void** ppv) override;
    IFACEMETHODIMP_(ULONG) AddRef() override;
    IFACEMETHODIMP_(ULONG) Release() override;

    // IExplorerCommand
    IFACEMETHODIMP GetTitle(IShellItemArray* psia, LPWSTR* ppszName) override;
    IFACEMETHODIMP GetIcon(IShellItemArray* psia, LPWSTR* ppszIcon) override;
    IFACEMETHODIMP GetToolTip(IShellItemArray* psia, LPWSTR* ppszInfotip) override;
    IFACEMETHODIMP GetCanonicalName(GUID* pguidCommandName) override;
    IFACEMETHODIMP GetState(IShellItemArray* psia, BOOL fOkToBeSlow, EXPCMDSTATE* pCmdState) override;
    IFACEMETHODIMP Invoke(IShellItemArray* psia, IBindCtx* pbc) override;
    IFACEMETHODIMP GetFlags(EXPCMDFLAGS* pFlags) override;
    IFACEMETHODIMP EnumSubCommands(IEnumExplorerCommand** ppEnum) override;

    // IObjectWithSite
    IFACEMETHODIMP SetSite(IUnknown* punkSite) override;
    IFACEMETHODIMP GetSite(REFIID riid, void** ppvSite) override;

private:
    ULONG _cRef = 1;
    Microsoft::WRL::ComPtr<IUnknown> _spunkSite;

    std::wstring GetAppExecutablePath();
    std::vector<std::wstring> CollectFilePaths(IShellItemArray* psia);
    std::wstring BuildJobManifestPath(const std::vector<std::wstring>& paths);
};
