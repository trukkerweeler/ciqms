'C:\Windows\SysWOW64\cscript.exe C:\Users\TimK\Documents\CIQMS1\routes\certsearch.vbs

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
Dim envPath
envPath = CIQMSPath & "\.env"
Set file = fso.OpenTextFile(envPath, 1)
If Err.Number <> 0 Then
    Err.Clear
    envPath = fso.GetParentFolderName(CIQMSPath) & "\.env"  ' Try parent for production
    Set file = fso.OpenTextFile(envPath, 1)
End If
If Err.Number <> 0 Then
    MsgBox "Error opening .env file: " & Err.Description
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

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

Dim woId
If WScript.Arguments.Count > 0 Then
    woId = WScript.Arguments(0)
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
    Dim woParts, woBase, woChild
    woParts = Split(woId, "-")
    woBase = woParts(0)
    If UBound(woParts) >= 1 Then
        woChild = woParts(1)
    Else
        woChild = ""
    End If
    
    Dim jsonResults
    jsonResults = "["
    
    ' Use the proven SQL query for passivation search
    Dim sqlQuery
    sqlQuery = "SELECT " & _
        "j.PART, " & _
        "j.SerialJob AS JOB, " & _
        "j.SerialSuffix AS SUFFIX, " & _
        "j.PassiSeq AS SEQUENCE, " & _
        "j.PassiDesc AS DESCRIPTION, " & _
        "CASE WHEN j.LMO = 'O' THEN 'OUTSIDE' ELSE 'INTERNAL' END AS PASSIVATION_SOURCE, " & _
        "CASE WHEN j.LMO = 'O' THEN o.PURCHASE_ORDER ELSE j.PassiDate END AS CERT_ID, " & _
        "CASE WHEN j.LMO = 'O' THEN 1 WHEN j.LMO = 'L' AND j.HoursActual > 0 THEN 2 ELSE 3 END AS RankOrder " & _
    "FROM ( " & _
        "SELECT DISTINCT " & _
            "ih.PART, " & _
            "CASE WHEN ih.SERIAL_NUMBER LIKE '%-%' THEN SUBSTRING(ih.SERIAL_NUMBER, 1, LOCATE('-', ih.SERIAL_NUMBER)-1) END AS SerialJob, " & _
            "CASE WHEN ih.SERIAL_NUMBER LIKE '%-%' THEN SUBSTRING(ih.SERIAL_NUMBER, LOCATE('-', ih.SERIAL_NUMBER)+1, 3) END AS SerialSuffix, " & _
            "jo.SEQ AS PassiSeq, " & _
            "jo.DESCRIPTION AS PassiDesc, " & _
            "jo.DATE_COMPLETED AS PassiDate, " & _
            "jo.LMO, " & _
            "jo.HOURS_ACTUAL AS HoursActual " & _
        "FROM V_ITEM_HISTORY ih " & _
        "JOIN JOB_OPERATIONS jo " & _
            "ON jo.JOB = SUBSTRING(ih.SERIAL_NUMBER, 1, LOCATE('-', ih.SERIAL_NUMBER)-1) " & _
           "AND jo.SUFFIX = SUBSTRING(ih.SERIAL_NUMBER, LOCATE('-', ih.SERIAL_NUMBER)+1, 3) " & _
           "AND jo.DESCRIPTION LIKE '%PASSI%' " & _
    ") j " & _
    "LEFT JOIN ( " & _
        "SELECT " & _
            "pod.JOB, " & _
            "pod.SEQUENCE, " & _
            "pod.PURCHASE_ORDER, " & _
            "MAX(pod.DATE_RECEIVED) AS MaxDateReceived " & _
        "FROM PO_HISTORY pod " & _
        "GROUP BY pod.JOB, pod.SEQUENCE, pod.PURCHASE_ORDER " & _
    ") o " & _
        "ON o.JOB = j.SerialJob " & _
       "AND o.SEQUENCE = j.PassiSeq " & _
    "WHERE j.SerialJob = '" & woBase & "' " & _
      "AND j.SerialSuffix = '" & woChild & "' " & _
    "ORDER BY RankOrder"
    
    rs.Open sqlQuery, conn, 3, 1
    
    If Err.Number <> 0 Then
        MsgBox "Query failed: " & Err.Description
        Err.Clear
    ElseIf Not rs.EOF Then
        Dim firstRecord
        firstRecord = True
        
        Do Until rs.EOF
            If Not firstRecord Then
                jsonResults = jsonResults & ","
            End If
            firstRecord = False
            
            jsonResults = jsonResults & "{"
            jsonResults = jsonResults & """PART"": """ & EscapeJSON(CStr(rs.Fields("PART").Value)) & """, "
            jsonResults = jsonResults & """JOB"": """ & EscapeJSON(CStr(rs.Fields("JOB").Value)) & """, "
            jsonResults = jsonResults & """SUFFIX"": """ & EscapeJSON(CStr(rs.Fields("SUFFIX").Value)) & """, "
            jsonResults = jsonResults & """SERIAL_NUMBER"": """ & EscapeJSON(CStr(rs.Fields("JOB").Value)) & "-" & EscapeJSON(CStr(rs.Fields("SUFFIX").Value)) & """, "
            jsonResults = jsonResults & """SEQUENCE"": """ & rs.Fields("SEQUENCE").Value & """, "
            jsonResults = jsonResults & """DESCRIPTION"": """ & EscapeJSON(CStr(rs.Fields("DESCRIPTION").Value)) & """, "
            jsonResults = jsonResults & """OPERATION"": """ & EscapeJSON(CStr(rs.Fields("DESCRIPTION").Value)) & """, "
            jsonResults = jsonResults & """PASSIVATION_SOURCE"": """ & EscapeJSON(CStr(rs.Fields("PASSIVATION_SOURCE").Value)) & """, "
            jsonResults = jsonResults & """CERT_ID"": """ & EscapeJSON(CStr(rs.Fields("CERT_ID").Value)) & """, "
            jsonResults = jsonResults & """RankOrder"": """ & rs.Fields("RankOrder").Value & """"
            jsonResults = jsonResults & "}"
            
            rs.MoveNext
        Loop
    End If
    
    jsonResults = jsonResults & "]"
    
    WScript.StdOut.Write jsonResults
    
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

Function FormatDate(dateVal)
    If IsNull(dateVal) Or dateVal = "" Then
        FormatDate = ""
    Else
        FormatDate = CStr(dateVal)
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
