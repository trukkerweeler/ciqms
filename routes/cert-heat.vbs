
' cert-heat.vbs - Query DB for heat treating process
' Usage: cscript //Nologo cert-heat.vbs <baseWorkorder>

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
    envPath = fso.GetParentFolderName(CIQMSPath) & "\.env"  ' Try parent for production
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

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

Dim baseWorkorder
If WScript.Arguments.Count > 0 Then
  baseWorkorder = WScript.Arguments(0)
Else
  WScript.StdErr.Write "No baseWorkorder provided." & vbCrLf
  WScript.Quit
End If

conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
If Err.Number <> 0 Then
  WScript.StdErr.Write "Connection failed: " & Err.Description & vbCrLf
  WScript.Quit
End If
On Error GoTo 0

If conn.State = 1 Then
  On Error Resume Next
  Dim sqlQuery
  sqlQuery = "SELECT DISTINCT " & _
    "vrl.ROUTER, vjo.JOB, vjo.SUFFIX, vjd.REFERENCE, vjo.DATE_COMPLETED, vrl.OPERATION, vjo.DESCRIPTION " & _
    "FROM V_ITEM_HISTORY vih " & _
    "JOIN V_ROUTER_LINE vrl ON vrl.ROUTER = vih.PART " & _
    "JOIN V_JOB_OPERATIONS vjo ON CAST(vjo.ROUTER_SEQ AS INTEGER) BETWEEN CAST(vrl.LINE_ROUTER AS INTEGER) AND CAST(vrl.LINE_ROUTER AS INTEGER) + 99 " & _
    "JOIN V_JOB_DETAIL vjd ON vjd.JOB = vjo.JOB AND vjd.SUFFIX = vjo.SUFFIX AND vjd.SEQ = vjo.SEQ " & _
    "WHERE vih.JOB = " & baseWorkorder & " " & _
    "AND vih.SERIAL_NUMBER LIKE '______-___' " & _
    "AND vjo.JOB = CAST(SUBSTRING(vih.SERIAL_NUMBER, 1, 6) AS INTEGER) " & _
    "AND vjo.SUFFIX = CAST(SUBSTRING(vih.SERIAL_NUMBER, 8, 3) AS INTEGER) " & _
    "AND (vrl.OPERATION = 'HEAT' OR vrl.OPERATION = '6061') " & _
    "AND vjd.REFERENCE IS NOT NULL"

  rs.Open sqlQuery, conn, 3, 1
  If Err.Number <> 0 Then
    WScript.StdErr.Write "ERROR: " & Err.Description & vbCrLf
    WScript.StdOut.Write "[]"
  ElseIf Not rs.EOF Then
    rs.MoveFirst
    WScript.StdOut.Write RecordsetToJSON(rs)
  Else
    WScript.StdOut.Write "[]"
  End If
  On Error GoTo 0
End If

If Not rs Is Nothing Then
  If rs.State = 1 Then rs.Close
  Set rs = Nothing
End If
If Not conn Is Nothing Then
  If conn.State = 1 Then conn.Close
  Set conn = Nothing
End If

Function RecordsetToJSON(rs)
  Dim field, json, record
  If rs.EOF Then
    RecordsetToJSON = "[]"
    Exit Function
  End If
  json = "["
  Do Until rs.EOF
    record = "{"
    For Each field In rs.Fields
      record = record & """" & field.Name & """: " & ToJSONValue(field.Value) & ","
    Next
    record = Left(record, Len(record) - 1)
    record = record & "},"
    json = json & record
    rs.MoveNext
  Loop
  If Right(json, 1) = "," Then
    json = Left(json, Len(json) - 1)
  End If
  json = json & "]"
  RecordsetToJSON = json
End Function

Function ToJSONValue(val)
  If IsNull(val) Then
    ToJSONValue = "null"
  Else
    ToJSONValue = """" & EscapeJSON(CStr(val)) & """"
  End If
End Function

Function EscapeJSON(str)
  str = Replace(str, "\", "\\")
  str = Replace(str, """", """""")
  str = Replace(str, "/", "\/")
  str = Replace(str, Chr(8), "\b")
  str = Replace(str, Chr(12), "\f")
  str = Replace(str, Chr(10), "\n")
  str = Replace(str, Chr(13), "\r")
  str = Replace(str, Chr(9), "\t")
  EscapeJSON = str
End Function
