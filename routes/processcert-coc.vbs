' processcert-coc.vbs
' Implements Steps 1-3 of Process Certificate Chain-of-Custody extraction
' Designed for use by processcert.html frontend
'
' Step 1: Fetch Inventory Transactions (J52) from ITEM_HISTORY
' Step 2: Accept selected transactions from frontend (no database work)
' Step 3: Build first-level chain-of-custody links with parent operation, child job, and materials
'        Process-centric: operations, router descriptions, outside processing flags, and PO references
'
' Usage: cscript //Nologo processcert-coc.vbs <JOB> [selectedTransactionIndices]
' Example: cscript //Nologo processcert-coc.vbs 122166 0,1,3
'
' Returns: JSON structure with Step 1 transactions, selections, and CoC links
' Tables used: ITEM_HISTORY, JOB_HEADER, JOB_OPERATIONS, ROUTER_LINE, JOB_DETAIL

On Error Resume Next

Dim conn, rs, fso, dsn, uid, pwd, file, WshShell, DocumentsPath, CIQMSPath
On Error Resume Next

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
  Dim envPath, envPath1, envPath2, envPath3
  envPath1 = CIQMSPath & "\.env"
  envPath2 = CIQMSPath & "\env"
  envPath3 = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)) & "\.env"
  envPath = envPath1
  Set file = fso.OpenTextFile(envPath, 1)
  If Err.Number <> 0 Then
      Err.Clear
      envPath = envPath2
      Set file = fso.OpenTextFile(envPath, 1)
  End If
  If Err.Number <> 0 Then
      Err.Clear
      envPath = envPath3
      Set file = fso.OpenTextFile(envPath, 1)
  End If
  If Err.Number <> 0 Then
    WScript.Echo "Error opening .env file. Tried: [" & envPath1 & "] [" & envPath2 & "] [" & envPath3 & "]"
    WScript.Quit 1
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
  WScript.Echo "Error: DSN, UID, or PWD not found."
  WScript.Quit 1
End If

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

Dim job, suffix, selectedIndicesStr
If WScript.Arguments.Count > 0 Then
  job = WScript.Arguments(0)
  If WScript.Arguments.Count > 1 Then
    selectedIndicesStr = WScript.Arguments(1)
  End If
Else
  WScript.Echo "Usage: processcert-coc.vbs <JOB> [selectedTransactionIndices]"
  WScript.Quit 1
End If

On Error Resume Next
conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
If Err.Number <> 0 Then
  WScript.Echo "Error: Connection failed - " & Err.Description
  WScript.Quit 1
End If
On Error GoTo 0

' ============================================================================
' STEP 1: FETCH DOWNSTREAM COMPLETIONS (J52)
' Query ITEM_HISTORY for all J52 rows for the given job
' ============================================================================
Dim sqlStep1
sqlStep1 = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, SERIAL_NUMBER " & _
           "FROM ITEM_HISTORY " & _
           "WHERE JOB = '" & job & "' " & _
           "AND CODE_TRANSACTION = 'J52' " & _
           "ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY"

Set rs = conn.Execute(sqlStep1)
If Err.Number <> 0 Then
  WScript.Echo "Error in Step 1 query: " & Err.Description
  conn.Close
  WScript.Quit 1
End If

Dim j52JSON, j52Index
j52JSON = "["
j52Index = 0

Do While Not rs.EOF
  If j52Index > 0 Then j52JSON = j52JSON & ","
  
  j52JSON = j52JSON & "{" & _
    """index"":" & j52Index & "," & _
    """dateHistory"":" & QuoteJSON(rs("DATE_HISTORY")) & "," & _
    """timeItemHistory"":" & QuoteJSON(rs("TIME_ITEM_HISTORY")) & "," & _
    """part"":" & QuoteJSON(rs("PART")) & "," & _
    """quantity"":" & rs("QUANTITY") & "," & _
    """job"":" & QuoteJSON(rs("JOB")) & "," & _
    """suffix"":" & QuoteJSON(rs("SUFFIX")) & "," & _
    """serialNumber"":" & QuoteJSON(rs("SERIAL_NUMBER")) & _
    "}"
  
  j52Index = j52Index + 1
  rs.MoveNext
Loop

rs.Close
j52JSON = j52JSON & "]"

' ============================================================================
' STEP 2: ACCEPT SELECTED TRANSACTIONS (No database work)
' Parse selectedIndicesStr (comma-separated list of indices to include)
' ============================================================================
Dim selectedIndicesJSON
selectedIndicesJSON = "[]"

