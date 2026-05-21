'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\RMA\routes\rmawip.vbs

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
' MsgBox "Full path to CIQMS folder: " & CIQMSPath
Dim envPath
envPath = CIQMSPath & "\.env"
Set file = fso.OpenTextFile(envPath, 1) ' Open the .env file for reading
If Err.Number <> 0 Then
    Err.Clear
    envPath = fso.GetParentFolderName(CIQMSPath) & "\.env"  ' Try parent for production
    Set file = fso.OpenTextFile(envPath, 1) ' Open the .env file for reading
End If
If Err.Number <> 0 Then
    WScript.StdOut.Write "{\"error\":\"Error opening .env file\"}"
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
    WScript.StdOut.Write "{\"error\":\"DSN, UID, or PWD not found in .env file\"}"
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
    WScript.StdOut.Write "{\"error\":\"No WO ID provided\"}"
    WScript.Quit
End If

conn.Open "DSN=Global_CII;UID=tkent;PWD=A1rplane"

If Err.Number <> 0 Then
    WScript.StdOut.Write "{\"error\":\"Connection failed\"}"
    Err.Clear
    WScript.Quit
End If

On Error GoTo 0

If conn.State = 1 Then
    On Error Resume Next

    Dim sqlQuery
    ' sqlQuery = "SELECT * from ITEM_HISTORY WHERE JOB = " & woId
    ' sqlQuery = "SELECT JOB, SUFFIX, PART, PURCHASE_ORDER, PO_LINE, QUANTITY, SERIAL_NUMBER, SEQUENCE from ITEM_HISTORY WHERE JOB = " & woId
    sqlQuery = "SELECT v.*, im.PRODUCT_LINE, jh.PART as PART2, jh.CUSTOMER, jh.CUSTOMER_PO " & _
               "FROM V_ITEM_HISTORY v " & _
               "LEFT OUTER JOIN INVENTORY_MSTR im ON v.PART = im.PART " & _
               "LEFT OUTER JOIN JOB_HEADER jh ON v.JOB = jh.JOB AND v.SUFFIX = jh.SUFFIX " & _
               "WHERE v.JOB = '" & woId & "' "

    ' MsgBox "SQL Query: " & sqlQuery, vbInformation, "cert.vbs 34"

    rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
    If Err.Number <> 0 Then
        WScript.StdOut.Write "{\"error\":\"Query failed\"}"
        Err.Clear
    ElseIf Not rs.EOF Then
        ' Leave the Recordset open for the caller to process
        Set GlobalRecordset = rs ' Assign the Recordset to a global variable

        ' Output the Recordset as JSON to stdout for Python to read
        Dim json
        json = RecordsetToJSON(GlobalRecordset)
        ' MsgBox json
        WScript.StdOut.Write json
        
    Else
        ' No records found - output empty array
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


