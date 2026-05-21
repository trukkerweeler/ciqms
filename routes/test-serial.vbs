Dim GLOBAL_DSN, GLOBAL_UID, GLOBAL_PWD, conn, rs, sqlQuery, jobNum
Dim fso, env

Set fso = CreateObject("Scripting.FileSystemObject")
Set env = WScript.CreateObject("WScript.Shell").Environment("Process")

GLOBAL_DSN = env("GLOBAL_DSN")
GLOBAL_UID = env("GLOBAL_UID")
GLOBAL_PWD = env("GLOBAL_PWD")

jobNum = WScript.Arguments(0)

Set conn = CreateObject("ADODB.Connection")
conn.ConnectionString = "DSN=" & GLOBAL_DSN & ";UID=" & GLOBAL_UID & ";PWD=" & GLOBAL_PWD
conn.Open

sqlQuery = "SELECT SERIAL_NUMBER, LOT, QUANTITY, REFERENCE, PURCHASE_ORDER FROM V_ITEM_HISTORY WHERE JOB = " & CLng(jobNum) & " AND CODE_TRANSACTION = 'J55' ORDER BY SERIAL_NUMBER, LOT"

WScript.StdErr.Write "Query: " & sqlQuery & vbCrLf

Set rs = conn.Execute(sqlQuery)

WScript.StdErr.Write "Results:" & vbCrLf
Do While Not rs.EOF
  WScript.StdErr.Write "  SERIAL_NUMBER: " & rs("SERIAL_NUMBER") & " | LOT: " & rs("LOT") & " | QUANTITY: " & rs("QUANTITY") & " | REFERENCE: " & rs("REFERENCE") & " | PO: " & rs("PURCHASE_ORDER") & vbCrLf
  rs.MoveNext
Loop

rs.Close
conn.Close
