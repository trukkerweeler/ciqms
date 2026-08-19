' ASL vs Global Supplier Compare Report
' Queries Global (V_POHIST_LINES UNION V_PO_LINES) for date range

Dim conn, rs, fso, dsn, uid, pwd, file, WshShell, DocumentsPath, CIQMSPath
Dim startDate, endDate
On Error Resume Next

If WScript.Arguments.Count >= 2 Then
    startDate = Trim(WScript.Arguments(0))
    endDate = Trim(WScript.Arguments(1))
Else
    WScript.StdOut.Write "{""error"":""Start and end date arguments required""}"
    WScript.Quit
End If

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

    Dim partExclude
    partExclude = "('FEE','FEE #2','SURCHARGE','INSPECT','CERTIFICATION'," & _
                  "'FREIGHT','EXPEDITE FEE','CC FEE','INSPECTION','MISSED PAYMENT','TAX')"

    Dim sqlQuery
    sqlQuery = "SELECT * FROM ("
    sqlQuery = sqlQuery & "SELECT h.PURCHASE_ORDER, h.PO_TYPE, h.PART, h.DESCRIPTION, h.DATE_DUE_LINE, h.DATE_LAST_RECEIVED, "
    sqlQuery = sqlQuery & "h.QTY_ORDER, h.QTY_RECEIVED, h.EXTENSION, h.VENDOR, vm.NAME_VENDOR "
    sqlQuery = sqlQuery & "FROM V_POHIST_LINES h "
    sqlQuery = sqlQuery & "LEFT JOIN VENDOR_MASTER vm ON h.VENDOR = vm.VENDOR AND vm.REC = 1 "
    sqlQuery = sqlQuery & "WHERE PART NOT IN " & partExclude & " "
    sqlQuery = sqlQuery & "AND h.DATE_DUE_LINE >= CONVERT('" & startDate & "', SQL_DATE) "
    sqlQuery = sqlQuery & "AND h.DATE_DUE_LINE <= CONVERT('" & endDate & "', SQL_DATE) "
    sqlQuery = sqlQuery & "UNION "
    sqlQuery = sqlQuery & "SELECT p.PURCHASE_ORDER, p.PO_TYPE, p.PART, p.DESCRIPTION, p.DATE_DUE_LINE, p.DATE_LAST_RECEIVED, "
    sqlQuery = sqlQuery & "p.QTY_ORDER, p.QTY_RECEIVED, p.EXTENSION, p.VENDOR, vm.NAME_VENDOR "
    sqlQuery = sqlQuery & "FROM V_PO_LINES p "
    sqlQuery = sqlQuery & "LEFT JOIN VENDOR_MASTER vm ON p.VENDOR = vm.VENDOR AND vm.REC = 1 "
    sqlQuery = sqlQuery & "WHERE PART NOT IN " & partExclude & " "
    sqlQuery = sqlQuery & "AND p.DATE_DUE_LINE >= CONVERT('" & startDate & "', SQL_DATE) "
    sqlQuery = sqlQuery & "AND p.DATE_DUE_LINE <= CONVERT('" & endDate & "', SQL_DATE) "
    sqlQuery = sqlQuery & ") src "
    sqlQuery = sqlQuery & "ORDER BY PURCHASE_ORDER DESC"

    rs.Open sqlQuery, conn, 3, 1
    If Err.Number <> 0 Then
        WScript.StdOut.Write "{""error"":""Query failed: " & Err.Description & """}"
        Err.Clear
    ElseIf Not rs.EOF Then
        WScript.StdOut.Write RecordsetToJSON(rs)
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
    Dim field, json, record
    json = "["
    Do Until rs.EOF
        record = "{"
        For Each field In rs.Fields
            Dim fieldValue
            fieldValue = field.Value
            If IsNull(fieldValue) Then
                record = record & """" & field.Name & """: null,"
            Else
                fieldValue = Replace(CStr(fieldValue), "\", "\\")
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
