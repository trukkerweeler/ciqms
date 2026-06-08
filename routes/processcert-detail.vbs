' processcert-detail.vbs (SIMPLIFIED FOR DEBUGGING)
Dim job, suffix, CIQMSPath, envPath, file, fso, dsn, uid, pwd, line, WshShell, DocumentsPath
Dim conn, sqlOps, rsOps, sqlHist, rsHist, sqlIH, rsIH, sqlJD, rsJD, jsonOps, jsonIH, jsonJD, finalJson

On Error Resume Next

' ========== ARGUMENTS ==========
If WScript.Arguments.Count < 2 Then
  WScript.Echo "{""success"":false,""error"":""Missing arguments""}"
  WScript.Quit 1
End If

job = WScript.Arguments(0)
suffix = WScript.Arguments(1)

' ========== ENV LOADING ==========
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
DocumentsPath = WshShell.SpecialFolders("MyDocuments")
CIQMSPath = DocumentsPath & "\CIQMS1"

If UCase(WshShell.ExpandEnvironmentStrings("%COMPUTERNAME%")) <> "QUALITY-MGR" Then
  CIQMSPath = DocumentsPath & "\CIQMS"
End If

' Read DB credentials from env vars set by Node.js (already loaded from .env at startup)
dsn = WshShell.ExpandEnvironmentStrings("%CIQMS_GLOBAL_DSN%")
uid = WshShell.ExpandEnvironmentStrings("%CIQMS_GLOBAL_UID%")
pwd = WshShell.ExpandEnvironmentStrings("%CIQMS_GLOBAL_PWD%")

