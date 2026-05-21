'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\RMA\routes\rmawip.vbs

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

conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd

If Err.Number <> 0 Then
    MsgBox "Connection failed: " & Err.Description
    Err.Clear
    WScript.Quit
End If

On Error GoTo 0

If conn.State = 1 Then
    On Error Resume Next

    Dim sqlQuery
    sqlQuery = "SELECT DATE_BATCH, BATCH_CODE, BATCH_NUM, DATE_CHECK, CHECK_NUM, DATE_INVOICE, DATE_INVOICE_DUE, GL_ACCOUNT, INVOICE, PURCHASE_ORDER, vm.VENDOR, vm.NAME_VENDOR, AMT_INVOICE, AMT_TRANSACTION FROM AP_OPEN_ITEMS LEFT JOIN VENDOR_MASTER vm ON AP_OPEN_ITEMS.VENDOR = vm.VENDOR AND vm.REC = '1' WHERE RIGHT(DATE_BATCH, 2) > '22' AND GL_ACCOUNT > '199' ORDER BY RIGHT(DATE_BATCH, 2) DESC, LEFT(DATE_BATCH, 2) DESC, SUBSTRING(DATE_BATCH, 3, 2) DESC, BATCH_NUM DESC"

    rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
    If Err.Number <> 0 Then
        MsgBox "Query failed: " & Err.Description
        Err.Clear
    ElseIf Not rs.EOF Then
        ' Leave the Recordset open for the caller to process
        Set GlobalRecordset = rs ' Assign the Recordset to a global variable

        ' Output the Recordset as JSON to stdout for Python to read
        Dim json
        json = RecordsetToJSON(GlobalRecordset)
        ' MsgBox json, vbInformation, "JSON Output"
        WScript.StdOut.Write json
        
    Else
        MsgBox "No records found."
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
    Dim fields, field, json, record
    json = "["
    Do Until rs.EOF
        record = "{"
        For Each field In rs.Fields
            record = record & """" & field.Name & """: """ & field.Value & ""","
        Next
        record = Left(record, Len(record) - 1) ' Remove trailing comma
        record = record & "},"
        json = json & record
        rs.MoveNext
    Loop
    json = Left(json, Len(json) - 1) ' Remove trailing comma
    json = json & "]"
    RecordsetToJSON = json
End Function


