'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\RMA\routes\receiver.vbs

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
Dim envPath
envPath = CIQMSPath & "\.env"
Set file = fso.OpenTextFile(envPath, 1) ' Open the .env file for reading
If Err.Number <> 0 Then
    Err.Clear
    envPath = fso.GetParentFolderName(CIQMSPath) & "\.env"  ' Try parent for production
    Set file = fso.OpenTextFile(envPath, 1) ' Open the .env file for reading
End If
If Err.Number <> 0 Then
    WScript.StdOut.Write "{\"error\":\"Error opening .env file: " & Err.Description & "\"}
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
Dim woBase
Dim woChild
Dim woSeq
Dim test: test = True
If WScript.Arguments.Count > 0 Then
    woBase = WScript.Arguments(0)
    woChild = WScript.Arguments(1)
    woSeq = WScript.Arguments(2)
    ' MsgBox "WO ID: " & woId, vbInformation, "receiver.vbs 42"
Else
    If test Then
        woBase = "122203" ' Example WO ID for testing
        woChild = "001"
        woSeq = "001200"

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
    Dim woParts
    'MsgBox "Base WO: " & woBase & vbCrLf & "Child: " & woChild & vbCrLf & "Seq: " & woSeq, vbInformation, "receiver.vbs 73"
    
    Dim sqlQuery
    Dim resultsArray, json, hasData
    Set resultsArray = CreateObject("Scripting.Dictionary")
    hasData = False

    sqlQuery = "SELECT TOP 1 jo.JOB, jo.SUFFIX, jo.SEQ AS CURRENT_SEQ, jo.DESCRIPTION, " & _
               "jo.ROUTER, jo.ROUTER_SEQ, jo.DATE_COMPLETED, " & _
               "ph.PURCHASE_ORDER AS NEXT_PURCHASE_ORDER, ph.RECEIVER_NO, " & _
               "rl.OPERATION, rl.DESC_RT_LINE " & _
               "FROM JOB_OPERATIONS jo " & _
               "LEFT JOIN ROUTER_LINE rl " & _
               "  ON jo.ROUTER = rl.ROUTER AND jo.ROUTER_SEQ = rl.LINE_ROUTER " & _
               "LEFT JOIN PO_HISTORY ph " & _
               "  ON ph.JOB = jo.JOB " & _
               "     AND ph.SUFFIX = jo.SUFFIX " & _
               "     AND ph.SEQUENCE = ( " & _
               "         SELECT MIN(jo2.SEQ) " & _
               "         FROM JOB_OPERATIONS jo2 " & _
               "         WHERE jo2.JOB = jo.JOB " & _
               "           AND jo2.SUFFIX = jo.SUFFIX " & _
               "           AND jo2.SEQ > jo.SEQ " & _
               "     ) " & _
               "WHERE jo.JOB = '" & woBase & "' " & _
               "  AND jo.SUFFIX = '" & woChild & "' " & _
               "  AND jo.ROUTER_SEQ = '" & woSeq & "'"

    rs.Open sqlQuery, conn, 3, 1
    If Err.Number <> 0 Then
        MsgBox "SQL Query failed: " & Err.Description
        Err.Clear
    ElseIf Not rs.EOF Then
        ' Leave the Recordset open for the caller to process
        Set GlobalRecordset = rs ' Assign the Recordset to a global variable

        ' Output the Recordset as JSON to stdout for Python to read
        ' Dim json
        json = RecordsetToJSON(GlobalRecordset)
        ' MsgBox json
        WScript.StdOut.Write json
    End If
    rs.Close

    
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
        WScript.StdOut.WriteLine "[]"
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
