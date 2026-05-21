'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\CIQMS1\routes\cert2.vbs

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
If WScript.Arguments.Count > 0 Then
    woId = WScript.Arguments(0)
    ' MsgBox "RMA ID: " & woId
Else
    woId = "122246" ' Default value for testing
    MsgBox "No WO ID provided, using default: " & woId
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
    ' sqlQuery = "SELECT * from ITEM_HISTORY WHERE JOB = " & woId
    ' sqlQuery = "SELECT JOB, SUFFIX, PART, PURCHASE_ORDER, PO_LINE, QUANTITY, SERIAL_NUMBER, SEQUENCE from ITEM_HISTORY WHERE JOB = " & woId
    ' BIN, CODE_TRANSACTION, COST, DATE_ACTION, DATE_HISTORY, DESCRIPTION, JOB, PART, PRODUCT_LINE, PROGRAM_USED, PURCHASE_ORDER, QUANTITY, RECEIVER, SEQUENCE, SERIAL_NUMBER, SUFFIX, USER_ID
    sqlQuery = "SELECT ih.BIN, ih.CODE_TRANSACTION, ih.COST, ih.DATE_ACTION, ih.DATE_HISTORY, ih.JOB, ih.PART, " & _
               "im.PRODUCT_LINE, ih.PROGRAM_USED, ih.PURCHASE_ORDER, ih.QUANTITY, ih.RECEIVER, ih.SEQUENCE, ih.SERIAL_NUMBER, ih.SUFFIX, ih.USERID, " & _
               "jh.PART as PART2, jh.CUSTOMER_PO " & _
               "FROM ITEM_HISTORY ih " & _
               "LEFT OUTER JOIN INVENTORY_MSTR im ON ih.PART = im.PART " & _
               "LEFT OUTER JOIN JOB_HEADER jh ON ih.JOB = jh.JOB AND ih.SUFFIX = jh.SUFFIX " & _
               "WHERE ih.JOB = '" & woId & "' AND im.PRODUCT_LINE != 'HW' AND ih.SEQUENCE != '999999'"

    ' MsgBox "SQL Query: " & sqlQuery, vbInformation, "cert.vbs 34"

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
        ' MsgBox json, vbInformation, "cert.vbs 83"
        WScript.StdOut.Write json
        
    Else
        ' MsgBox "No records found.", vbInformation, "No Records cert.vbs 101"
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


