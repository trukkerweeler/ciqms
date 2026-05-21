Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")
Dim CIQMSPath, envFilePath, envContent
Dim DSN, UID, PWD

' Get Documents folder and determine CIQMS path
Dim DocumentsPath
DocumentsPath = objShell.SpecialFolders("MyDocuments")
CIQMSPath = DocumentsPath & "\CIQMS"
If UCase(objShell.ExpandEnvironmentStrings("%COMPUTERNAME%")) = "QUALITY-MGR" Then
    CIQMSPath = DocumentsPath & "\CIQMS1"
End If

envFilePath = CIQMSPath & "\.env"

If objFSO.FileExists(envFilePath) Then
    Set objFile = objFSO.OpenTextFile(envFilePath, 1)
    envContent = objFile.ReadAll()
    objFile.Close()
Else
    WScript.StdOut.Write "{""error"":""No .env file found""}"
    WScript.Quit
End If

' Parse .env file for GLOBAL_DSN, GLOBAL_UID, GLOBAL_PWD
Dim lines
lines = Split(envContent, vbCrLf)
For Each line In lines
    line = Trim(line)
    If Left(line, 11) = "GLOBAL_DSN=" Then
        DSN = Mid(line, 12)
    ElseIf Left(line, 11) = "GLOBAL_UID=" Then
        UID = Mid(line, 12)
    ElseIf Left(line, 11) = "GLOBAL_PWD=" Then
        PWD = Mid(line, 12)
    End If
Next

If DSN = "" Or UID = "" Or PWD = "" Then
    WScript.StdOut.Write "{""error"":""Missing database credentials""}"
    WScript.Quit
End If

' Create connection
Dim conn
Set conn = CreateObject("ADODB.Connection")
On Error Resume Next
conn.Open "DSN=" & DSN & ";UID=" & UID & ";PWD=" & PWD

If Err.Number <> 0 Then
    WScript.StdOut.Write "{""error"":""Connection failed""}"
    WScript.Quit
End If
On Error GoTo 0

' Get WO number from command line
Dim woNumber
If WScript.Arguments.Count > 0 Then
    woNumber = WScript.Arguments(0)
Else
    WScript.StdOut.Write "{""error"":""No WO number provided""}"
    WScript.Quit
End If

' Query V_ITEM_HISTORY for latest row with LMO logic
' If LMO='O' (external), use PO; otherwise use the date
Dim sqlQuery
sqlQuery = "SELECT " & _
           "v.PART, " & _
           "v.JOB, " & _
           "v.SUFFIX, " & _
           "v.SERIAL_NUMBER, " & _
           "v.QUANTITY, " & _
           "v.SEQUENCE, " & _
           "v.DATE_HISTORY, " & _
           "v.TIME_ITEM_HISTORY, " & _
           "j.LMO, " & _
           "CASE WHEN j.LMO = 'O' THEN o.PURCHASE_ORDER ELSE j.DATE_COMPLETED END AS REFERENCE " & _
           "FROM V_ITEM_HISTORY v " & _
           "LEFT JOIN JOB_OPERATIONS j ON j.JOB = v.JOB AND j.SUFFIX = v.SUFFIX " & _
           "LEFT JOIN PO_HISTORY o ON o.JOB = v.JOB AND o.SEQUENCE = j.SEQ " & _
           "WHERE v.JOB = '" & woNumber & "' " & _
           "AND v.SEQUENCE <> '999999' " & _
           "ORDER BY v.DATE_HISTORY DESC, v.TIME_ITEM_HISTORY DESC"

' For debugging - log the query to stderr
' WScript.StdErr.WriteLine "DEBUG SQL: " & sqlQuery

Dim rs
Set rs = CreateObject("ADODB.Recordset")
On Error Resume Next
rs.Open sqlQuery, conn, 0, 1

If Err.Number <> 0 Then
    ' Output error details for debugging
    WScript.StdOut.Write "{""error"":""Query failed: " & Err.Description & """}"
    WScript.Quit
End If
On Error GoTo 0

' Convert to JSON
Dim jsonOutput
If Not rs.EOF Then
    jsonOutput = "{"
    jsonOutput = jsonOutput & """PART"":""" & rs("PART").Value & """," 
    jsonOutput = jsonOutput & """JOB"":""" & rs("JOB").Value & """," 
    jsonOutput = jsonOutput & """SUFFIX"":""" & rs("SUFFIX").Value & """," 
    jsonOutput = jsonOutput & """SERIAL_NUMBER"":""" & rs("SERIAL_NUMBER").Value & """," 
    jsonOutput = jsonOutput & """QTY"":""" & rs("QUANTITY").Value & """," 
    jsonOutput = jsonOutput & """LMO"":""" & rs("LMO").Value & """," 
    jsonOutput = jsonOutput & """REFERENCE"":""" & rs("REFERENCE").Value & """," 
    jsonOutput = jsonOutput & """SEQUENCE"":""" & rs("SEQUENCE").Value & """," 
    jsonOutput = jsonOutput & """DATE_HISTORY"":""" & rs("DATE_HISTORY").Value & """," 
    jsonOutput = jsonOutput & """TIME_ITEM_HISTORY"":""" & rs("TIME_ITEM_HISTORY").Value & """"
    jsonOutput = jsonOutput & "}"
    WScript.StdOut.Write jsonOutput
Else
    WScript.StdOut.Write "null"
End If

rs.Close
Set rs = Nothing
conn.Close
Set conn = Nothing
