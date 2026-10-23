Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(scriptDir)
launcherJs = fso.BuildPath(scriptDir, "launch-app.js")

nodeExe = "node"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = "C:\Program Files\nodejs\node.exe"
ElseIf fso.FileExists(fso.BuildPath(projectRoot, "desktop-runtime\bin\node.exe")) Then
    nodeExe = fso.BuildPath(projectRoot, "desktop-runtime\bin\node.exe")
End If

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = projectRoot
' WindowStyle 0 = Hidden (no console window)
' bWaitOnReturn True = Wait until launcher checks health and triggers browser, then exit silently
WshShell.Run """" & nodeExe & """ """ & launcherJs & """", 0, True