' Fallback: parse .env file if env vars not set
If dsn = "%CIQMS_GLOBAL_DSN%" Or dsn = "" Then
  Dim envPath1, envPath2
  envPath1 = CIQMSPath & "\.env"
  envPath2 = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)) & "\.env"
  envPath = envPath1
  Set file = fso.OpenTextFile(envPath, 1)
  If Err.Number <> 0 Then
    Err.Clear
    envPath = envPath2
    Set file = fso.OpenTextFile(envPath, 1)
  End If
  If Err.Number <> 0 Then
    WScript.Echo "{""success"":false,""error"":""Env not found. Tried: " & envPath1 & " and " & envPath2 & """}"
    WScript.Quit 1
  End If
  dsn = "" : uid = "" : pwd = ""
  Do While Not file.AtEndOfStream
    line = Trim(file.ReadLine)
    If Left(line, 11) = "GLOBAL_DSN=" Then dsn = Mid(line, 12)
    If Left(line, 11) = "GLOBAL_UID=" Then uid = Mid(line, 12)
    If Left(line, 11) = "GLOBAL_PWD=" Then pwd = Mid(line, 12)
  Loop
  file.Close
End If

If dsn = "" Or uid = "" Or pwd = "" Then
  WScript.Echo "{""success"":false,""error"":""Missing DSN, UID, or PWD""}"
  WScript.Quit 1
End If

' ========== DATABASE CONNECTION ==========
Set conn = CreateObject("ADODB.Connection")
On Error Resume Next
conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd

If Err.Number <> 0 Then
  WScript.Echo "{""success"":false,""error"":""" & EscapeJSON(Err.Description) & """}"
  WScript.Quit 1
End If

Err.Clear

' ========== QUERIES ==========
sqlOps = "SELECT JO.SEQ, JO.OPERATION, JO.DESCRIPTION, JO.LMO, JO.ROUTER, JO.ROUTER_SEQ, JO.UNITS_OPEN, JO.UNITS_COMPLETE, JO.UNITS_SCRAP, JO.DATE_COMPLETED, (SELECT TOP 1 RL.PART_WC_OUTSIDE FROM ROUTER_LINE RL WHERE RL.ROUTER = JO.ROUTER AND RL.LINE_ROUTER = JO.ROUTER_SEQ) AS PART_WC_OUTSIDE FROM JOB_OPERATIONS JO WHERE JO.JOB = '" & job & "' AND JO.SUFFIX = '" & suffix & "' AND JO.SEQ < 990000 ORDER BY JO.SEQ"
Set rsOps = conn.Execute(sqlOps)
If Err.Number <> 0 Then
  WScript.Echo "{""success"":false,""error"":""" & EscapeJSON(Err.Description) & """}"
  conn.Close
  WScript.Quit 1
End If

Err.Clear

sqlHist = "SELECT JO.SEQ, JO.OPERATION, JO.DESCRIPTION, JO.LMO, JO.ROUTER, JO.ROUTER_SEQ, JO.UNITS_OPEN, JO.UNITS_COMPLETE, JO.UNITS_SCRAP, JO.DATE_COMPLETED, (SELECT TOP 1 RL.PART_WC_OUTSIDE FROM ROUTER_LINE RL WHERE RL.ROUTER = JO.ROUTER AND RL.LINE_ROUTER = JO.ROUTER_SEQ) AS PART_WC_OUTSIDE FROM JOB_HIST_OPS JO WHERE JO.JOB = '" & job & "' AND JO.SUFFIX = '" & suffix & "' ORDER BY JO.SEQ"
Set rsHist = conn.Execute(sqlHist)
If Err.Number <> 0 Then
  WScript.Echo "{""success"":false,""error"":""" & EscapeJSON(Err.Description) & """}"
  conn.Close
  WScript.Quit 1
End If

Err.Clear

sqlIH = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, CODE_TRANSACTION, QUANTITY, SERIAL_NUMBER, LOT, HEAT, SEQUENCE FROM ITEM_HISTORY WHERE JOB = '" & job & "' AND SUFFIX = '" & suffix & "' ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY"
Set rsIH = conn.Execute(sqlIH)
If Err.Number <> 0 Then
  WScript.Echo "{""success"":false,""error"":""" & EscapeJSON(Err.Description) & """}"
  conn.Close
  WScript.Quit 1
End If

Err.Clear

' Query JOB_DETAIL / JOB_HIST_DTL for outside processing PO numbers.
' Both tables have SEQ, LMO, and REFERENCE. Use LMO='O' to isolate outside processing rows.
sqlJD = "SELECT DISTINCT SEQ, REFERENCE FROM JOB_DETAIL WHERE JOB = '" & job & "' AND SUFFIX = '" & suffix & "' AND LMO = 'O' AND REFERENCE IS NOT NULL"
Set rsJD = conn.Execute(sqlJD)
If Err.Number <> 0 Then
  Err.Clear
  Set rsJD = Nothing
End If

If rsJD Is Nothing Or rsJD.EOF Then
  Err.Clear
  sqlJD = "SELECT DISTINCT SEQ, REFERENCE FROM JOB_HIST_DTL WHERE JOB = '" & job & "' AND SUFFIX = '" & suffix & "' AND LMO = 'O' AND REFERENCE IS NOT NULL"
  Set rsJD = conn.Execute(sqlJD)
  If Err.Number <> 0 Then
    Err.Clear
    Set rsJD = Nothing
  End If
End If

' Query JOB_HEADER for part number and description
Dim partNumber, partDescription
partNumber = ""
partDescription = ""
Dim sqlJH, rsJH
sqlJH = "SELECT PART, PART_DESCRIPTION FROM JOB_HEADER WHERE JOB = '" & job & "' AND SUFFIX = '" & suffix & "'"
Set rsJH = conn.Execute(sqlJH)
If Err.Number = 0 Then
  If Not rsJH.EOF Then
    partNumber = NullToStr(rsJH("PART"))
    partDescription = NullToStr(rsJH("PART_DESCRIPTION"))
  End If
  rsJH.Close
Else
  Err.Clear
End If

' ========== BUILD JSON RESULTS ==========
jsonOps = BuildOpsJSON(rsOps, rsHist)
jsonIH = BuildItemHistoryJSON(rsIH)
jsonJD = BuildJobDetailJSON(rsJD)

finalJson = "{""success"":true,""part"":" & QuoteJSON(partNumber) & ",""partDescription"":" & QuoteJSON(partDescription) & ",""operations"":" & jsonOps & ",""itemHistory"":" & jsonIH & ",""jobDetail"":" & jsonJD & "}"

WScript.Echo finalJson
conn.Close
WScript.Quit 0

' ========== HELPER FUNCTIONS ==========

Function BuildOpsJSON(rsOps, rsHist)
  Dim arr, first
  arr = "["
  first = True
  
  Do While Not rsOps.EOF
    If Not first Then arr = arr & ","
    first = False
    arr = arr & OpRowToJSON(rsOps)
    rsOps.MoveNext
  Loop
  
  Do While Not rsHist.EOF
    If Not first Then arr = arr & ","
    first = False
    arr = arr & OpRowToJSON(rsHist)
    rsHist.MoveNext
  Loop
  
  arr = arr & "]"
  BuildOpsJSON = arr
End Function

Function OpRowToJSON(rs)
  Dim seq, op, desc, lmo, router, routerSeq, unitsOpen, unitsComplete, unitsScrap, dateComplete, partWcOutside
  
  seq = NullToZero(rs("SEQ"))
  op = NullToStr(rs("OPERATION"))
  desc = NullToStr(rs("DESCRIPTION"))
  lmo = NullToStr(rs("LMO"))
  router = NullToStr(rs("ROUTER"))
  routerSeq = NullToZero(rs("ROUTER_SEQ"))
  unitsOpen = NullToZero(rs("UNITS_OPEN"))
  unitsComplete = NullToZero(rs("UNITS_COMPLETE"))
  unitsScrap = NullToZero(rs("UNITS_SCRAP"))
  dateComplete = NullToStr(rs("DATE_COMPLETED"))
  partWcOutside = NullToStr(rs("PART_WC_OUTSIDE"))
  
  OpRowToJSON = "{" & _
    """seq"":" & QuoteJSON(seq) & "," & _
    """operation"":" & QuoteJSON(op) & "," & _
    """description"":" & QuoteJSON(desc) & "," & _
    """lmo"":" & QuoteJSON(lmo) & "," & _
    """router"":" & QuoteJSON(router) & "," & _
    """routerSeq"":" & QuoteJSON(routerSeq) & "," & _
    """unitsOpen"":" & unitsOpen & "," & _
    """unitsComplete"":" & unitsComplete & "," & _
    """unitsScrap"":" & unitsScrap & "," & _
    """dateCompleted"":" & QuoteJSON(dateComplete) & "," & _
    """partWcOutside"":" & QuoteJSON(partWcOutside) & _
    "}"
