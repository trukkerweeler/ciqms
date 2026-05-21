' acceptance-rate.vbs - Fetch PO_HISTORY receipts by month for previous calendar year
' Output: JSON array with monthly receipt counts

On Error Resume Next

Const DEBUG_MODE = False  ' Set to True to enable debug output

' Debug output function
Function DebugOutput(msg)
    If DEBUG_MODE Then
        WScript.StdErr.WriteLine msg
    End If
End Function

DebugOutput "Script starting..."

' Get previous calendar year
Dim prevYear
prevYear = Year(Date()) - 1
DebugOutput "Previous year: " & prevYear

Dim yearStart
yearStart = DateSerial(prevYear, 1, 1)
Dim yearEnd
yearEnd = DateSerial(prevYear, 12, 31)

DebugOutput "Year range: " & Format(yearStart, "yyyy-mm-dd") & " to " & Format(yearEnd, "yyyy-mm-dd")

' Read .env file for database credentials
Function ReadEnvFile()
    Dim envPath, fso, envFile, line, parts
    envPath = "C:\Users\TimK\Documents\CIQMS1\.env"
    
    ' Try alternate path if not found
    If Not CreateObject("Scripting.FileSystemObject").FileExists(envPath) Then
        envPath = ".env"
    End If
    
    Set fso = CreateObject("Scripting.FileSystemObject")
    If Not fso.FileExists(envPath) Then
        WScript.StdOut.Write "{""error"":""Cannot find .env file at: " & envPath & """}"
        Err.Clear
        WScript.Quit
    End If
    
    DebugOutput "Reading .env from: " & envPath
    
    Dim envVars
    Set envVars = CreateObject("Scripting.Dictionary")
    
    Set envFile = fso.OpenTextFile(envPath, 1)
    Do Until envFile.AtEndOfStream
        line = Trim(envFile.ReadLine)
        If line <> "" And Left(line, 1) <> "#" Then
            parts = Split(line, "=", 2)
            If UBound(parts) >= 1 Then
                envVars(Trim(parts(0))) = Trim(parts(1))
            End If
        End If
    Loop
    envFile.Close
    
    Set ReadEnvFile = envVars
End Function

' Create and return database connection
Function ConnectToDatabase(envVars)
    Dim dsn, uid, pwd, conn
    
    dsn = envVars.Item("GLOBAL_DSN")
    uid = envVars.Item("GLOBAL_UID")
    pwd = envVars.Item("GLOBAL_PWD")
    
    DebugOutput "DSN: " & dsn
    DebugOutput "UID: " & uid
    
    If dsn = "" Or uid = "" Or pwd = "" Then
        WScript.StdOut.Write "{""error"":""Missing database credentials in .env: DSN=""" & dsn & """, UID=""" & uid & """, PWD set=""" & (pwd <> "") & """}"
        Err.Clear
        WScript.Quit
    End If
    
    Set conn = CreateObject("ADODB.Connection")
    
    ' Try connection with proper error handling
    Dim connString
    connString = "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
    
    DebugOutput "Connecting with: " & connString
    
    ' Set connection properties
    On Error Resume Next
    conn.ConnectionString = connString
    DebugOutput "ConnectionString property set"
    
    conn.Open
    
    If Err.Number <> 0 Then
        DebugOutput "Error opening connection: " & Err.Number & " - " & Err.Description
        WScript.StdOut.Write "{""error"":""Database connection failed: " & Err.Description & """}"
        Err.Clear
        WScript.Quit
    End If
    
    DebugOutput "Connection opened successfully"
    On Error GoTo 0
    
    Set ConnectToDatabase = conn
End Function

' Convert recordset to JSON
Function RecordsetToJSON(rs)
    Dim json, field, value, month, count
    json = "["
    
    Dim isFirst
    isFirst = True
    
    Do Until rs.EOF
        If Not isFirst Then
            json = json & ","
        End If
        isFirst = False
        
        month = rs("month").Value
        count = rs("count").Value
        
        json = json & "{""month"":" & month & ",""receipts"":" & count & "}"
        
        rs.MoveNext
    Loop
    
    json = json & "]"
    RecordsetToJSON = json
End Function

' Main execution
Dim envVars, conn, rs, query, json, dateStr, monthNum
Dim monthData()
ReDim monthData(12)
Dim i

' Initialize all months to 0
For i = 1 To 12
    monthData(i) = 0
Next

DebugOutput "Reading environment variables..."
Set envVars = ReadEnvFile()

DebugOutput "Connecting to database..."
Set conn = ConnectToDatabase(envVars)

' Query PO_HISTORY for receipts - avoid MONTH() function which doesn't work with Pervasive ODBC
' Instead, fetch raw DATE_RECEIVED and process in VBScript
' Year format: previous calendar year from 2025 is "25" (2025 format)

query = "SELECT DATE_RECEIVED FROM PO_HISTORY " & _
        "WHERE DATE_RECEIVED LIKE '25%' " & _
        "AND QTY_RECEIVED > 0 " & _
        "ORDER BY DATE_RECEIVED ASC"

DebugOutput "Executing query: " & query

Set rs = CreateObject("ADODB.Recordset")
rs.Open query, conn, 3, 1

If Err.Number <> 0 Then
    WScript.StdOut.Write "{""error"":""Query failed: " & Err.Description & """}"
    DebugOutput "Error executing query: " & Err.Description
    Err.Clear
    conn.Close
    WScript.Quit
End If

DebugOutput "Query executed successfully"
Dim recordCount
recordCount = 0

' Process records and group by month
Do Until rs.EOF
    dateStr = Trim(rs("DATE_RECEIVED").Value)
    recordCount = recordCount + 1
    
    ' Parse YYMMDD format (6 characters: YY=chars 1-2, MM=chars 3-4, DD=chars 5-6)
    If Len(dateStr) >= 4 Then
        ' Extract month (positions 3-4 in YYMMDD format)
        Dim yearPart, monthPart
        yearPart = Left(dateStr, 2)
        monthPart = Mid(dateStr, 3, 2)
        
        ' Convert month string to integer
        monthNum = CLng(monthPart)
        
        ' Validate month (1-12)
        If monthNum >= 1 And monthNum <= 12 Then
            monthData(monthNum) = monthData(monthNum) + 1
        End If
    End If
    
    rs.MoveNext
Loop

rs.Close

DebugOutput "Processed " & recordCount & " records"

' Build JSON with all 12 months
json = "["
For i = 1 To 12
    If i > 1 Then json = json & ","
    json = json & "{""month"":" & i & ",""receipts"":" & monthData(i) & "}"
Next
json = json & "]"

DebugOutput "JSON output: " & json

WScript.StdOut.Write json

conn.Close

' Cleanup
Set rs = Nothing
Set conn = Nothing
Set envVars = Nothing
