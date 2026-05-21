' test-query.vbs - Test router lookup for job 122419
Dim conn, rs
Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

conn.Open "DSN=Global_CII;UID=tkent;PWD=A1rplane"

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
