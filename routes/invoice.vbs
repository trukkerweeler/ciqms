'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\RMA\routes\rmawip.vbs

Dim conn
Dim rs
On Error Resume Next

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

conn.Open "DSN=Global_CII;UID=tkent;PWD=A1rplane"

If Err.Number <> 0 Then
    MsgBox "Connection failed: " & Err.Description
    Err.Clear
    WScript.Quit
End If

On Error GoTo 0

If conn.State = 1 Then
    On Error Resume Next

    Dim sqlQuery
    ' sqlQuery = "SELECT INVOICE, CUSTOMER, BATCH_NUM, BATCH_LINE, DATE_INVOICE, DATE_TRANSACTION, " & _
    '            "AMT_TRANS_TOTAL, DATE_INVOICE, GL_ACCOUNT, ORDER_NO, ORDER_SUFFIX " & _
    '            "FROM AR_OPEN_ITEMS " & _
    '            "WHERE RIGHT(DATE_INVOICE, 2) > '21' " & _
    '            "ORDER BY RIGHT(DATE_INVOICE, 2) DESC, " & _
    '            "LEFT(DATE_INVOICE, 2) DESC, " & _
    '            "SUBSTRING(DATE_INVOICE, 3, 2) DESC, " & _
    '            "BATCH_NUM DESC"

     sqlQuery = "SELECT INVOICE, CUSTOMER, BATCH_NUM, BATCH_LINE, DATE_INVOICE, DATE_TRANSACTION, " & _
               "AMT_INVOICE, DATE_INVOICE, GL_ACCOUNT, ORDER_NO, ORDER_SUFFIX " & _
               "FROM AR_OPEN_ITEMS " & _
               "WHERE RIGHT(DATE_INVOICE, 2) > '21' " & _
               "AND LEFT(BATCH_NUM, 1) = 'S' " & _
               "ORDER BY RIGHT(DATE_INVOICE, 2) DESC, " & _
               "LEFT(DATE_INVOICE, 2) DESC, " & _
               "SUBSTRING(DATE_INVOICE, 3, 2) DESC, " & _
               "BATCH_NUM DESC"

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


