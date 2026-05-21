'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\CIQMS1\routes\certpass.vbs

Dim conn
Dim rs
Dim fso
Dim dsn
Dim uid
Dim pwd
Dim file
On Error Resume Next

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
DocumentsPath = WshShell.SpecialFolders("MyDocuments")
CIQMSPath = DocumentsPath & "\CIQMS"
If UCase(WshShell.ExpandEnvironmentStrings("%COMPUTERNAME%")) = "QUALITY-MGR" Then
    CIQMSPath = DocumentsPath & "\CIQMS1"
End If
' WScript.Echo "Full path to CIQMS folder: " & CIQMSPath
Dim envPath
envPath = CIQMSPath & "\.env"
Set file = fso.OpenTextFile(envPath, 1) ' Open the .env file for reading
If Err.Number <> 0 Then
    Err.Clear
    envPath = fso.GetParentFolderName(CIQMSPath) & "\.env"  ' Try parent for production
    Set file = fso.OpenTextFile(envPath, 1) ' Open the .env file for reading
End If
If Err.Number <> 0 Then
    MsgBox "Error opening .env file: " & Err.Description
    Err.Clear
    WScript.Quit
End If
' Read the DSN, UID, and PWD from the .env file
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

' get the arguments from the command line
Dim woId
Dim test: test = True
If WScript.Arguments.Count > 0 Then
    woId = WScript.Arguments(0)
    ' MsgBox "WO ID: " & woId, vbInformation, "certpass.vbs 43"
Else
    If test Then
        woId = "122161-001" ' Example WO ID for testing
    Else
        MsgBox "No WO ID provided."
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
    Dim woParts, woBase, woChild, woSeq
    woParts = Split(woId, "-")
    woBase = woParts(0)
    ' MsgBox "Base WO: " & woBase, vbInformation, "certpass.vbs 34"
    If UBound(woParts) >= 1 Then
        woChild = woParts(1)
        woSeq = woParts(2)
    Else
        woChild = ""
    End If
    Dim sqlQuery
    sqlQuery = "SELECT TOP 1 jd.JOB, jd.SUFFIX, jd.SEQ, jd.DESCRIPTION, " & _
           "ph.PART " & _
           "FROM JOB_DETAIL jd " & _
           "LEFT OUTER JOIN PO_HISTORY ph ON jd.JOB = ph.JOB AND jd.SUFFIX = ph.SUFFIX AND jd.SEQ = ph.SEQUENCE " & _
           "WHERE jd.JOB = '" & woBase & "' AND jd.SUFFIX = '" & woChild & "' " & _
           "AND ph.RECEIVER_NO <> '' " & _
           "AND UPPER(jd.DESCRIPTION) like '%PASS%' " & _
           "ORDER BY jd.SEQ ASC"

    ' MsgBox "SQL Query: " & sqlQuery, vbInformation, "certpass.vbs 85"
    
    rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
    If Err.Number <> 0 Then
        MsgBox "Query failed: " & Err.Description
        Err.Clear
    ElseIf Not rs.EOF Then
        ' Leave the Recordset open for the caller to process
        Set GlobalRecordset = rs ' Assign the Recordset to a global variable
        
        ' Output the Recordset as JSON to stdout for Python to read
        Dim json
        If Not GlobalRecordset Is Nothing Then
            GlobalRecordset.MoveFirst
        End If
        json = RecordsetToJSON(GlobalRecordset)
        WScript.StdOut.Write json

    Else
        ' No records found, so get the DATE_COMPLETED from JOB_OPERATIONS
        Dim completedDate
        sqlQuery = "SELECT DATE_COMPLETED FROM JOB_OPERATIONS WHERE JOB = '" & woBase & "' AND SUFFIX = '" & woChild & "' AND lower(DESCRIPTION) like '%spot%' AND lower(DESCRIPTION) not like '%coupon%' ORDER BY SEQ DESC"
        rs.Close
        rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
        If Not rs.EOF Then
            completedDate = rs.Fields("DATE_COMPLETED").Value
            If Not IsNull(completedDate) Then
                ' Output the completed date as JSON array
                WScript.StdOut.Write "[{""DATE_COMPLETED"": """ & EscapeJSON(CStr(completedDate)) & """}]"
            Else
                WScript.StdOut.Write "[]"
            End If
        Else
            WScript.StdOut.Write "[]"
        End If
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
        record = Left(record, Len(record) - 1) ' Remove trailing comma
        record = record & "},"
        json = json & record
        rs.MoveNext
    Loop
    If Right(json, 1) = "," Then
        json = Left(json, Len(json) - 1) ' Remove trailing comma
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
    str = Replace(str, """", "\""")
    str = Replace(str, "/", "\/")
    str = Replace(str, Chr(8), "\b")
    str = Replace(str, Chr(12), "\f")
    str = Replace(str, Chr(10), "\n")
    str = Replace(str, Chr(13), "\r")
    str = Replace(str, Chr(9), "\t")
    EscapeJSON = str
End Function