If selectedIndicesStr <> "" Then
  selectedIndicesJSON = "[" & selectedIndicesStr & "]"
End If

' ============================================================================
' STEP 3: BUILD FIRST-LEVEL CHAIN OF CUSTODY
' For each selected J52 row:
'   3A - Parse child job from SERIAL_NUMBER
'   3B - Match child job's J52 row
'   3C - Load child job header
'   3D - Load child job material pulls
'   3E - Match parent operation
'   3F - Join router line
'   3G - Join job detail for PO
'   3H - Output JSON structure
' ============================================================================
Dim cocJSON, cocCount
cocJSON = "["
cocCount = 0

' Re-execute Step 1 to iterate through selected rows
Set rs = conn.Execute(sqlStep1)

Dim currentIndex
currentIndex = 0

Do While Not rs.EOF
  ' Check if this row index should be included
  Dim isSelected
  isSelected = False
  
  If selectedIndicesStr = "" Then
    isSelected = True
  ElseIf InStr("," & selectedIndicesStr & ",", "," & currentIndex & ",") > 0 Then
    isSelected = True
  End If
  
  If isSelected Then
    ' Extract parent J52 row data
    Dim parentJob, parentSuffix, parentSerialNum, parentDateHist, parentTimeHist
    parentJob = rs("JOB")
    parentSuffix = rs("SUFFIX")
    parentSerialNum = rs("SERIAL_NUMBER")
    parentDateHist = rs("DATE_HISTORY")
    parentTimeHist = rs("TIME_ITEM_HISTORY")
    
    ' 3A - Find child job from itemHistory material pulls (J55/J50/J51)
    ' Query itemHistory for the parent to find material pulls
    Dim childJob, childSuffix, childSerialNum, skipThisParent
    Dim rsChild, sqlChild
    
    skipThisParent = False
    
    sqlChild = "SELECT SERIAL_NUMBER FROM ITEM_HISTORY " & _
               "WHERE JOB = '" & parentJob & "' " & _
               "AND SUFFIX = '" & parentSuffix & "' " & _
               "AND CODE_TRANSACTION IN ('J55', 'J50', 'J51') " & _
               "AND DATE_HISTORY = '" & parentDateHist & "' " & _
               "ORDER BY TIME_ITEM_HISTORY ASC"
    
    Set rsChild = conn.Execute(sqlChild)
    
    ' Loop through material pulls until we find one that looks like a job (JJJJJJ-SSS format)
    Dim foundValidChild
    foundValidChild = False
    
    Do While Not rsChild.EOF
      childSerialNum = rsChild("SERIAL_NUMBER")
      
      ' Parse potential child serial number: Format JJJJJJ-SSS (6-digit job, hyphen, 3-digit suffix)
      ' Extract the parts: position 1-6 for job, position 8-10 for suffix (position 7 is hyphen)
      childJob = Trim(Mid(childSerialNum, 1, 6))
      childSuffix = Trim(Mid(childSerialNum, 8, 3))
      
      ' Simplified validation: 
      ' 1. Both job and suffix must be exactly 6 and 3 digits respectively
      ' 2. Must be all digits (no PO refs, no special chars)
      ' 3. Cannot be the same as parent
      If Len(childJob) = 6 And Len(childSuffix) = 3 And _
         IsAllDigits(childJob) And IsAllDigits(childSuffix) And _
         Not (childJob = parentJob And childSuffix = parentSuffix) Then
        foundValidChild = True
        Exit Do
      End If
      
      rsChild.MoveNext
    Loop
    
    rsChild.Close
    
    If Not foundValidChild Then
      skipThisParent = True
    End If
    
    ' If we determined to skip this parent, move to next row
    If Not skipThisParent Then
      ' 3B - Match child job's J52 row
      Dim childJ52JSON
      childJ52JSON = GetChildJ52JSON(conn, childJob, childSuffix, parentDateHist, parentTimeHist)
    
      ' 3C - Load child job header
      Dim childHeaderJSON
      childHeaderJSON = GetChildHeaderJSON(conn, childJob, childSuffix)
      
      ' 3D - Load child job material pulls
      Dim materialPullsJSON
      materialPullsJSON = GetMaterialPullsJSON(conn, childJob, childSuffix)
      
      ' 3E - Match parent operation
      Dim operationJSON
      operationJSON = GetParentOperationJSON(conn, parentJob, parentSuffix, parentDateHist)
      
      ' Build the parent_j52 object
      Dim parentJ52JSON
      parentJ52JSON = "{" & _
        """dateHistory"":" & QuoteJSON(parentDateHist) & "," & _
        """timeItemHistory"":" & QuoteJSON(parentTimeHist) & "," & _
        """part"":" & QuoteJSON(rs("PART")) & "," & _
        """quantity"":" & rs("QUANTITY") & "," & _
        """job"":" & QuoteJSON(parentJob) & "," & _
        """suffix"":" & QuoteJSON(parentSuffix) & "," & _
        """serialNumber"":" & QuoteJSON(parentSerialNum) & _
        "}"
      
      ' Build CoC entry (add comma if not first)
      If cocCount > 0 Then cocJSON = cocJSON & ","
      
      cocJSON = cocJSON & "{" & _
        """parent_j52"":" & parentJ52JSON & "," & _
        """operation"":" & operationJSON & "," & _
        """child_job"":{" & _
          """job"":" & QuoteJSON(childJob) & "," & _
          """suffix"":" & QuoteJSON(childSuffix) & "," & _
          """header"":" & childHeaderJSON & "," & _
          """child_j52"":" & childJ52JSON & "," & _
          """material_pulls"":" & materialPullsJSON & _
        "}" & _
        "}"
      
      cocCount = cocCount + 1
    End If
  End If
  
  currentIndex = currentIndex + 1
  rs.MoveNext
Loop

rs.Close
cocJSON = cocJSON & "]"

' ============================================================================
' Output Results as JSON
' ============================================================================
Dim output
output = "{" & _
  """success"":true," & _
  """step1_j52_transactions"":" & j52JSON & "," & _
  """selectedIndices"":" & selectedIndicesJSON & "," & _
  """step3_coc_links"":" & cocJSON & _
  "}"

WScript.Echo output
conn.Close
WScript.Quit 0

' ============================================================================
' Helper Functions
' ============================================================================

Function QuoteJSON(val)
  QuoteJSON = """" & EscapeJSON(CStr(val)) & """"
End Function

Function EscapeJSON(str)
  Dim result
  result = Replace(str, "\", "\\")
  result = Replace(result, """", "\""")
  result = Replace(result, Chr(13), "\r")
  result = Replace(result, Chr(10), "\n")
  result = Replace(result, Chr(9), "\t")
  EscapeJSON = result
End Function

' ============================================================================
' Format JSON string with indentation and line breaks for readability
' ============================================================================
Function FormatJSON(jsonStr)
  Dim formatted, i, char, indent, inString, prevChar
  formatted = ""
  indent = 0
  inString = False
  
  For i = 1 To Len(jsonStr)
    char = Mid(jsonStr, i, 1)
    If i > 1 Then
      prevChar = Mid(jsonStr, i - 1, 1)
    Else
      prevChar = ""
    End If
    
    ' Track if we're inside a string literal
    If char = """" And prevChar <> "\" Then
      inString = Not inString
    End If
    
    ' Only process formatting outside of strings
    If Not inString Then
      If char = "{" Or char = "[" Then
        formatted = formatted & char & vbCrLf & String((indent + 1) * 2, " ")
        indent = indent + 1
      ElseIf char = "}" Or char = "]" Then
        indent = indent - 1
        ' Remove trailing spaces and newline before closing bracket
        formatted = Trim(formatted)
        If Right(formatted, 2) = vbCrLf Then
          formatted = Left(formatted, Len(formatted) - 2)
        End If
        formatted = formatted & vbCrLf & String(indent * 2, " ") & char
      ElseIf char = "," Then
        formatted = formatted & char & vbCrLf & String(indent * 2, " ")
      ElseIf char = ":" Then
        formatted = formatted & char & " "
      ElseIf char <> " " And char <> vbTab And char <> vbCrLf Then
        formatted = formatted & char
      End If
    Else
      formatted = formatted & char
    End If
  Next
  
  FormatJSON = formatted
End Function

' ============================================================================
' 3B - Match child job's J52 row
' Query ITEM_HISTORY with:
'   JOB = childJob, SUFFIX = childSuffix, CODE_TRANSACTION = 'J52'
'   DATE_HISTORY = parentDateHist, TIME_ITEM_HISTORY = parentTimeHist
' ============================================================================
Function GetChildJ52JSON(conn, childJob, childSuffix, dateHist, timeHist)
  Dim sql, rs, result

  sql = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, SERIAL_NUMBER " & _
        "FROM ITEM_HISTORY " & _
        "WHERE JOB = '" & childJob & "' " & _
        "AND SUFFIX = '" & childSuffix & "' " & _
        "AND CODE_TRANSACTION = 'J52' " & _
        "AND DATE_HISTORY = '" & dateHist & "' " & _
        "AND TIME_ITEM_HISTORY = '" & timeHist & "'"

  Set rs = conn.Execute(sql)

  If rs.EOF Then
    GetChildJ52JSON = "{}"
    Exit Function
  End If

  result = "{""dateHistory"":""" & rs("DATE_HISTORY") & """," & _
           """timeItemHistory"":""" & rs("TIME_ITEM_HISTORY") & """," & _
           """part"":""" & rs("PART") & """," & _
           """quantity"":" & rs("QUANTITY") & "," & _
           """job"":""" & rs("JOB") & """," & _
           """suffix"":""" & rs("SUFFIX") & """," & _
           """serialNumber"":""" & rs("SERIAL_NUMBER") & """}"

  GetChildJ52JSON = result
End Function

' ============================================================================
' 3C - Load child job header
' Query JOB_HEADER for PART, PART_DESCRIPTION, ROUTER
' ============================================================================
Function GetChildHeaderJSON(conn, childJob, childSuffix)
  Dim sql, rs, result

  sql = "SELECT PART, PART_DESCRIPTION, ROUTER " & _
        "FROM JOB_HEADER " & _
        "WHERE JOB = '" & childJob & "' " & _
        "AND SUFFIX = '" & childSuffix & "'"

  Set rs = conn.Execute(sql)

  If rs.EOF Then
    GetChildHeaderJSON = "{}"
    Exit Function
  End If

  result = "{""part"":""" & rs("PART") & """," & _
           """description"":""" & rs("PART_DESCRIPTION") & """," & _
           """router"":""" & rs("ROUTER") & """}"

  GetChildHeaderJSON = result
End Function

' ============================================================================
' 3D - Load child job material pulls
' Query ITEM_HISTORY for J55, J50, J51 rows
' ============================================================================
Function GetMaterialPullsJSON(conn, childJob, childSuffix)
  Dim sql, rs, result, first

  sql = "SELECT PART, QUANTITY, CODE_TRANSACTION, DATE_HISTORY, TIME_ITEM_HISTORY, SERIAL_NUMBER " & _
        "FROM ITEM_HISTORY " & _
        "WHERE JOB = '" & childJob & "' " & _
        "AND SUFFIX = '" & childSuffix & "' " & _
        "AND CODE_TRANSACTION IN ('J55','J50','J51') " & _
        "ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY"

  Set rs = conn.Execute(sql)

  result = "[" : first = True

  Do While Not rs.EOF
    If Not first Then result = result & ","
    first = False

    result = result & "{" & _
      """part"":""" & rs("PART") & """," & _
      """quantity"":" & rs("QUANTITY") & "," & _
      """codeTransaction"":""" & rs("CODE_TRANSACTION") & """," & _
      """dateHistory"":""" & rs("DATE_HISTORY") & """," & _
      """timeItemHistory"":""" & rs("TIME_ITEM_HISTORY") & """," & _
      """serialNumber"":""" & rs("SERIAL_NUMBER") & """}"

    rs.MoveNext
  Loop

  result = result & "]"
  GetMaterialPullsJSON = result
End Function

' ============================================================================
' 3E - Match parent operation
' Query rules:
'   1️⃣ TRY ACTIVE OPERATIONS (JOB_OPERATIONS)
'      JOB = parentJob, SUFFIX = parentSuffix, LMO IN ('L','O'), SEQ < '990000'
'      DATE_COMPLETED <= parentDateHist OR DATE_COMPLETED IS NULL
'      ORDER BY DATE_COMPLETED DESC, SEQ DESC, TOP 1
'
'   2️⃣ IF NO ROWS, TRY ARCHIVED OPERATIONS (JOB_HIST_OPS)
'      JOB = parentJob, SUFFIX = parentSuffix
'      ORDER BY SEQ DESC, TOP 1
'
'   3️⃣ FALLBACK TO EMPTY (allows router lookup)
'
' Then 3F-3G: Join ROUTER_LINE and JOB_DETAIL
' ============================================================================
Function GetParentOperationJSON(conn, parentJob, parentSuffix, parentDateHist)
  Dim result, sqlOps, rsOps, sqlHist, rsHist
  Dim seq, operation, router, routerSeq
  Dim sqlRouter, rsRouter, routerDesc, partWcOutside
  Dim isOutside, sqlDetail, rsDetail, poNumber

  ' ============================================================
  ' 1️⃣ TRY ACTIVE OPERATIONS (JOB_OPERATIONS)
  ' ============================================================
  sqlOps = "SELECT TOP 1 SEQ, OPERATION, ROUTER, ROUTER_SEQ " & _
           "FROM JOB_OPERATIONS " & _
           "WHERE JOB = '" & parentJob & "' " & _
           "AND SUFFIX = '" & parentSuffix & "' " & _
           "AND LMO IN ('L','O') " & _
           "AND SEQ < '990000' " & _
           "AND (DATE_COMPLETED IS NULL OR DATE_COMPLETED <= '" & parentDateHist & "') " & _
           "ORDER BY DATE_COMPLETED DESC, SEQ DESC"

  Set rsOps = conn.Execute(sqlOps)

  If Not rsOps.EOF Then
    seq = rsOps("SEQ")
    operation = rsOps("OPERATION")
    router = rsOps("ROUTER")
    routerSeq = rsOps("ROUTER_SEQ")
  Else
    ' ============================================================
    ' 2️⃣ TRY ARCHIVED OPERATIONS (JOB_HIST_OPS)
    ' ============================================================
    sqlHist = "SELECT TOP 1 SEQ, OPERATION, ROUTER, ROUTER_SEQ " & _
              "FROM JOB_HIST_OPS " & _
              "WHERE JOB = '" & parentJob & "' " & _
              "AND SUFFIX = '" & parentSuffix & "' " & _
              "ORDER BY SEQ DESC"

    Set rsHist = conn.Execute(sqlHist)

    If Not rsHist.EOF Then
      seq = rsHist("SEQ")
      operation = rsHist("OPERATION")
      router = rsHist("ROUTER")
      routerSeq = rsHist("ROUTER_SEQ")
    Else
      ' ============================================================
      ' 3️⃣ FALLBACK TO EMPTY (allows router lookup)
      ' ============================================================
      seq = ""
      operation = ""
      router = ""
      routerSeq = ""
    End If
  End If

  ' ============================================================
  ' 4️⃣ LOOK UP ROUTER DESCRIPTION (IF WE HAVE ROUTER INFO)
  ' ============================================================
  routerDesc = ""
  partWcOutside = "N"

  If router <> "" And routerSeq <> "" Then
    sqlRouter = "SELECT DESC_RT_LINE, PART_WC_OUTSIDE " & _
                "FROM ROUTER_LINE " & _
                "WHERE ROUTER = '" & router & "' " & _
                "AND LINE_ROUTER = '" & routerSeq & "'"

    Set rsRouter = conn.Execute(sqlRouter)

    If Not rsRouter.EOF Then
      routerDesc = rsRouter("DESC_RT_LINE")
      partWcOutside = rsRouter("PART_WC_OUTSIDE")
    End If
  End If

  ' ============================================================
  ' 5️⃣ OUTSIDE PROCESSING (JOB_DETAIL)
  ' ============================================================
  poNumber = ""

  If partWcOutside = "Y" Then
    sqlDetail = "SELECT REFERENCE " & _
                "FROM JOB_DETAIL " & _
                "WHERE JOB = '" & parentJob & "' " & _
                "AND SUFFIX = '" & parentSuffix & "' " & _
                "AND OPERATION = '" & operation & "'"

    Set rsDetail = conn.Execute(sqlDetail)

    If Not rsDetail.EOF Then
      poNumber = rsDetail("REFERENCE")
    End If
  End If

  ' ============================================================
  ' 6️⃣ BUILD JSON RESULT
  ' ============================================================
  result = "{""seq"":""" & seq & """," & _
           """operation"":""" & operation & """," & _
           """router"":""" & router & """," & _
           """routerSeq"":""" & routerSeq & """," & _
           """description"":""" & routerDesc & """," & _
           """outsideProcessing"":""" & partWcOutside & """," & _
           """poNumber"":""" & poNumber & """}"

  GetParentOperationJSON = result
End Function

' ============================================================
' GET CHILD OPERATION JSON (with 6-step fallback logic)
' Matches parent operation for a child job with timezone/date cutoff
' ============================================================
Function GetChildOperationJSON(conn, childJob, childSuffix, cutoffDate)
  Dim sqlOps, rsOps, sqlHist, rsHist
  Dim seq, operation, router, routerSeq
  Dim sqlRouter, rsRouter, routerDesc, partWcOutside
  Dim sqlDetail, rsDetail, poNumber

  ' ============================================================
  ' 1️⃣ ACTIVE OPERATIONS
  ' ============================================================
  sqlOps = "SELECT TOP 1 SEQ, OPERATION, ROUTER, ROUTER_SEQ, DESCRIPTION, " & _
           "UNITS_OPEN, UNITS_COMPLETE, UNITS_SCRAP, DATE_COMPLETED " & _
           "FROM JOB_OPERATIONS " & _
           "WHERE JOB = '" & childJob & "' " & _
           "AND SUFFIX = '" & childSuffix & "' " & _
           "AND SEQ < 990000 " & _
           "AND (DATE_COMPLETED IS NULL OR DATE_COMPLETED <= '" & cutoffDate & "') " & _
           "ORDER BY DATE_COMPLETED DESC, SEQ DESC"

  Set rsOps = conn.Execute(sqlOps)

  If Not rsOps.EOF Then
    seq = rsOps("SEQ")
    operation = rsOps("OPERATION")
    router = rsOps("ROUTER")
    routerSeq = rsOps("ROUTER_SEQ")
  Else
    ' ============================================================
    ' 2️⃣ ARCHIVED OPERATIONS
    ' ============================================================
    sqlHist = "SELECT TOP 1 SEQ, OPERATION, ROUTER, ROUTER_SEQ, DESCRIPTION, " & _
              "UNITS_OPEN, UNITS_COMPLETE, UNITS_SCRAP, DATE_COMPLETED " & _
              "FROM JOB_HIST_OPS " & _
              "WHERE JOB = '" & childJob & "' " & _
              "AND SUFFIX = '" & childSuffix & "' " & _
              "ORDER BY SEQ DESC"

    Set rsHist = conn.Execute(sqlHist)

    If Not rsHist.EOF Then
      seq = rsHist("SEQ")
      operation = rsHist("OPERATION")
      router = rsHist("ROUTER")
      routerSeq = rsHist("ROUTER_SEQ")
    Else
      ' ============================================================
      ' 3️⃣ ROUTER FALLBACK
      ' ============================================================
      seq = ""
      operation = ""
      router = ""
      routerSeq = ""
    End If
  End If

  ' ============================================================
  ' 4️⃣ ROUTER DESCRIPTION
  ' ============================================================
  routerDesc = ""
  partWcOutside = "N"

  If router <> "" And routerSeq <> "" Then
    sqlRouter = "SELECT DESC_RT_LINE, PART_WC_OUTSIDE " & _
                "FROM ROUTER_LINE " & _
                "WHERE ROUTER = '" & router & "' " & _
                "AND LINE_ROUTER = '" & routerSeq & "'"

    Set rsRouter = conn.Execute(sqlRouter)

    If Not rsRouter.EOF Then
      routerDesc = rsRouter("DESC_RT_LINE")
      partWcOutside = rsRouter("PART_WC_OUTSIDE")
    End If
  End If

  ' ============================================================
  ' 5️⃣ OUTSIDE PROCESSING PO LOOKUP
  ' ============================================================
  poNumber = ""

  If partWcOutside = "Y" Then
    sqlDetail = "SELECT REFERENCE FROM JOB_DETAIL " & _
                "WHERE JOB = '" & childJob & "' " & _
                "AND SUFFIX = '" & childSuffix & "' " & _
                "AND OPERATION = '" & operation & "'"

    Set rsDetail = conn.Execute(sqlDetail)

    If Not rsDetail.EOF Then
      poNumber = rsDetail("REFERENCE")
    End If
  End If

  ' ============================================================
  ' 6️⃣ BUILD JSON
  ' ============================================================
  GetChildOperationJSON = "{""seq"":""" & seq & """," & _
                          """operation"":""" & operation & """," & _
                          """router"":""" & router & """," & _
                          """routerSeq"":""" & routerSeq & """," & _
                          """description"":""" & routerDesc & """," & _
                          """outsideProcessing"":""" & partWcOutside & """," & _
                          """poNumber"":""" & poNumber & """}"
End Function

' ============================================================
' HELPER: Check if string contains only digits
' ============================================================
Function IsAllDigits(val)
  Dim i, char
  If Len(val) = 0 Then
    IsAllDigits = False
    Exit Function
  End If
  
  For i = 1 To Len(val)
    char = Mid(val, i, 1)
    If char < "0" Or char > "9" Then
      IsAllDigits = False
      Exit Function
    End If
  Next
  
  IsAllDigits = True
End Function
