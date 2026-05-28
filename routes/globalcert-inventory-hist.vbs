' globalcert-inventory-hist.vbs - Query INVENTORY_HIST for cert transactions
' Usage: cscript //Nologo globalcert-inventory-hist.vbs <job> <codeTransaction>
' Example: cscript //Nologo globalcert-inventory-hist.vbs 122361 J52

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
    envPath = CIQMSPath & "\env"  ' Try without extension
    Set file = fso.OpenTextFile(envPath, 1)
End If
If Err.Number <> 0 Then
  MsgBox "Error opening .env file: " & Err.Description
  Err.Clear
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
  MsgBox "Error: DSN, UID, or PWD not found in .env file."
  WScript.Quit
End If

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

' Get arguments from command line
Dim job, codeTransaction, test: test = True
If WScript.Arguments.Count >= 2 Then
  job = WScript.Arguments(0)
  codeTransaction = WScript.Arguments(1)
Else
  If test Then
    job = "122361"
    codeTransaction = "J52"
  Else
    MsgBox "Usage: globalcert-inventory-hist.vbs <job> <codeTransaction>"
    WScript.Quit
  End If
End If

conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
If Err.Number <> 0 Then
  MsgBox "Connection failed: " & Err.Description
  Err.Clear
  WScript.Quit
End If
On Error GoTo 0

If conn.State = 1 Then
  On Error Resume Next
  
  ' Query INVENTORY_HIST for 'in' transactions (CODE_TRANSACTION = 'J52' or specified value)
  ' Suffix-agnostic: returns all suffixes for the given job
  Dim sqlQuery
  sqlQuery = "SELECT " & _
    "DATE_HISTORY, " & _
    "INV_HIST_TIME, " & _
    "QUANTITY, " & _
    "JOB, " & _
    "SUFFIX, " & _
    "PART " & _
    "FROM INVENTORY_HIST " & _
    "WHERE JOB = " & CLng(job) & " " & _
    "AND CODE_TRANSACTION = '" & codeTransaction & "' " & _
    "ORDER BY DATE_HISTORY"
  
  WScript.StdErr.Write "DEBUG SQL: " & sqlQuery & vbCrLf
  
  rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
  If Err.Number <> 0 Then
    WScript.StdErr.Write "ERROR: " & Err.Description & vbCrLf
    Err.Clear
    WScript.StdOut.Write "{""job"":""" & job & """,""data"":[]}"
  ElseIf Not rs.EOF Then
    If Not rs Is Nothing Then
      rs.MoveFirst
    End If
    WScript.StdOut.Write RecordsetToJSON(rs, job)
  Else
    WScript.StdOut.Write "{""job"":""" & job & """,""data"":[]}"
  End If
  On Error GoTo 0
End If

' Clean up resources
If Not rs Is Nothing Then
  If rs.State = 1 Then rs.Close
  Set rs = Nothing
End If
If Not conn Is Nothing Then
  If conn.State = 1 Then conn.Close
  Set conn = Nothing
End If

Function RecordsetToJSON(rs, job)
  Dim field, json, record, data
  If rs.EOF Then
    RecordsetToJSON = "{""job"":""" & job & """,""data"":[]}"
    Exit Function
  End If
  data = "["
  Do Until rs.EOF
    record = "{"
    For Each field In rs.Fields
      record = record & """" & field.Name & """: " & ToJSONValue(field.Value) & ","
    Next
    record = Left(record, Len(record) - 1) ' Remove trailing comma
    record = record & "},"
    data = data & record
    rs.MoveNext
  Loop
  If Right(data, 1) = "," Then
    data = Left(data, Len(data) - 1) ' Remove trailing comma
  End If
  data = data & "]"
  json = "{""job"":""" & job & """,""data"":" & data & "}"
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
