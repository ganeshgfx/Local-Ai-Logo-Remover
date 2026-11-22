Set oShell = CreateObject("WScript.Shell")
Set oFSO = CreateObject("Scripting.FileSystemObject")
Set oEnv = oShell.Environment("Process")

' Clear ELECTRON_RUN_AS_NODE so Electron runs in GUI mode
oEnv.Remove("ELECTRON_RUN_AS_NODE")

Dim appDir
appDir = oFSO.GetParentFolderName(WScript.ScriptFullName)

Dim electronExe
electronExe = appDir & "\node_modules\electron\dist\electron.exe"

Dim args
args = ""
Dim i
For i = 0 To WScript.Arguments.Count - 1
    args = args & " """ & WScript.Arguments(i) & """"
Next

Dim cmd
cmd = """" & electronExe & """ """ & appDir & """" & args

' Run = 0 means hidden window
oShell.Run cmd, 0, False
