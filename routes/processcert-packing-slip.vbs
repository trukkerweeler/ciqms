' processcert-packing-slip.vbs
' Query ORDER_LINES for jobs linked to a packing slip number
' Usage: cscript //Nologo processcert-packing-slip.vbs <pck_no>

Dim conn, rs, fso, dsn, uid, pwd, file, WshShell, CIQMSPath
On Error Resume Next

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
Dim DocumentsPath
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
  envPath = fso.GetParentFolderName(CIQMSPath) & "\.env"
  Set file = fso.OpenTextFile(envPath, 1)
End If
If Err.Number <> 0 Then
  WScript.StdErr.Write "Error opening .env file: " & Err.Description & vbCrLf
  WScript.Quit
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
  WScript.StdErr.Write "Error: DSN, UID, or PWD not found in .env file." & vbCrLf
  WScript.Quit
End If

If WScript.Arguments.Count = 0 Then
  WScript.StdErr.Write "No packing slip number provided." & vbCrLf
  WScript.Quit
End If

Dim pckNo
pckNo = WScript.Arguments(0)

Set conn = CreateObject("ADODB.Connection")
conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
If Err.Number <> 0 Then
  WScript.StdErr.Write "Connection failed: " & Err.Description & vbCrLf
  WScript.Quit
End If
On Error GoTo 0

Set rs = CreateObject("ADODB.Recordset")
On Error Resume Next

' ORDER_HIST_LOT.INVOICE = packing slip number
' JOB/SUFFIX columns are blank; job is encoded in SERIAL as "122480-000"
Dim sqlQuery
sqlQuery = "SELECT DISTINCT SERIAL FROM ORDER_HIST_LOT " & _
  "WHERE RTRIM(LTRIM(INVOICE)) = '" & pckNo & "' " & _
  "AND SERIAL LIKE '______-___'"

rs.Open sqlQuery, conn, 0, 1

If Err.Number <> 0 Then
  WScript.StdOut.Write "{""success"":false,""error"":""ORDER_LINES query failed: " & Err.Description & """}"
  conn.Close
  WScript.Quit
End If
On Error GoTo 0

Dim jsonStr
jsonStr = "{""success"":true,""pck_no"":""" & pckNo & """,""jobs"":["

Dim first, serialVal, jobVal, suffixVal
first = True
Do While Not rs.EOF
  serialVal = Trim(rs.Fields("SERIAL").Value & "")
  ' Parse "122480-000" → job=122480, suffix=000
  If Len(serialVal) >= 10 And Mid(serialVal, 7, 1) = "-" Then
    jobVal = Left(serialVal, 6)
    suffixVal = Mid(serialVal, 8, 3)
    If Not first Then jsonStr = jsonStr & ","
    jsonStr = jsonStr & "{""job"":""" & jobVal & """,""suffix"":""" & suffixVal & """}"
    first = False
  End If
  rs.MoveNext
Loop

rs.Close
conn.Close

If first Then
  WScript.StdOut.Write "{""success"":false,""error"":""No job serials found for packing slip " & pckNo & """}"
  WScript.Quit
End If

jsonStr = jsonStr & "]}"
WScript.StdOut.Write jsonStr
