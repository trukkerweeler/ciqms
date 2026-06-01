' processcert-detail.vbs
' Retrieves detailed job operations and item history for a given JOB/SUFFIX
' Used to populate process certificate table with operations and transactions

Option Explicit

' Get command-line arguments
Dim job, suffix
If WScript.Arguments.Count < 2 Then
  WScript.Echo "Usage: processcert-detail.vbs <JOB> <SUFFIX>"
  WScript.Quit 1
End If
job = WScript.Arguments(0)
suffix = WScript.Arguments(1)

' Load environment variables from .env file - matching processcert-coc pattern
Dim CIQMSPath, envPath, file, fso, dsn, uid, pwd, line, parts, WshShell, DocumentsPath
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Detect CIQMS path using same logic as processcert-coc
DocumentsPath = WshShell.SpecialFolders("MyDocuments")
CIQMSPath = DocumentsPath & "\CIQMS1"
If UCase(WshShell.ExpandEnvironmentStrings("%COMPUTERNAME%")) <> "QUALITY-MGR" Then
  CIQMSPath = DocumentsPath & "\CIQMS"
End If

envPath = CIQMSPath & "\.env"
Set file = fso.OpenTextFile(envPath, 1)
If Err.Number <> 0 Then
    Err.Clear
    envPath = CIQMSPath & "\env"
    Set file = fso.OpenTextFile(envPath, 1)
End If
If Err.Number <> 0 Then
  WScript.Echo "Error opening .env file: " & Err.Description
  WScript.Quit 1
End If

dsn = ""
uid = ""
pwd = ""
Do While Not file.AtEndOfStream
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
  WScript.Echo "Error: DSN, UID, or PWD not found in .env file."
  WScript.Quit 1
End If

' Connect to database
Dim conn, rs, sql, jsonOutput
Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

On Error Resume Next
conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
If Err.Number <> 0 Then
  WScript.Echo "Error: Connection failed - " & Err.Description
  WScript.Quit 1
End If
On Error GoTo 0

' Query job operations with UNION to include historical records
sql = "SELECT " & _
  "jo.JOB, " & _
  "jo.SUFFIX, " & _
  "jo.SEQ AS operationSeq, " & _
  "jo.OPERATION, " & _
  "jo.DESCRIPTION AS operationDescription, " & _
  "jo.ROUTER, " & _
  "jo.ROUTER_SEQ, " & _
  "jo.UNITS_OPEN AS unitsOpen, " & _
  "jo.UNITS_COMPLETE AS unitsComplete, " & _
  "jo.UNITS_SCRAP AS unitsScrap, " & _
  "jo.DATE_COMPLETED AS operationCompletedDate, " & _
  "ih.SERIAL_NUMBER AS serialNumber, " & _
  "ih.LOT, " & _
  "ih.HEAT, " & _
  "ih.CODE_TRANSACTION AS codeTransaction, " & _
  "ih.QUANTITY AS quantity, " & _
  "ih.DATE_HISTORY AS dateHistory, " & _
  "ih.TIME_ITEM_HISTORY AS timeItemHistory " & _
  "FROM JOB_OPERATIONS jo " & _
  "LEFT JOIN ITEM_HISTORY ih ON ih.JOB = jo.JOB AND ih.SUFFIX = jo.SUFFIX AND ih.SEQUENCE = jo.SEQ " & _
  "WHERE jo.JOB = " & job & " AND jo.SUFFIX = '" & suffix & "' AND jo.SEQ < 990000 " & _
  "UNION ALL " & _
  "SELECT " & _
  "jh.JOB, " & _
  "jh.SUFFIX, " & _
  "jh.SEQ AS operationSeq, " & _
  "'' AS OPERATION, " & _
  "jh.DESCRIPTION AS operationDescription, " & _
  "'' AS ROUTER, " & _
  "0 AS ROUTER_SEQ, " & _
  "0 AS unitsOpen, " & _
  "0 AS unitsComplete, " & _
  "0 AS unitsScrap, " & _
  "jh.CHARGE_DATE AS operationCompletedDate, " & _
  "jh.REFERENCE AS serialNumber, " & _
  "'' AS LOT, " & _
  "'' AS HEAT, " & _
  "'' AS codeTransaction, " & _
  "0 AS quantity, " & _
  "'' AS dateHistory, " & _
  "'' AS timeItemHistory " & _
  "FROM JOB_HIST_DTL jh " & _
  "WHERE jh.JOB = " & job & " AND jh.SUFFIX = '" & suffix & "' AND jh.SEQ < 990000 " & _
  "ORDER BY operationSeq, dateHistory, timeItemHistory"

