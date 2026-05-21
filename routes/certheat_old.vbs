'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\RMA\routes\certheat.vbs

Dim conn
Dim rs
On Error Resume Next

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")
' get the arguments from the command line
Dim woId
If WScript.Arguments.Count > 0 Then
    woId = WScript.Arguments(0)
    ' MsgBox "WO ID: " & woId, vbInformation, "certprocesses.vbs 13"
Else
    MsgBox "No WO ID provided."
    WScript.Quit
End If

conn.Open "DSN=Global_CII;UID=tkent;PWD=A1rplane"

If Err.Number <> 0 Then
    MsgBox "Connection failed: " & Err.Description
    Err.Clear
    WScript.Quit
End If

On Error GoTo 0

If conn.State = 1 Then
    On Error Resume Next
    Dim woParts, woBase, woChild, woSeq
    woParts = Split(woId, "-")
    woBase = woParts(0)
    ' MsgBox "Base WO: " & woBase, vbInformation, "certpurchase.vbs 34"
    If UBound(woParts) >= 1 Then
        woChild = woParts(1)
        woSeq = woParts(2)
    Else
        woChild = ""
    End If
    Dim sqlQuery
    ' sqlQuery = "SELECT TOP 1 jo.JOB, jo.SUFFIX, jo.SEQ, jo.DESCRIPTION, jo.ROUTER, jo.ROUTER_SEQ, " & _
    '        "ph.PURCHASE_ORDER, ph.RECEIVER_NO " & _
    '        "FROM JOB_OPERATIONS jo " & _
    '        "LEFT OUTER JOIN PO_HISTORY ph ON jo.JOB = ph.JOB AND jo.SUFFIX = ph.SUFFIX AND jo.SEQ = ph.SEQUENCE " & _
    '        "WHERE jo.JOB = '" & woBase & "' AND jo.SUFFIX = '" & woChild & "' " & _
    '        "AND jo.SEQ > '"& woSeq &"' " & _
    '        "AND ph.RECEIVER_NO <> '' " & _
    '        "AND LOWER(jo.DESCRIPTION) like '%heat%' " & _
    '        "ORDER BY jo.SEQ ASC"

    sqlQuery = "SELECT TOP 1 jo.JOB, jo.SUFFIX, jo.SEQ, jo.DESCRIPTION, jo.ROUTER, jo.ROUTER_SEQ, " & _
               "ph.PURCHASE_ORDER, ph.RECEIVER_NO " & _
               "FROM JOB_OPERATIONS jo " & _
               "LEFT OUTER JOIN PO_HISTORY ph ON jo.JOB = ph.JOB AND jo.SUFFIX = ph.SUFFIX AND jo.SEQ = ph.SEQUENCE " & _
               "WHERE jo.JOB = '" & woBase & "' AND jo.SUFFIX = '" & woChild & "' " & _
               "AND ph.RECEIVER_NO <> '' " & _
               "AND LOWER(jo.DESCRIPTION) like '%heat%' " & _
               "ORDER BY jo.SEQ ASC"
    
    ' MsgBox "SQL Query: " & sqlQuery, vbInformation, "certheat.vbs 61"
    
    rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
    If Err.Number <> 0 Then
        MsgBox "Query failed: " & Err.Description
        Err.Clear
    ElseIf Not rs.EOF Then
        ' Leave the Recordset open for the caller to process
        Set GlobalRecordset = rs ' Assign the Recordset to a global variable
        
        ' Output the Recordset as JSON to stdout for Python to read
        Dim json
        If Not GlobalRecordset Is Nothing Then
            GlobalRecordset.MoveFirst
        End If
        json = RecordsetToJSON(GlobalRecordset)
        WScript.StdOut.Write json

    Else
        ' No records found, so get the DATE_COMPLETED from JOB_OPERATIONS
        MsgBox "No records found for WO: " & woId, vbInformation, "certheat.vbs 81"
        Dim completedDate
        sqlQuery = "SELECT DATE_COMPLETED FROM JOB_OPERATIONS WHERE JOB = '" & woBase & "' AND SUFFIX = '" & woChild & "' AND (lower(DESCRIPTION) like '%heat%' OR lower(DESCRIPTION) like '%aging%')"
        rs.Close
        rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
        If Not rs.EOF Then
            completedDate = rs.Fields("DATE_COMPLETED").Value
            If Not IsNull(completedDate) Then
                ' Output the completed date as JSON array
                WScript.StdOut.Write "[{""DATE_COMPLETED"": """ & EscapeJSON(CStr(completedDate)) & """}]"
            Else
                WScript.StdOut.Write "[]"
            End If
        Else
            WScript.StdOut.Write "[]"
        End If
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
    Dim field, json, record
    If rs.EOF Then
        RecordsetToJSON = "[]"
        Exit Function
    End If
    json = "["
    Do Until rs.EOF
        record = "{"
        For Each field In rs.Fields
            record = record & """" & field.Name & """: " & ToJSONValue(field.Value) & ","
        Next
        record = Left(record, Len(record) - 1) ' Remove trailing comma
        record = record & "},"
        json = json & record
        rs.MoveNext
    Loop
    If Right(json, 1) = "," Then
        json = Left(json, Len(json) - 1) ' Remove trailing comma
    End If
    json = json & "]"
    RecordsetToJSON = json
End Function

Function ToJSONValue(val)
    If IsNull(val) Then
        ToJSONValue = "null"
    Else
        ToJSONValue = """" & EscapeJSON(CStr(val)) & """"
    End If
End Function

Function EscapeJSON(str)
    str = Replace(str, "\", "\\")
    str = Replace(str, """", "\""")
    str = Replace(str, "/", "\/")
    str = Replace(str, Chr(8), "\b")
    str = Replace(str, Chr(12), "\f")
    str = Replace(str, Chr(10), "\n")
    str = Replace(str, Chr(13), "\r")
    str = Replace(str, Chr(9), "\t")
    EscapeJSON = str
End Function
