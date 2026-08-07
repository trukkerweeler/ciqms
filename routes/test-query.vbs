' test-query.vbs - Test router lookup for job 122419
Dim conn, rs
Dim fso, file, WshShell
Dim DocumentsPath, CIQMSPath, envPath
Dim dsn, uid, pwd
Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

dsn = Trim(WshShell.ExpandEnvironmentStrings("%GLOBAL_DSN%"))
uid = Trim(WshShell.ExpandEnvironmentStrings("%GLOBAL_UID%"))
pwd = Trim(WshShell.ExpandEnvironmentStrings("%GLOBAL_PWD%"))

If dsn = "%GLOBAL_DSN%" Then dsn = ""
If uid = "%GLOBAL_UID%" Then uid = ""
If pwd = "%GLOBAL_PWD%" Then pwd = ""

If dsn = "" Or uid = "" Or pwd = "" Then
    DocumentsPath = WshShell.SpecialFolders("MyDocuments")
    CIQMSPath = DocumentsPath & "\CIQMS"
    If UCase(WshShell.ExpandEnvironmentStrings("%COMPUTERNAME%")) = "QUALITY-MGR" Then
        CIQMSPath = DocumentsPath & "\CIQMS1"
    End If

    envPath = CIQMSPath & "\.env"
    Set file = fso.OpenTextFile(envPath, 1)
    If Err.Number <> 0 Then
        Err.Clear
        envPath = CIQMSPath & "\env"
        Set file = fso.OpenTextFile(envPath, 1)
    End If

    If Err.Number <> 0 Then
        WScript.Echo "Cannot open .env file"
        WScript.Quit
    End If

    dsn = "" : uid = "" : pwd = ""
    Do While Not file.AtEndOfStream
        Dim line
        line = Trim(file.ReadLine)
        If Left(line, 11) = "GLOBAL_DSN=" Then dsn = Mid(line, 12)
        If Left(line, 11) = "GLOBAL_UID=" Then uid = Mid(line, 12)
        If Left(line, 11) = "GLOBAL_PWD=" Then pwd = Mid(line, 12)
    Loop
    file.Close
End If

If dsn = "" Or uid = "" Or pwd = "" Then
    WScript.Echo "Missing GLOBAL_DSN/UID/PWD"
    WScript.Quit
End If

conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd

If conn.State = 1 Then
    ' Test query 1: Find any ROUTER with PASST6 operation for specific PART
    Dim query1
    query1 = "SELECT DISTINCT ROUTER, PART_WC_OUTSIDE, OPERATION FROM V_ROUTER_LINE WHERE PART_WC_OUTSIDE LIKE '%521572%' AND OPERATION IN ('PASST6', 'PASSM2') LIMIT 10"
    rs.Open query1, conn, 3, 1
    
    WScript.Echo "Query 1: Looking for PASST6/PASSM2 operations with PART containing 521572"
    WScript.Echo "Found " & rs.RecordCount & " records"
    If Not rs.EOF Then
        Do Until rs.EOF
            WScript.Echo "  ROUTER: " & rs.Fields("ROUTER").Value & ", PART: " & rs.Fields("PART_WC_OUTSIDE").Value & ", OP: " & rs.Fields("OPERATION").Value
            rs.MoveNext
        Loop
    End If
    rs.Close
    
    ' Test query 2: Check JOB operations for 122419-001
    Dim query2
    query2 = "SELECT DISTINCT JOB, SUFFIX, ROUTER_SEQ, OPERATION FROM V_JOB_OPERATIONS WHERE JOB = '122419' AND SUFFIX = '001' LIMIT 10"
    rs.Open query2, conn, 3, 1
    
    WScript.Echo ""
    WScript.Echo "Query 2: Looking for operations for JOB 122419, SUFFIX 001"
    WScript.Echo "Found " & rs.RecordCount & " records"
    If Not rs.EOF Then
        Do Until rs.EOF
            WScript.Echo "  JOB: " & rs.Fields("JOB").Value & ", SUFFIX: " & rs.Fields("SUFFIX").Value & ", ROUTER_SEQ: " & rs.Fields("ROUTER_SEQ").Value & ", OP: " & rs.Fields("OPERATION").Value
            rs.MoveNext
        Loop
    End If
    rs.Close
    
    conn.Close
End If

WScript.Echo "Done."