On Error Resume Next
Set rs = conn.Execute(sql)
If Err.Number <> 0 Then
  WScript.Echo "{""error"":""" & EscapeJSON(Err.Description) & """}"
  conn.Close
  WScript.Quit 1
End If
On Error GoTo 0

' Build JSON array of results
Dim result, index, rowCount
result = ""
index = 0

While Not rs.EOF
  If index > 0 Then result = result & ","
  
  result = result & "{" & _
    """job"":" & rs("job") & "," & _
    """suffix"":" & QuoteJSON(NullToStr(rs("suffix"))) & "," & _
    """operationSeq"":" & NullToZero(rs("operationSeq")) & "," & _
    """operation"":" & QuoteJSON(NullToStr(rs("operation"))) & "," & _
    """operationDescription"":" & QuoteJSON(NullToStr(rs("operationDescription"))) & "," & _
    """router"":" & QuoteJSON(NullToStr(rs("router"))) & "," & _
    """routerSeq"":" & NullToZero(rs("router_seq")) & "," & _
    """unitsOpen"":" & NullToZero(rs("unitsOpen")) & "," & _
    """unitsComplete"":" & NullToZero(rs("unitsComplete")) & "," & _
    """unitsScrap"":" & NullToZero(rs("unitsScrap")) & "," & _
    """operationCompletedDate"":" & QuoteJSON(NullToStr(rs("operationCompletedDate"))) & "," & _
    """serialNumber"":" & QuoteJSON(NullToStr(rs("serialNumber"))) & "," & _
    """lot"":" & QuoteJSON(NullToStr(rs("lot"))) & "," & _
    """heat"":" & QuoteJSON(NullToStr(rs("heat"))) & "," & _
    """codeTransaction"":" & QuoteJSON(NullToStr(rs("codeTransaction"))) & "," & _
    """quantity"":" & NullToZero(rs("quantity")) & "," & _
    """dateHistory"":" & QuoteJSON(NullToStr(rs("dateHistory"))) & "," & _
    """timeItemHistory"":" & QuoteJSON(NullToStr(rs("timeItemHistory"))) & _
    "}"
  
  index = index + 1
  rs.MoveNext
Wend

' Format final JSON
Dim finalJson
finalJson = "{""success"":true,""rowCount"":" & index & ",""rows"":[" & result & "]}"

rs.Close
conn.Close

' Output result as JSON
WScript.Echo finalJson

' Helper functions
Function QuoteJSON(str)
  If IsNull(str) Or str = "" Then
    QuoteJSON = """"""
  Else
    QuoteJSON = """" & EscapeJSON(CStr(str)) & """"
  End If
End Function

Function NullToZero(val)
  If IsNull(val) Or val = "" Then
    NullToZero = "0"
  Else
    On Error Resume Next
    Dim numVal
    numVal = CLng(val)
    If Err.Number <> 0 Then
      Err.Clear
      NullToZero = "0"
    Else
      NullToZero = CStr(numVal)
    End If
    On Error GoTo 0
  End If
End Function

Function NullToStr(val)
  If IsNull(val) Then
    NullToStr = ""
  Else
    NullToStr = CStr(val)
  End If
End Function

Function EscapeJSON(str)
  Dim result
  result = str
  result = Replace(result, "\", "\\")
  result = Replace(result, """", "\""")
  result = Replace(result, vbCrLf, "\n")
  result = Replace(result, vbCr, "\n")
  result = Replace(result, vbLf, "\n")
  result = Replace(result, vbTab, "\t")
  EscapeJSON = result
End Function
