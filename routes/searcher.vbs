'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\RMA\routes\rmawip.vbs

Dim conn
Dim rs
On Error Resume Next

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")


If Err.Number <> 0 Then
    MsgBox "Connection failed: " & Err.Description
    Err.Clear
    WScript.Quit
End If

On Error GoTo 0

If conn.State = 1 Then
    On Error Resume Next

    Dim tableRs, tableName, columnName, searchQuery

    ' Get table and column names, excluding specific prefixes
    Set tableRs = conn.Execute( _
        "SELECT xf$name AS TableName, xe$name AS ColumnName " & _
        "FROM X$File, X$Field " & _
        "WHERE xe$File = xf$id " & _
        "AND xf$name NOT LIKE 'ATG%' " & _
        "AND xf$name NOT LIKE 'AP%' " & _
        "AND xf$name NOT LIKE 'BI%' " & _
        "AND xf$name NOT LIKE 'AR%' " & _
        "AND xf$name NOT LIKE 'ACH%' " & _
        "AND xf$name NOT LIKE 'ACCTS%' " & _
        "AND xf$name NOT LIKE 'BOL%' " & _
        "AND xf$name NOT LIKE 'CRM%' " & _
        "AND xf$name NOT LIKE 'CON%' " & _
        "AND xf$name NOT LIKE 'DTL%' " & _
        "AND xf$name NOT LIKE 'EDI%' " & _
        "AND xf$name NOT LIKE 'ECN%' " & _
        "AND xf$name NOT LIKE 'EMP%' " & _
        "AND xf$name NOT LIKE 'GL%' " & _
        "AND xf$name NOT LIKE 'GRID%' " & _
        "AND xf$name NOT LIKE 'X_%' " & _
        "AND xf$name NOT LIKE 'Y_%' " & _
        "AND xf$name NOT LIKE 'Z_%' " & _
        "ORDER BY xf$name, xe$offset" _
    )
    If Err.Number <> 0 Then
        MsgBox "Query failed: " & Err.Description
        Err.Clear
        conn.Close
        WScript.Quit
    End If

    ' Loop through tables and columns
    Do While Not tableRs.EOF
        tableName = tableRs("TableName")
        columnName = tableRs("ColumnName")
        searchQuery = "SELECT COUNT(*) FROM " & tableName & " WHERE " & columnName & " = 41607"

        ' Execute search query
        On Error Resume Next ' Ignore errors from unsupported columns
        Set rs = conn.Execute(searchQuery)
        If Err.Number = 0 Then
            If rs(0) > 0 Then
                WScript.Echo "Found in " & tableName & "." & columnName & ": " & rs(0) & " occurrences"
            End If
        Else
            WScript.Echo "Skipping " & tableName & "." & columnName & ": " & Err.Description
            Err.Clear
        End If
        On Error GoTo 0 ' Restore error handling

        tableRs.MoveNext
    Loop

    ' Cleanup
    tableRs.Close
    Set tableRs = Nothing

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


