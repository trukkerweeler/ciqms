' special-process-lookup.vbs - Look up PART and PART_DESCRIPTION from JOB_HEADER by JOB + SUFFIX
' Usage: cscript //Nologo special-process-lookup.vbs <job> <suffix>

Dim conn, rs, fso, dsn, uid, pwd, file, WshShell, DocumentsPath, CIQMSPath
On Error Resume Next

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Prefer process environment variables passed by Node (supports deployed server).
dsn = Trim(WshShell.ExpandEnvironmentStrings("%GLOBAL_DSN%"))
uid = Trim(WshShell.ExpandEnvironmentStrings("%GLOBAL_UID%"))
pwd = Trim(WshShell.ExpandEnvironmentStrings("%GLOBAL_PWD%"))

If dsn = "%GLOBAL_DSN%" Then dsn = ""
If uid = "%GLOBAL_UID%" Then uid = ""
If pwd = "%GLOBAL_PWD%" Then pwd = ""

If dsn = "" Or uid = "" Or pwd = "" Then
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
  WScript.StdOut.Write "{""error"":""Cannot open .env file""}"
  WScript.Quit
End If

dsn = "" : uid = "" : pwd = ""
Do While Not file.AtEndOfStream
  Dim line
  line = Trim(file.ReadLine)
  If Left(line, 11) = "GLOBAL_DSN=" Then dsn = Mid(line, 12)
  If Left(line, 11) = "GLOBAL_UID=" Then uid = Mid(line, 12)
  If Left(line, 11) = "GLOBAL_PWD=" Then pwd = Mid(line, 12)
Loop
file.Close
End If

If dsn = "" Or uid = "" Or pwd = "" Then
  WScript.StdOut.Write "{""error"":""Missing GLOBAL_DSN/UID/PWD in .env""}"
  WScript.Quit
End If

If WScript.Arguments.Count < 2 Then
  WScript.StdOut.Write "{""error"":""job and suffix arguments required""}"
  WScript.Quit
End If

Dim jobNo, suffix
jobNo = Trim(WScript.Arguments(0))
suffix = Trim(WScript.Arguments(1))

Set conn = CreateObject("ADODB.Connection")
conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
If Err.Number <> 0 Then
  WScript.StdOut.Write "{""error"":""DB connection failed: " & Replace(Err.Description, """", "'") & """}"
  WScript.Quit
End If

Dim sql
sql = "SELECT PART, PART_DESCRIPTION FROM JOB_HEADER WHERE JOB = " & CLng(jobNo) & " AND SUFFIX = '" & suffix & "'"

Set rs = CreateObject("ADODB.Recordset")
rs.Open sql, conn, 3, 1
If Err.Number <> 0 Then
  WScript.StdOut.Write "{""error"":""Query failed: " & Replace(Err.Description, """", "'") & """}"
  conn.Close
  WScript.Quit
End If

If rs.EOF Then
  WScript.StdOut.Write "{""error"":""No record found for job " & jobNo & " suffix " & suffix & """}"
Else
  Dim part, partDesc
  part = Trim(rs.Fields("PART").Value & "")
  partDesc = Trim(rs.Fields("PART_DESCRIPTION").Value & "")
  WScript.StdOut.Write "{""part"":""" & Replace(part, """", "'") & """,""description"":""" & Replace(partDesc, """", "'") & """}"
End If

rs.Close
conn.Close
