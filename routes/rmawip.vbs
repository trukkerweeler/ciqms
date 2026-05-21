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
Dim rmaid
If WScript.Arguments.Count > 0 Then
    rmaid = WScript.Arguments(0)
    ' MsgBox "RMA ID: " & rmaid
Else
    MsgBox "No RMA ID provided."
    WScript.Quit
End If

conn.Open "DSN="& dsn &";UID="& uid &";PWD="& pwd &""

If Err.Number <> 0 Then
    MsgBox "Connection failed: " & Err.Description
    Err.Clear
    WScript.Quit
End If

On Error GoTo 0

If conn.State = 1 Then
    On Error Resume Next

    Dim sqlQuery
    sqlQuery = "SELECT L.RMA_ID, L.RMA_LINE, L.PART, L.PART_DESCRIPTION, " & _
        "req.TEXT AS REQ_TEXT, rlhn.TEXT AS PRF_TEXT, " & _
        "H.CUSTOMER, H.NAME_CUSTOMER, H.CUSTOMER_PO, H.DATE_ISSUED " & _
        "FROM RMA_LINES AS L " & _
        "LEFT JOIN RMA_HEADER AS H ON L.RMA_ID = H.RMA_ID AND H.REC_TYPE = 'H' " & _
        "LEFT JOIN RMA_LN_SVPF_NOTES AS rlhn ON L.RMA_ID = rlhn.RMA_ID AND L.RMA_LINE = rlhn.LINE " & _
        "LEFT JOIN RMA_LN_SVRQ_NOTES AS req ON L.RMA_ID = req.RMA_ID AND L.RMA_LINE = req.LINE " & _
        "WHERE L.REC_TYPE = 'L' " & _
        "and L.RMA_ID = '" & rmaid & "' " & _
        "ORDER BY L.RMA_LINE"

    rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
    If Err.Number <> 0 Then
        MsgBox "Query failed: " & Err.Description
        Err.Clear
    ElseIf Not rs.EOF Then
    rs.MoveFirst
        ' Leave the Recordset open for the caller to process
        Set GlobalRecordset = rs ' Assign the Recordset to a global variable
        Dim json

        json = RecordsetToJSON(GlobalRecordset)

        ' MsgBox json, vbInformation, "RMA Lines JSON Output - 84"
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
    Dim fields, field, json, record, fieldValue
    json = "["
    Do Until rs.EOF
        record = "{"
        For Each field In rs.Fields
            fieldValue = field.Value
            If Not IsNull(fieldValue) Then
                fieldValue = Replace(fieldValue, Chr(34), "\" & Chr(34))
            Else
                fieldValue = ""
            End If
            record = record & """" & field.Name & """: """ & fieldValue & ""","
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




' [{"RMA_ID": "0001172","RMA_LINE": "000001","PART": "BACP10U0787VC    AC ","PART_DESCRIPTION": "PANEL ASSY, FILLER OR CONTROL ","REQ_TEXT": "****CUSTOMER STATES "N" DIMENSION IS OFF ON PART.  RETURN FOR INSPECTION AND DISPOSITION****","PRF_TEXT": "","CUSTOMER": "DRSLAU","NAME_CUSTOMER": "DRS MARITIME SYSTEMS & SERVICE","CUSTOMER_PO": "26P0025827     ","DATE_ISSUED": "20250610"}]