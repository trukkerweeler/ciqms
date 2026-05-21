'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\CIQMS1\routes\opcodes.vbs

Dim conn
Dim rs
On Error Resume Next

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

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
    WScript.StdOut.Write "{""error"": ""Error: DSN, UID, or PWD not found in .env file.""}"
    WScript.Quit
End If

conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd

If Err.Number <> 0 Then
    ' Write error as JSON instead of MsgBox
    WScript.StdOut.Write "{""error"": ""Connection failed: " & Replace(Err.Description, """", "\""") & """}"
    Err.Clear
    WScript.Quit
End If

On Error GoTo 0

If conn.State = 1 Then
    On Error Resume Next

    Dim sqlQuery
    sqlQuery = "SELECT oc.LMO, oc.MACHINE, oc.OPERATION, oc.DESCRIPTION, ot.TEXT FROM OP_CODES oc left join OPCODE_TEXT ot on oc.LMO = ot.LMO and oc.OPERATION = ot.OPERATION and oc.MACHINE = ot.MACHINE ORDER BY oc.OPERATION;"
    rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
    If Err.Number <> 0 Then
        ' Write error as JSON instead of MsgBox
        WScript.StdOut.Write "{""error"": ""Query failed: " & Replace(Err.Description, """", "\""") & """}"
        Err.Clear
        WScript.Quit
    Else
        ' Output the Recordset as JSON to stdout
        Dim json
        json = RecordsetToJSON(rs)
        WScript.StdOut.Write json
    End If

    On Error GoTo 0
Else
    WScript.StdOut.Write "{""error"": ""Database connection not established""}"
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
    Dim fields, field, json, record, hasRecords, fieldValue
    json = "["
    hasRecords = False
    
    ' Check if recordset is empty
    If rs.EOF Then
        RecordsetToJSON = "[]"
        Exit Function
    End If
    
    Do Until rs.EOF
        hasRecords = True
        record = "{"
        For Each field In rs.Fields
            ' Handle null values
            If IsNull(field.Value) Then
                fieldValue = ""
            Else
                fieldValue = CStr(field.Value)
            End If
            ' Escape quotes and other special characters for JSON
            fieldValue = Replace(fieldValue, "\", "\\")  ' Must be first to avoid double-escaping
            fieldValue = Replace(fieldValue, """", "\""")
            fieldValue = Replace(fieldValue, vbCrLf, "\n")
            fieldValue = Replace(fieldValue, vbCr, "\n")
            fieldValue = Replace(fieldValue, vbLf, "\n")
            fieldValue = Replace(fieldValue, vbTab, "\t")
            
            ' Remove control characters that can break JSON
            Dim i
            For i = 0 To 31
                If i <> 9 And i <> 10 And i <> 13 Then ' Keep tab, LF, CR
                    fieldValue = Replace(fieldValue, Chr(i), "")
                End If
            Next
            
            ' Remove only specific problematic extended ASCII characters, preserve common symbols
            ' Remove DEL and C1 control characters but keep printable extended ASCII
            For i = 127 To 159
                If i <> 176 Then ' Preserve degrees symbol (°) which is Chr(176)
                    fieldValue = Replace(fieldValue, Chr(i), "")
                End If
            Next
            
            ' Ensure degrees symbol is properly encoded for JSON
            fieldValue = Replace(fieldValue, Chr(176), "°")
            
            record = record & """" & field.Name & """: """ & fieldValue & ""","
        Next
        record = Left(record, Len(record) - 1) ' Remove trailing comma
        record = record & "},"
        json = json & record
        rs.MoveNext
    Loop
    
    If hasRecords Then
        json = Left(json, Len(json) - 1) ' Remove trailing comma
    End If
    json = json & "]"
    RecordsetToJSON = json
End Function
