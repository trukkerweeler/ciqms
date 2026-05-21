' Supplier Quarterly Delivery Performance Trend
' Connects to Global_CII database and calculates on-time % for last 4 quarters

Dim conn, rs, fso, dsn, uid, pwd, file, WshShell, DocumentsPath, CIQMSPath, vendorCode
On Error Resume Next

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Get vendor from command line arguments
If WScript.Arguments.Count > 0 Then
    vendorCode = Trim(WScript.Arguments(0))
Else
    WScript.StdOut.Write "{""error"":""Vendor code required""}"
    WScript.Quit
End If

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
    
    ' Function to escape JSON string values
    Function EscapeJSON(s)
        s = Replace(s, "\", "\\")
        s = Replace(s, """", "\""")
        s = Replace(s, vbCrLf, "\n")
        s = Replace(s, vbLf, "\n")
        s = Replace(s, vbCr, "\n")
        s = Replace(s, vbTab, "\t")
        EscapeJSON = s
    End Function

    ' Simple query to get raw PO data - date filtering and calculations done in JavaScript
    Dim sqlQuery
    sqlQuery = ""
    sqlQuery = sqlQuery & "SELECT "
    sqlQuery = sqlQuery & "PURCHASE_ORDER, "
    sqlQuery = sqlQuery & "SUBSTRING(DATE_DUE_LINE, 1, 10) AS DUE_DATE, "
    sqlQuery = sqlQuery & "SUBSTRING(DATE_LAST_RECEIVED, 1, 10) AS RECEIVED_DATE, "
    sqlQuery = sqlQuery & "VENDOR, "
    sqlQuery = sqlQuery & "PO_TYPE, "
    sqlQuery = sqlQuery & "PART "
    sqlQuery = sqlQuery & "FROM V_POHIST_LINES "
    sqlQuery = sqlQuery & "WHERE VENDOR = '" & Replace(vendorCode, "'", "''") & "' "
    sqlQuery = sqlQuery & "AND PO_TYPE = 'O' "
    sqlQuery = sqlQuery & "AND PART NOT IN ("
    sqlQuery = sqlQuery & "'FEE','FEE #2','SURCHARGE','INSPECT','CERTIFICATION',"
    sqlQuery = sqlQuery & "'FREIGHT','EXPEDITE FEE','CC FEE','INSPECTION','MISSED PAYMENT','TAX'"
    sqlQuery = sqlQuery & ") "
    sqlQuery = sqlQuery & "ORDER BY DATE_DUE_LINE DESC "

Dim dbgIndex
For dbgIndex = 1 To Len(sqlQuery) Step 200
    WScript.StdErr.WriteLine Mid(sqlQuery, dbgIndex, 200)
Next 
    rs.Open sqlQuery, conn, 3, 1
    
    If Err.Number <> 0 Then
        Dim errMsg
        errMsg = "Query execution failed: " & Err.Number & " - " & Err.Description
        
        On Error Resume Next
        If conn.Errors.Count > 0 Then
            Dim i
            For i = 0 To conn.Errors.Count - 1
                errMsg = errMsg & " | ODBC Error " & i & ": " & conn.Errors(i).Description
            Next
        End If
        On Error GoTo 0
        
        WScript.StdOut.Write "{""error"":""" & errMsg & """}"
        Err.Clear
    ElseIf Not rs.EOF Then
        Dim result
        result = "["
        
        Do Until rs.EOF
            On Error Resume Next
            Dim poNum, dueDate, recvDate, vendor, poType, partCode
            
            poNum = ""
            dueDate = ""
            recvDate = ""
            vendor = ""
            poType = ""
            partCode = ""
            
            ' PURCHASE_ORDER
            If Not IsNull(rs.Fields(0).Value) Then
                poNum = CStr(rs.Fields(0).Value)
            End If
            
            ' DUE_DATE
            If Not IsNull(rs.Fields(1).Value) Then
                dueDate = CStr(rs.Fields(1).Value)
            End If
            
            ' RECEIVED_DATE
            If Not IsNull(rs.Fields(2).Value) Then
                recvDate = CStr(rs.Fields(2).Value)
            End If
            
            ' VENDOR
            If Not IsNull(rs.Fields(3).Value) Then
                vendor = CStr(rs.Fields(3).Value)
            End If
            
            ' PO_TYPE
            If Not IsNull(rs.Fields(4).Value) Then
                poType = CStr(rs.Fields(4).Value)
            End If
            
            ' PART
            If Not IsNull(rs.Fields(5).Value) Then
                partCode = CStr(rs.Fields(5).Value)
            End If
            
            If Err.Number <> 0 Then
                WScript.StdOut.Write "{""error"":""Row conversion error: " & Err.Description & """}"
                Err.Clear
                WScript.Quit
            End If
            
            ' Build JSON object for this row - escape all string values
            result = result & "{""po"":""" & EscapeJSON(poNum) & """,""dueDate"":""" & EscapeJSON(dueDate) & """,""receivedDate"":""" & EscapeJSON(recvDate) & """,""vendor"":""" & EscapeJSON(vendor) & """,""poType"":""" & EscapeJSON(poType) & """,""part"":""" & EscapeJSON(partCode) & """}"
            
            rs.MoveNext
            If Not rs.EOF Then result = result & ","
            On Error GoTo 0
        Loop
        
        result = result & "]"
        WScript.StdOut.Write result
    Else
        WScript.StdOut.Write "{""error"":""No data found for this vendor""}"
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
