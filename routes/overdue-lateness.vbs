' Return open JOB_HEADER rows with a due date for the overdue-lateness report.
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

sqlQuery = "SELECT JOB, SUFFIX, PART, CUSTOMER, SALES_ORDER, SALES_ORDER_LINE, " & _
  "QTY_ORDER, QTY_COMPLETED, DATE_OPENED, DATE_DUE, DATE_CLOSED " & _
  "FROM JOB_HEADER " & _
  "WHERE DATE_DUE IS NOT NULL AND RTRIM(DATE_DUE) <> '' " & _
  "AND (DATE_CLOSED IS NULL OR RTRIM(DATE_CLOSED) = '' OR " & _
  "DATE_CLOSED IN ('0', '000000', '00000000'))"

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
