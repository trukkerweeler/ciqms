Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "C:\Users\TimK\Documents\CIQMS3\ciqms3.bat" & Chr(34), 0
Set WshShell = Nothing

'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned
'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser