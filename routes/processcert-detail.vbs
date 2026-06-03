' processcert-detail.vbs (CLEAN VERSION)
Option Explicit

Dim job, suffix
If WScript.Arguments.Count < 2 Then
  WScript.Echo "{""error"":""Usage: processcert-detail.vbs <JOB> <SUFFIX>""}"
  WScript.Quit 1
End If

job = WScript.Arguments(0)
suffix = WScript.Arguments(1)

' ============================================================
' Load .env (same as your original)
' ============================================================
Dim CIQMSPath, envPath, file, fso, dsn, uid, pwd, line, WshShell, DocumentsPath
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

DocumentsPath = WshShell.SpecialFolders("MyDocuments")
CIQMSPath = DocumentsPath & "\CIQMS1"
If UCase(WshShell.ExpandEnvironmentStrings("%COMPUTERNAME%")) <> "QUALITY-MGR" Then
  CIQMSPath = DocumentsPath & "\CIQMS"
End If

envPath = CIQMSPath & "\.env"
Set file = fso.OpenTextFile(envPath, 1)

dsn = "" : uid = "" : pwd = ""
Do While Not file.AtEndOfStream
  line = Trim(file.ReadLine)
  If Left(line, 11) = "GLOBAL_DSN=" Then dsn = Mid(line, 12)
  If Left(line, 11) = "GLOBAL_UID=" Then uid = Mid(line, 12)
  If Left(line, 11) = "GLOBAL_PWD=" Then pwd = Mid(line, 12)
Loop
file.Close

If dsn = "" Or uid = "" Or pwd = "" Then
  WScript.Echo "{""error"":""Missing DSN/UID/PWD in .env""}"
  WScript.Quit 1
End If

' ============================================================
' Connect to DB
' ============================================================
Dim conn
Set conn = CreateObject("ADODB.Connection")
conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd

' ============================================================
' 1️⃣ QUERY ACTIVE OPERATIONS (JOB_OPERATIONS)
' ============================================================
Dim sqlOps, rsOps
sqlOps = "SELECT SEQ, OPERATION, DESCRIPTION, ROUTER, ROUTER_SEQ, " & _
         "UNITS_OPEN, UNITS_COMPLETE, UNITS_SCRAP, DATE_COMPLETED " & _
         "FROM JOB_OPERATIONS " & _
         "WHERE JOB = " & job & " AND SUFFIX = '" & suffix & "' " & _
         "AND SEQ < 990000 " & _
         "ORDER BY SEQ"

Set rsOps = conn.Execute(sqlOps)

' ============================================================
' 2️⃣ QUERY ARCHIVED OPERATIONS (JOB_HIST_OPS)
' ============================================================
Dim sqlHist, rsHist
sqlHist = "SELECT SEQ, OPERATION, DESCRIPTION, ROUTER, ROUTER_SEQ, " & _
          "UNITS_OPEN, UNITS_COMPLETE, UNITS_SCRAP, DATE_COMPLETED " & _
          "FROM JOB_HIST_OPS " & _
          "WHERE JOB = " & job & " AND SUFFIX = '" & suffix & "' " & _
          "ORDER BY SEQ"

Set rsHist = conn.Execute(sqlHist)

' ============================================================
' 3️⃣ QUERY ITEM HISTORY (J52, J55, J50, J51, etc.)
' ============================================================
Dim sqlIH, rsIH
sqlIH = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, CODE_TRANSACTION, " & _
        "QUANTITY, SERIAL_NUMBER, LOT, HEAT, SEQUENCE " & _
        "FROM ITEM_HISTORY " & _
        "WHERE JOB = " & job & " AND SUFFIX = '" & suffix & "' " & _
        "ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY"

Set rsIH = conn.Execute(sqlIH)

' ============================================================
' BUILD JSON
' ============================================================
Dim jsonOps, jsonIH
jsonOps = BuildOpsJSON(rsOps, rsHist)
jsonIH = BuildItemHistoryJSON(rsIH)

Dim finalJson
finalJson = "{""success"":true,""operations"":" & jsonOps & ",""itemHistory"":" & jsonIH & "}"

WScript.Echo finalJson
conn.Close

' ============================================================
' HELPERS
' ============================================================

Function BuildOpsJSON(rsOps, rsHist)
  Dim arr, first
  arr = "[" : first = True

  ' Active ops
  Do While Not rsOps.EOF
    If Not first Then arr = arr & ","
    first = False
    arr = arr & OpRowToJSON(rsOps)
    rsOps.MoveNext
  Loop

  ' Archived ops
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
  OpRowToJSON = "{" & _
    """seq"":" & NullToZero(rs("SEQ")) & "," & _
    """operation"":" & QuoteJSON(NullToStr(rs("OPERATION"))) & "," & _
    """description"":" & QuoteJSON(NullToStr(rs("DESCRIPTION"))) & "," & _
    """router"":" & QuoteJSON(NullToStr(rs("ROUTER"))) & "," & _
    """routerSeq"":" & NullToZero(rs("ROUTER_SEQ")) & "," & _
    """unitsOpen"":" & NullToZero(rs("UNITS_OPEN")) & "," & _
    """unitsComplete"":" & NullToZero(rs("UNITS_COMPLETE")) & "," & _
    """unitsScrap"":" & NullToZero(rs("UNITS_SCRAP")) & "," & _
    """dateCompleted"":" & QuoteJSON(NullToStr(rs("DATE_COMPLETED"))) & _
    "}"
End Function

Function BuildItemHistoryJSON(rs)
  Dim arr, first
  arr = "[" : first = True

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
  IHRowToJSON = "{" & _
    """dateHistory"":" & QuoteJSON(NullToStr(rs("DATE_HISTORY"))) & "," & _
    """timeItemHistory"":" & QuoteJSON(NullToStr(rs("TIME_ITEM_HISTORY"))) & "," & _
    """codeTransaction"":" & QuoteJSON(NullToStr(rs("CODE_TRANSACTION"))) & "," & _
    """quantity"":" & NullToZero(rs("QUANTITY")) & "," & _
    """serialNumber"":" & QuoteJSON(NullToStr(rs("SERIAL_NUMBER"))) & "," & _
    """lot"":" & QuoteJSON(NullToStr(rs("LOT"))) & "," & _
    """heat"":" & QuoteJSON(NullToStr(rs("HEAT"))) & "," & _
    """sequence"":" & NullToZero(rs("SEQUENCE")) & _
    "}"
End Function

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
    NullToZero = CStr(val)
  End If
End Function

Function NullToStr(val)
  If IsNull(val) Then NullToStr = "" Else NullToStr = CStr(val)
End Function

Function EscapeJSON(str)
  Dim result
  result = str
  result = Replace(result, "\", "\\")
  result = Replace(result, """", "\""")
  EscapeJSON = result
End Function