End Function

Function BuildJobDetailJSON(rs)
  Dim arr, first
  arr = "["
  first = True

  If rs Is Nothing Then
    BuildJobDetailJSON = "[]"
    Exit Function
  End If

  If rs.EOF Then
    BuildJobDetailJSON = "[]"
    Exit Function
  End If

  Do While Not rs.EOF
    If Not first Then arr = arr & ","
    first = False
    Dim seqVal, reference
    seqVal = NullToZero(rs("SEQ"))
    reference = NullToStr(rs("REFERENCE"))
    arr = arr & "{" & _
      """seq"":" & QuoteJSON(seqVal) & "," & _
      """reference"":" & QuoteJSON(reference) & _
      "}"
    rs.MoveNext
  Loop

  arr = arr & "]"
  BuildJobDetailJSON = arr
End Function

Function BuildItemHistoryJSON(rs)
  Dim arr, first
  arr = "["
  first = True
  
  Do While Not rs.EOF
    If Not first Then arr = arr & ","
    first = False
    arr = arr & IHRowToJSON(rs)
    rs.MoveNext
  Loop
  
  arr = arr & "]"
  BuildItemHistoryJSON = arr
End Function

Function IHRowToJSON(rs)
  Dim dateHist, timeHist, codeTrans, qty, serial, lot, heat, seq
  
  dateHist = NullToStr(rs("DATE_HISTORY"))
  timeHist = NullToStr(rs("TIME_ITEM_HISTORY"))
  codeTrans = NullToStr(rs("CODE_TRANSACTION"))
  qty = NullToZero(rs("QUANTITY"))
  serial = NullToStr(rs("SERIAL_NUMBER"))
  lot = NullToStr(rs("LOT"))
  heat = NullToStr(rs("HEAT"))
  seq = NullToZero(rs("SEQUENCE"))
  
  IHRowToJSON = "{" & _
    """dateHistory"":" & QuoteJSON(dateHist) & "," & _
    """timeItemHistory"":" & QuoteJSON(timeHist) & "," & _
    """codeTransaction"":" & QuoteJSON(codeTrans) & "," & _
    """quantity"":" & qty & "," & _
    """serialNumber"":" & QuoteJSON(serial) & "," & _
    """lot"":" & QuoteJSON(lot) & "," & _
    """heat"":" & QuoteJSON(heat) & "," & _
    """sequence"":" & QuoteJSON(seq) & _
    "}"
End Function

Function QuoteJSON(str)
  If str = "" Then
    QuoteJSON = """"""
  Else
    QuoteJSON = """" & EscapeJSON(str) & """"
  End If
End Function

Function NullToZero(val)
  If IsNull(val) Or val = "" Then
    NullToZero = "0"
  Else
    NullToZero = CStr(val)
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
