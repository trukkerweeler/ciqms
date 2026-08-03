' operation-jobs-weld-ops.vbs
' Usage: cscript //Nologo operation-jobs-weld-ops.vbs <startDate> <endDateExclusive>
' Returns weld operations completed in the given date window across active + archived operations.

Option Explicit
On Error Resume Next

Dim conn, rs, fso, file, WshShell, DocumentsPath, CIQMSPath
Dim dsn, uid, pwd, startDate, endDate, sqlQuery

If WScript.Arguments.Count < 2 Then
  WScript.StdOut.Write "{""success"":false,""error"":""Usage: operation-jobs-weld-ops.vbs <startDate> <endDateExclusive>""}"
  WScript.Quit 1
End If

startDate = Trim(CStr(WScript.Arguments(0)))
endDate = Trim(CStr(WScript.Arguments(1)))

If Not IsValidDateArg(startDate) Or Not IsValidDateArg(endDate) Then
  WScript.StdOut.Write "{""success"":false,""error"":""Invalid date arguments. Expected YYMMDD or YYYYMMDD.""}"
  WScript.Quit 1
End If

If Len(startDate) <> Len(endDate) Then
  WScript.StdOut.Write "{""success"":false,""error"":""Date arguments must use the same length format.""}"
  WScript.Quit 1
End If

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Prefer credentials passed from Node environment.
dsn = Trim(WshShell.ExpandEnvironmentStrings("%CIQMS_GLOBAL_DSN%"))
uid = Trim(WshShell.ExpandEnvironmentStrings("%CIQMS_GLOBAL_UID%"))
pwd = Trim(WshShell.ExpandEnvironmentStrings("%CIQMS_GLOBAL_PWD%"))

' If env vars are missing, fallback to .env discovery.
If IsMissingEnvValue(dsn, "CIQMS_GLOBAL_DSN") Or _
   IsMissingEnvValue(uid, "CIQMS_GLOBAL_UID") Or _
   IsMissingEnvValue(pwd, "CIQMS_GLOBAL_PWD") Then

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
    WScript.StdOut.Write "{""success"":false,""error"":""Unable to read .env for GLOBAL credentials.""}"
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
End If

If dsn = "" Or uid = "" Or pwd = "" Then
  WScript.StdOut.Write "{""success"":false,""error"":""GLOBAL credentials are missing.""}"
  WScript.Quit 1
End If

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

conn.ConnectionTimeout = 30
conn.CommandTimeout = 180

conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
If Err.Number <> 0 Then
  WScript.StdOut.Write "{""success"":false,""error"":""Connection failed: " & EscapeJSON(Err.Description) & """}"
  WScript.Quit 1
End If
On Error GoTo 0

sqlQuery = _
  "SELECT * FROM (" & _
  "  SELECT 'JOB_OPERATIONS' AS SOURCE_TABLE, " & _
  "    jo.JOB, jo.SUFFIX, jo.SEQ, jo.OPERATION, jo.DESCRIPTION, jo.DATE_COMPLETED, " & _
  "    jo.PART, '' AS PART_DESCRIPTION, '' AS CUSTOMER, jo.ROUTER, jo.UNITS_OPEN, jo.UNITS_COMPLETE, jo.UNITS_SCRAP, jo.LMO " & _
  "  FROM JOB_OPERATIONS jo " & _
  "  WHERE jo.OPERATION IN ('SPOTW','FUSION') " & _
  "    AND jo.DATE_COMPLETED > '" & startDate & "' " & _
  "    AND jo.DATE_COMPLETED < '" & endDate & "' " & _
  "    AND jo.SEQ < 990000 " & _
  " UNION ALL " & _
  "  SELECT 'JOB_HIST_OPS' AS SOURCE_TABLE, " & _
  "    jo.JOB, jo.SUFFIX, jo.SEQ, jo.OPERATION, jo.DESCRIPTION, jo.DATE_COMPLETED, " & _
  "    jo.PART, '' AS PART_DESCRIPTION, '' AS CUSTOMER, jo.ROUTER, jo.UNITS_OPEN, jo.UNITS_COMPLETE, jo.UNITS_SCRAP, jo.LMO " & _
  "  FROM JOB_HIST_OPS jo " & _
  "  WHERE jo.OPERATION IN ('SPOTW','FUSION') " & _
  "    AND jo.DATE_COMPLETED > '" & startDate & "' " & _
  "    AND jo.DATE_COMPLETED < '" & endDate & "' " & _
  "    AND jo.SEQ < 990000 " & _
  ") q"

On Error Resume Next
rs.Open sqlQuery, conn, 3, 1
If Err.Number <> 0 Then
  WScript.StdOut.Write "{""success"":false,""error"":""Query failed: " & EscapeJSON(Err.Description) & """}"
  Cleanup rs, conn
  WScript.Quit 1
End If
On Error GoTo 0

WScript.StdOut.Write "{""success"":true,""rows"":" & RecordsetToJSON(rs) & "}"
Cleanup rs, conn

Sub Cleanup(ByRef rsObj, ByRef connObj)
  On Error Resume Next
  If Not rsObj Is Nothing Then
    If rsObj.State = 1 Then rsObj.Close
    Set rsObj = Nothing
  End If
  If Not connObj Is Nothing Then
    If connObj.State = 1 Then connObj.Close
    Set connObj = Nothing
  End If
  On Error GoTo 0
End Sub

Function RecordsetToJSON(rsObj)
  If rsObj.EOF Then
    RecordsetToJSON = "[]"
    Exit Function
  End If

  Dim json, record, field
  json = "["

  Do Until rsObj.EOF
    record = "{"
    For Each field In rsObj.Fields
      record = record & """" & field.Name & """:" & ToJSONValue(field.Value) & ","
    Next

    If Right(record, 1) = "," Then
      record = Left(record, Len(record) - 1)
    End If
    record = record & "}"

    json = json & record & ","
    rsObj.MoveNext
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

Function IsValidDateArg(str)
  Dim re
  Set re = New RegExp
  re.Pattern = "^[0-9]{6}$|^[0-9]{8}$"
  re.IgnoreCase = True
  re.Global = False
  IsValidDateArg = re.Test(str)
End Function

Function IsMissingEnvValue(val, key)
  IsMissingEnvValue = (val = "" Or val = ("%" & key & "%"))
End Function
