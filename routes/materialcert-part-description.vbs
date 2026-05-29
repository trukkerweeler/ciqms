' materialcert-part-description.vbs - Query part description from GLOBALCERT database
' Arguments: part number
Dim part
part = WScript.Arguments(0)

' Read connection credentials from .env file
Dim conn, rs, fso, dsn, uid, pwd, file, WshShell, DocumentsPath, CIQMSPath
On Error Resume Next

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
DocumentsPath = WshShell.SpecialFolders("MyDocuments")
CIQMSPath = DocumentsPath & "\CIQMS"
If UCase(WshShell.ExpandEnvironmentStrings("%COMPUTERNAME%")) = "QUALITY-MGR" Then
  CIQMSPath = DocumentsPath & "\CIQMS1"
End If

Dim envPath
envPath = CIQMSPath & "\.env"
Set file = fso.OpenTextFile(envPath, 1)
If Err.Number <> 0 Then
    Err.Clear
    envPath = CIQMSPath & "\env"
    Set file = fso.OpenTextFile(envPath, 1)
End If
If Err.Number <> 0 Then
    WScript.Echo "{""error"": ""Could not open .env file""}"
    WScript.Quit 1
End If

dsn = ""
uid = ""
pwd = ""
Do While Not file.AtEndOfStream
  Dim line
  line = Trim(file.ReadLine)
  If Left(line, 11) = "GLOBAL_DSN=" Then
    dsn = Mid(line, 12)
  ElseIf Left(line, 11) = "GLOBAL_UID=" Then
    uid = Mid(line, 12)
  ElseIf Left(line, 11) = "GLOBAL_PWD=" Then
    pwd = Mid(line, 12)
  End If
Loop
file.Close

If dsn = "" Or uid = "" Or pwd = "" Then
    WScript.Echo "{""error"": ""DSN, UID, or PWD not found in .env file""}"
    WScript.Quit 1
End If

' Create ADO connection and recordset
Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

conn.Open dsn, uid, pwd
If Err.Number <> 0 Then
    WScript.Echo "{""error"": ""Database connection failed: " & Err.Description & """}"
    WScript.Quit 1
End If

' Trim the part number and query for description from INVENTORY_MSTR
Dim sql, description, json
part = Trim(part)
sql = "SELECT TOP 1 DESCRIPTION FROM INVENTORY_MSTR WHERE PART = '" & part & "'"

rs.Open sql, conn, 0, 1
If Err.Number <> 0 Then
    WScript.Echo "{""error"": ""Query failed: " & Err.Description & """}"
    rs.Close
    conn.Close
    WScript.Quit 1
End If

' Build JSON response
description = ""
If Not rs.EOF Then
    description = rs("DESCRIPTION")
    If IsNull(description) Then description = ""
End If

json = "{""part"": """ & part & """, ""description"": """ & Replace(description, """", "\""") & """}"
WScript.Echo json

rs.Close
conn.Close
