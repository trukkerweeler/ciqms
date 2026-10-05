' Return child jobs whose matching suffix-000 parent job is closed.
Dim conn, rs, fso, file, WshShell, DocumentsPath, CIQMSPath
Dim dsn, uid, pwd, line, sqlQuery
On Error Resume Next

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
DocumentsPath = WshShell.SpecialFolders("MyDocuments")
CIQMSPath = DocumentsPath & "\CIQMS"
If UCase(WshShell.ExpandEnvironmentStrings("%COMPUTERNAME%")) = "QUALITY-MGR" Then
  CIQMSPath = DocumentsPath & "\CIQMS1"
End If

Set file = fso.OpenTextFile(CIQMSPath & "\.env", 1)
If Err.Number <> 0 Then
  Err.Clear
  Set file = fso.OpenTextFile(fso.GetParentFolderName(CIQMSPath) & "\.env", 1)
End If
If Err.Number <> 0 Then
  WScript.StdOut.Write "{""error"":""Unable to open .env file""}"
  WScript.Quit 1
End If

Do While Not file.AtEndOfStream
  line = Trim(file.ReadLine)
  If Left(line, 11) = "GLOBAL_DSN=" Then dsn = Mid(line, 12)
  If Left(line, 11) = "GLOBAL_UID=" Then uid = Mid(line, 12)
  If Left(line, 11) = "GLOBAL_PWD=" Then pwd = Mid(line, 12)
Loop
file.Close

If dsn = "" Or uid = "" Or pwd = "" Then
  WScript.StdOut.Write "{""error"":""GLOBAL_DSN, GLOBAL_UID, or GLOBAL_PWD is missing""}"
  WScript.Quit 1
End If

Set conn = CreateObject("ADODB.Connection")
conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
If Err.Number <> 0 Then
  WScript.StdOut.Write "{""error"":""" & EscapeJSON(Err.Description) & """}"
  WScript.Quit 1
End If
On Error GoTo 0

sqlQuery = "SELECT c.JOB AS CHILD_JOB, c.SUFFIX AS CHILD_SUFFIX, " & _
  "c.PART AS CHILD_PART, c.CUSTOMER AS CHILD_CUSTOMER, " & _
  "c.QTY_ORDER AS CHILD_QTY_ORDER, c.QTY_COMPLETED AS CHILD_QTY_COMPLETED, " & _
  "c.DATE_OPENED AS CHILD_DATE_OPENED, c.DATE_DUE AS CHILD_DATE_DUE, " & _
  "c.DATE_CLOSED AS CHILD_DATE_CLOSED, " & _
  "p.JOB AS PARENT_JOB, p.SUFFIX AS PARENT_SUFFIX, " & _
  "p.PART AS PARENT_PART, p.DATE_CLOSED AS PARENT_DATE_CLOSED " & _
  "FROM JOB_HEADER c INNER JOIN JOB_HEADER p " & _
  "ON c.JOB = p.JOB AND RTRIM(p.SUFFIX) = '000' " & _
  "WHERE RTRIM(c.SUFFIX) <> '000' " & _
  "AND (c.DATE_CLOSED IS NULL OR RTRIM(c.DATE_CLOSED) = '' OR " & _
  "c.DATE_CLOSED IN ('0', '000000', '00000000')) " & _
  "AND p.DATE_CLOSED IS NOT NULL AND RTRIM(p.DATE_CLOSED) <> '' " & _
  "AND p.DATE_CLOSED NOT IN ('0', '000000', '00000000') " & _
  "ORDER BY c.JOB, c.SUFFIX"

Set rs = conn.Execute(sqlQuery)
If Err.Number <> 0 Then
  WScript.StdOut.Write "{""error"":""" & EscapeJSON(Err.Description) & """}"
  conn.Close
  WScript.Quit 1
End If

WScript.StdOut.Write RecordsetToJSON(rs)
rs.Close
conn.Close

Function EscapeJSON(value)
  EscapeJSON = Replace(Replace(Replace(CStr(value), "\", "\\"), """", "\"""), _
    vbCrLf, "\n")
End Function

Function RecordsetToJSON(recordset)
  Dim field, value, record, result
  result = "["
  Do Until recordset.EOF
    record = "{"
    For Each field In recordset.Fields
      value = field.Value
      record = record & """" & field.Name & """:"
      If IsNull(value) Then
        record = record & "null,"
      Else
        record = record & """" & EscapeJSON(value) & ""","
      End If
    Next
    record = Left(record, Len(record) - 1) & "},"
    result = result & record
    recordset.MoveNext
  Loop
  If Right(result, 1) = "," Then result = Left(result, Len(result) - 1)
  RecordsetToJSON = result & "]"
End Function
