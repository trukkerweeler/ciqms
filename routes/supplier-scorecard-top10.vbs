' Top 10 Suppliers by Weighted Score (2025)
' Connects to Global_CII database and calculates supplier performance metrics

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
    envPath = fso.GetParentFolderName(CIQMSPath) & "\.env"
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

    Dim sqlQuery
    ' sqlQuery = "SELECT TOP 50 " & _
    '            "V_POHIST_LINES.VENDOR, " & _
    '            "MAX(V_VENDOR_MASTER.NAME_VENDOR) AS NAME_VENDOR, " & _
    '            "SUM(EXTENSION) AS TOTAL_SPEND, " & _
    '            "COUNT(DISTINCT PURCHASE_ORDER) AS PO_COUNT, " & _
    '            "COUNT(*) AS LINE_COUNT, " & _
    '            "SUM(CASE WHEN DATE_LAST_RECEIVED <= DATE_DUE_LINE THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS ON_TIME_PERCENT " & _
    '            "FROM V_POHIST_LINES " & _
    '            "LEFT JOIN V_VENDOR_MASTER ON V_POHIST_LINES.VENDOR = V_VENDOR_MASTER.VENDOR AND V_VENDOR_MASTER.REC = 1 " & _
    '            "WHERE PART NOT IN ('FEE','FEE #2','SURCHARGE','INSPECT','CERTIFICATION','FREIGHT','EXPEDITE FEE','CC FEE','INSPECTION','MISSED PAYMENT','TAX') " & _
    '            "AND DATE_DUE_LINE >= {d'2025-01-01'} AND DATE_DUE_LINE <= {d'2025-12-31'} " & _
    '            "GROUP BY V_POHIST_LINES.VENDOR " & _
    '            "ORDER BY SUM(EXTENSION) DESC"

    sqlQuery = "SELECT TOP 50 " & _
           "V_POHIST_LINES.VENDOR, " & _
           "MAX(V_VENDOR_MASTER.NAME_VENDOR) AS NAME_VENDOR, " & _
           "SUM(EXTENSION) AS TOTAL_SPEND, " & _
           "COUNT(DISTINCT PURCHASE_ORDER) AS PO_COUNT, " & _
           "COUNT(*) AS LINE_COUNT, " & _
           "SUM(CASE WHEN DATE_LAST_RECEIVED <= DATE_DUE_LINE THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS ON_TIME_PERCENT " & _
           "FROM V_POHIST_LINES " & _
           "LEFT JOIN V_VENDOR_MASTER ON V_POHIST_LINES.VENDOR = V_VENDOR_MASTER.VENDOR AND V_VENDOR_MASTER.REC = 1 " & _
           "WHERE PART NOT IN ('FEE','FEE #2','SURCHARGE','INSPECT','CERTIFICATION','FREIGHT','EXPEDITE FEE','CC FEE','INSPECTION','MISSED PAYMENT','TAX') " & _
           "AND DATE_DUE_LINE >= CONVERT('2025-01-01', SQL_DATE) " & _
           "AND DATE_DUE_LINE <= CONVERT('2025-12-31', SQL_DATE) " & _
           "GROUP BY V_POHIST_LINES.VENDOR " & _
           "ORDER BY SUM(EXTENSION) DESC"

    rs.Open sqlQuery, conn, 3, 1
    If Err.Number <> 0 Then
        WScript.StdOut.Write "{""error"":""Query failed: " & Err.Description & """}"
        Err.Clear
    ElseIf Not rs.EOF Then
        Dim json
        json = RecordsetToJSON(rs)
        WScript.StdOut.Write json
    Else
        WScript.StdOut.Write "[]"
    End If

    On Error GoTo 0
End If

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
            If IsNull(fieldValue) Then
                record = record & """" & field.Name & """: null,"
            Else
                fieldValue = Replace(fieldValue, "\", "\\")
                fieldValue = Replace(fieldValue, """", "\""")
                fieldValue = Replace(fieldValue, vbCrLf, "\n")
                record = record & """" & field.Name & """: """ & fieldValue & ""","
            End If
        Next
        record = Left(record, Len(record) - 1)
        record = record & "},"
        json = json & record
        rs.MoveNext
    Loop
    json = Left(json, Len(json) - 1)
    json = json & "]"
    RecordsetToJSON = json
End Function
