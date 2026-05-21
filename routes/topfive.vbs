' Top 5 Customers by Invoice Count (Last 365 Days)
' Connects to Global_CII database and returns aggregated customer data

Dim conn, rs, fso, dsn, uid, pwd, file, WshShell, DocumentsPath, CIQMSPath
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
Set file = fso.OpenTextFile(envPath, 1)
If Err.Number <> 0 Then
    Err.Clear
    envPath = fso.GetParentFolderName(CIQMSPath) & "\.env"  ' Try parent for production
    Set file = fso.OpenTextFile(envPath, 1)
End If
If Err.Number <> 0 Then
    WScript.StdOut.Write "{""error"":""Error opening .env file: " & Err.Description & """}"
    Err.Clear
    WScript.Quit
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

If dsn = "" Or uid = "" Or pwd = "" Then
    WScript.StdOut.Write "{""error"":""DSN, UID, or PWD not found in .env file""}"
    WScript.Quit
End If

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd

If Err.Number <> 0 Then
    WScript.StdOut.Write "{""error"":""Connection failed: " & Err.Description & """}"
    Err.Clear
    WScript.Quit
End If

On Error GoTo 0

If conn.State = 1 Then
    On Error Resume Next

    ' Query to get top 5 customers by invoice count in the last 365 days
    ' Join with V_CUSTOMER_MASTER to get customer names (REC = 1 for primary record)
    ' DATE_INVOICE is in MMDDYY format - we'll get recent years (25, 26 for 2025-2026)
    Dim sqlQuery
    sqlQuery = "SELECT TOP 5 " & _
               "AR_OPEN_ITEMS.CUSTOMER + ' - ' + ISNULL(V_CUSTOMER_MASTER.NAME_CUSTOMER, 'Unknown') AS CUSTOMER, " & _
               "V_CUSTOMER_MASTER.ADDRESS1, " & _
               "V_CUSTOMER_MASTER.CITY, " & _
               "V_CUSTOMER_MASTER.STATE, " & _
               "V_CUSTOMER_MASTER.TELEPHONE, " & _
               "COUNT(AR_OPEN_ITEMS.INVOICE) AS INVOICE_COUNT, " & _
               "SUM(AR_OPEN_ITEMS.AMT_INVOICE) AS TOTAL_AMOUNT " & _
               "FROM AR_OPEN_ITEMS " & _
               "LEFT JOIN V_CUSTOMER_MASTER ON AR_OPEN_ITEMS.CUSTOMER = V_CUSTOMER_MASTER.CUSTOMER AND V_CUSTOMER_MASTER.REC = 1 " & _
               "WHERE (RIGHT(AR_OPEN_ITEMS.DATE_INVOICE, 2) = '25' OR RIGHT(AR_OPEN_ITEMS.DATE_INVOICE, 2) = '26') " & _
               "AND AR_OPEN_ITEMS.CUSTOMER NOT IN ('LACH01', 'LILU01') " & _
               "GROUP BY AR_OPEN_ITEMS.CUSTOMER, V_CUSTOMER_MASTER.NAME_CUSTOMER, V_CUSTOMER_MASTER.ADDRESS1, V_CUSTOMER_MASTER.CITY, V_CUSTOMER_MASTER.STATE, V_CUSTOMER_MASTER.TELEPHONE " & _
               "ORDER BY INVOICE_COUNT DESC"

    rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
    If Err.Number <> 0 Then
        WScript.StdOut.Write "{""error"":""Query failed: " & Err.Description & """}"
        Err.Clear
    ElseIf Not rs.EOF Then
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

Function RecordsetToJSON(rs)
    Dim fields, field, json, record
    json = "["
    Do Until rs.EOF
        record = "{"
        For Each field In rs.Fields
            Dim fieldValue
            fieldValue = field.Value
            ' Handle NULL values
            If IsNull(fieldValue) Then
                record = record & """" & field.Name & """: null,"
            Else
                ' Escape quotes and handle special characters
                fieldValue = Replace(fieldValue, "\", "\\")
                fieldValue = Replace(fieldValue, """", "\""")
                fieldValue = Replace(fieldValue, vbCrLf, "\n")
                record = record & """" & field.Name & """: """ & fieldValue & ""","
            End If
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
