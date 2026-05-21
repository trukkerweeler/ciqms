'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\RMA\routes\rmahistory.vbs

Dim conn
Dim rs
Dim fso
Dim dsn
Dim uid
Dim pwd
Dim file
On Error Resume Next

' Define functions first
Function EscapeJSON(str)
    Dim result
    result = str
    result = Replace(result, "\", "\\")
    result = Replace(result, """", "\""")
    result = Replace(result, vbCrLf, "\n")
    result = Replace(result, vbCr, "\n")
    result = Replace(result, vbLf, "\n")
    result = Replace(result, vbTab, "\t")
    EscapeJSON = result
End Function

Function RecordsetToJSON(rs)
    Dim fields, field, json, record, fieldCount, recordCount
    json = "["
    recordCount = 0
    Do Until rs.EOF
        recordCount = recordCount + 1
        record = "{"
        fieldCount = 0
        On Error Resume Next
        For Each field In rs.Fields
            fieldCount = fieldCount + 1
            record = record & """" & field.Name & """: """ & EscapeJSON(CStr(field.Value)) & ""","
        Next
        On Error GoTo 0
        if fieldCount > 0 then
            record = Left(record, Len(record) - 1) ' Remove trailing comma
        end if
        record = record & "},"
        json = json & record
        rs.MoveNext
    Loop
    If recordCount > 0 Then
        json = Left(json, Len(json) - 1) ' Remove trailing comma
    End If
    json = json & "]"
    RecordsetToJSON = json
End Function

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
    WScript.StdOut.Write "[{""error"": ""Error opening .env file: " & EscapeJSON(Err.Description) & """}]"
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
    WScript.StdOut.Write "[{""error"": ""DSN, UID, or PWD not found in .env file.""}]"
    WScript.Quit
End If

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")
' get the arguments from the command line
Dim rmaid
If WScript.Arguments.Count > 0 Then
    rmaid = WScript.Arguments(0)
    ' WScript.StdOut.Write "RMA ID: " & rmaid
Else
    WScript.StdOut.Write "[{""error"": ""No RMA ID provided.""}]"
    WScript.Quit
End If

conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd

If Err.Number <> 0 Then
    WScript.StdOut.Write "[{""error"": ""Connection failed: " & EscapeJSON(Err.Description) & """}]"
    Err.Clear
    WScript.Quit
End If

If conn.State = 1 Then
    On Error Resume Next

    Dim sqlQuery
    sqlQuery = "SELECT L.RMA_ID, L.RMA_LINE, L.PART, L.PART_DESCRIPTION, " & _
        "req.TEXT AS REQ_TEXT, rlhn.TEXT AS PRF_TEXT, " & _
        "H.CUSTOMER, H.NAME_CUSTOMER, H.CUSTOMER_PO, H.DATE_ISSUED " & _
        "FROM RMA_HIST_LINES AS L " & _
        "LEFT JOIN RMA_HIST_HEADER AS H ON L.RMA_ID = H.RMA_ID AND H.REC_TYPE = 'H' " & _
        "LEFT JOIN RMA_LNSVPF_H_NOTE AS rlhn ON L.RMA_ID = rlhn.RMA_ID AND L.RMA_LINE = rlhn.LINE " & _
        "LEFT JOIN RMA_LNSVRQ_H_NOTE AS req ON L.RMA_ID = req.RMA_ID AND L.RMA_LINE = req.LINE " & _
        "WHERE L.REC_TYPE = 'L' " & _
        "and L.RMA_ID = '" & rmaid & "' " & _
        "ORDER BY L.RMA_LINE"

    rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
    If Err.Number <> 0 Then
        WScript.StdOut.Write "[{""error"": ""Query failed: " & EscapeJSON(Err.Description) & """}]"
        Err.Clear
    ElseIf Not rs.EOF Then
        ' Move to first record
        rs.MoveFirst
        ' Output the Recordset as JSON to stdout
        Dim json
        json = RecordsetToJSON(rs)
        WScript.StdOut.Write json
        
    Else
        WScript.StdOut.Write "[]"
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


