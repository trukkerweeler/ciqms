' acceptance-rate-fin.vbs - Fetch JOB_HEADER jobs closed by month for previous calendar year
' Output: JSON array with monthly job counts

On Error Resume Next

Const DEBUG_MODE = False  ' Set to True to enable debug output

' Debug output function
Function DebugOutput(msg)
    If DEBUG_MODE Then
        WScript.StdErr.WriteLine msg
    End If
End Function

DebugOutput "FIN Script starting..."

' Get previous calendar year
Dim prevYear
prevYear = Year(Date()) - 1

' Get year suffix (last 2 digits)
Dim yearSuffix
yearSuffix = Right(CStr(prevYear), 2)

DebugOutput "Previous year: " & prevYear & ", suffix: " & yearSuffix

' Read environment file for database credentials
Dim envFile, envPath, fso, envContent, lines, i
Set fso = CreateObject("Scripting.FileSystemObject")

' Find .env file - check common locations
If fso.FileExists("C:\Users\TimK\Documents\CIQMS1\.env") Then
    envPath = "C:\Users\TimK\Documents\CIQMS1\.env"
ElseIf fso.FileExists(".env") Then
    envPath = ".env"
ElseIf fso.FileExists(CreateObject("WScript.Shell").CurrentDirectory & "\.env") Then
    envPath = CreateObject("WScript.Shell").CurrentDirectory & "\.env"
Else
    WScript.Echo "{""error"":""Environment file not found""}"
    WScript.Quit 1
End If

DebugOutput "Using env file: " & envPath

' Read environment variables
Function ReadEnvFile(filePath)
    Dim result, content, lineArray, i, parts, key, value
    Set result = CreateObject("Scripting.Dictionary")
    
    If Not fso.FileExists(filePath) Then
        DebugOutput "Env file not found: " & filePath
        Exit Function
    End If
    
    Set envFile = fso.OpenTextFile(filePath, 1)
    content = envFile.ReadAll
    envFile.Close
    
    lineArray = Split(content, vbCrLf)
    For i = 0 To UBound(lineArray)
        Dim line
        line = Trim(lineArray(i))
        If line <> "" And Left(line, 1) <> "#" Then
            If InStr(line, "=") > 0 Then
                parts = Split(line, "=", 2)
                key = Trim(parts(0))
                value = Trim(parts(1))
                ' Remove quotes if present
                If Left(value, 1) = """" Then
                    value = Mid(value, 2)
                End If
                If Right(value, 1) = """" Then
                    value = Left(value, Len(value) - 1)
                End If
                result.Add key, value
                DebugOutput "Loaded: " & key & "=" & value
            End If
        End If
    Next
    
    Set ReadEnvFile = result
End Function

' Connect to database
Function ConnectToDatabase(dsn, uid, pwd)
    Dim conn
    Set conn = CreateObject("ADODB.Connection")
    
    Dim connString
    connString = "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
    
    On Error Resume Next
    conn.ConnectionString = connString
    conn.Open
    
    If Err.Number <> 0 Then
        DebugOutput "Connection error: " & Err.Description
        ConnectToDatabase = Nothing
        Exit Function
    End If
    
    DebugOutput "Connected to database: " & dsn
    Set ConnectToDatabase = conn
End Function

' Parse YEAR_MONTH format (e.g., '2025-01') to extract month number
Function ExtractMonth(yearMonth)
    Dim parts
    parts = Split(yearMonth, "-")
    If UBound(parts) >= 1 Then
        ExtractMonth = CLng(parts(1))
    Else
        ExtractMonth = 0
    End If
End Function

' Main logic
Dim envVars
Set envVars = ReadEnvFile(envPath)

If envVars.Count = 0 Then
    WScript.Echo "{""error"":""Failed to read environment file""}"
    WScript.Quit 1
End If

Dim dsn, uid, pwd
dsn = envVars.Item("GLOBAL_DSN")
uid = envVars.Item("GLOBAL_UID")
pwd = envVars.Item("GLOBAL_PWD")

DebugOutput "DSN: " & dsn & ", UID: " & uid

If dsn = "" Or uid = "" Or pwd = "" Then
    WScript.Echo "{""error"":""Missing database credentials in .env file""}"
    WScript.Quit 1
End If

' Connect to global database
Dim conn
Set conn = ConnectToDatabase(dsn, uid, pwd)

If conn Is Nothing Then
    WScript.Echo "{""error"":""Failed to connect to global database""}"
    WScript.Quit 1
End If

' Query JOB_HEADER for jobs closed in previous year
' DATE_CLOSED format: MMDDYY
' Filter for the previous year by checking last 2 digits
Dim query
query = "SELECT " & _
    "'20' + SUBSTRING(DATE_CLOSED, 5, 2) + '-' + SUBSTRING(DATE_CLOSED, 1, 2) AS YEAR_MONTH, " & _
    "COUNT(*) AS JOBS_CLOSED " & _
    "FROM JOB_HEADER " & _
    "WHERE DATE_CLOSED BETWEEN '010100' AND '123199' " & _
    "AND SUBSTRING(DATE_CLOSED, 5, 2) = '" & yearSuffix & "' " & _
    "GROUP BY '20' + SUBSTRING(DATE_CLOSED, 5, 2) + '-' + SUBSTRING(DATE_CLOSED, 1, 2) " & _
    "ORDER BY YEAR_MONTH ASC"

DebugOutput "Executing query: " & query

' Execute query
Dim rs
On Error Resume Next
Set rs = conn.Execute(query)

If Err.Number <> 0 Then
    DebugOutput "Query error: " & Err.Description
    WScript.Echo "{""error"":""Query execution failed: " & Err.Description & """}"
    conn.Close
    WScript.Quit 1
End If

DebugOutput "Query executed successfully"

' Build result array
Dim results
results = "["
Dim isFirst
isFirst = True
Dim recordCount
recordCount = 0

If Not rs.EOF Then
    While Not rs.EOF
        Dim yearMonth, jobsCount, month
        yearMonth = rs.Fields("YEAR_MONTH").Value
        jobsCount = rs.Fields("JOBS_CLOSED").Value
        month = ExtractMonth(yearMonth)
        
        If month > 0 Then
            If Not isFirst Then
                results = results & ","
            End If
            results = results & "{""month"":" & month & ",""receipts"":" & jobsCount & "}"
            isFirst = False
            DebugOutput "Month " & month & ": " & jobsCount & " jobs closed"
        End If
        
        rs.MoveNext
        recordCount = recordCount + 1
    Wend
End If

results = results & "]"

DebugOutput "Records processed: " & recordCount
DebugOutput "Output: " & results

' Clean up
rs.Close
conn.Close

' Output JSON
WScript.Echo results
