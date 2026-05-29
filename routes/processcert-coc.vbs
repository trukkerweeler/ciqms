' processcert-coc.vbs
' Implements Steps 1-3 of GlobalCert Chain-of-Custody extraction
' Designed for use by processcert.html frontend
'
' Step 1: Fetch Inventory Transactions (J52) from ITEM_HISTORY
' Step 2: Accept selected transactions from frontend (no database work)
' Step 3: Build first-level chain-of-custody links with parent operation, child job, and materials
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

Dim envPath
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

If dsn = "" Or uid = "" Or pwd = "" Then
  WScript.Echo "Error: DSN, UID, or PWD not found in .env file."
  WScript.Quit 1
End If

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

Dim job, suffix, selectedIndicesStr
If WScript.Arguments.Count > 0 Then
  job = WScript.Arguments(0)
  If WScript.Arguments.Count > 1 Then
    suffix = WScript.Arguments(1)
  End If
  If WScript.Arguments.Count > 2 Then
    selectedIndicesStr = WScript.Arguments(2)
  End If
Else
  WScript.Echo "Usage: processcert-coc.vbs <JOB> [SUFFIX] [selectedTransactionIndices]"
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
' If suffix is provided, restrict to that specific job/suffix combo
' ============================================================================
Dim sqlStep1
sqlStep1 = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, SERIAL_NUMBER " & _
           "FROM ITEM_HISTORY " & _
           "WHERE JOB = '" & job & "' " & _
           "AND CODE_TRANSACTION = 'J52' "

If suffix <> "" Then
  sqlStep1 = sqlStep1 & "AND SUFFIX = '" & suffix & "' "
End If

sqlStep1 = sqlStep1 & "ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY"

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
    If cocCount > 0 Then cocJSON = cocJSON & ","
    
    ' Extract parent J52 row data
    Dim parentJob, parentSuffix, parentSerialNum, parentDateHist, parentTimeHist
    parentJob = rs("JOB")
    parentSuffix = rs("SUFFIX")
    parentSerialNum = rs("SERIAL_NUMBER")
    parentDateHist = rs("DATE_HISTORY")
    parentTimeHist = rs("TIME_ITEM_HISTORY")
    
    ' 3A - Parse child job from SERIAL_NUMBER
    ' Format: JJJJJJ-SSS (6-digit job, hyphen, 3-digit suffix, then padding)
    ' Parse by position: job is 1-6, suffix is 8-10 (skip hyphen at position 7)
    Dim childJob, childSuffix
    childJob = Mid(parentSerialNum, 1, 6)
    childSuffix = Mid(parentSerialNum, 8, 3)
    
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
    
    ' Build CoC entry
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
' 3B - Match child job's J52 row
' Query ITEM_HISTORY with:
'   JOB = childJob, SUFFIX = childSuffix, CODE_TRANSACTION = 'J52'
'   DATE_HISTORY = parentDateHist, TIME_ITEM_HISTORY = parentTimeHist
' ============================================================================
Function GetChildJ52JSON(conn, childJob, childSuffix, dateHist, timeHist)
  Dim sqlChild, rsChild, result
  
  sqlChild = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, SERIAL_NUMBER " & _
             "FROM ITEM_HISTORY " & _
             "WHERE JOB = '" & childJob & "' " & _
             "AND SUFFIX = '" & childSuffix & "' " & _
             "AND CODE_TRANSACTION = 'J52' " & _
             "AND DATE_HISTORY = '" & dateHist & "' " & _
             "AND TIME_ITEM_HISTORY = '" & timeHist & "'"
  
  Set rsChild = conn.Execute(sqlChild)
  
  If rsChild.EOF Then
    GetChildJ52JSON = "null"
    rsChild.Close
    Exit Function
  End If
  
  result = "{" & _
    """dateHistory"":" & QuoteJSON(rsChild("DATE_HISTORY")) & "," & _
    """timeItemHistory"":" & QuoteJSON(rsChild("TIME_ITEM_HISTORY")) & "," & _
    """part"":" & QuoteJSON(rsChild("PART")) & "," & _
    """quantity"":" & rsChild("QUANTITY") & "," & _
    """job"":" & QuoteJSON(rsChild("JOB")) & "," & _
    """suffix"":" & QuoteJSON(rsChild("SUFFIX")) & "," & _
    """serialNumber"":" & QuoteJSON(rsChild("SERIAL_NUMBER")) & _
    "}"
  
  rsChild.Close
  GetChildJ52JSON = result
End Function

' ============================================================================
' 3C - Load child job header
' Query JOB_HEADER for PART, PART_DESCRIPTION, ROUTER
' ============================================================================
Function GetChildHeaderJSON(conn, childJob, childSuffix)
  Dim sqlHeader, rsHeader, result
  
  sqlHeader = "SELECT PART, PART_DESCRIPTION, ROUTER " & _
              "FROM JOB_HEADER " & _
              "WHERE JOB = '" & childJob & "' " & _
              "AND SUFFIX = '" & childSuffix & "'"
  
  Set rsHeader = conn.Execute(sqlHeader)
  
  If rsHeader.EOF Then
    GetChildHeaderJSON = "null"
    rsHeader.Close
    Exit Function
  End If
  
  result = "{" & _
    """part"":" & QuoteJSON(rsHeader("PART")) & "," & _
    """description"":" & QuoteJSON(rsHeader("PART_DESCRIPTION")) & "," & _
    """router"":" & QuoteJSON(rsHeader("ROUTER")) & _
    "}"
  
  rsHeader.Close
  GetChildHeaderJSON = result
End Function

' ============================================================================
' 3D - Load child job material pulls
' Query ITEM_HISTORY for J55, J50, J51 rows
' ============================================================================
Function GetMaterialPullsJSON(conn, childJob, childSuffix)
  Dim sql, rsM, result, count
  
  sql = "SELECT PART, QUANTITY, CODE_TRANSACTION, DATE_HISTORY, SERIAL_NUMBER " & _
        "FROM ITEM_HISTORY " & _
        "WHERE JOB = '" & childJob & "' " & _
        "AND SUFFIX = '" & childSuffix & "' " & _
        "AND CODE_TRANSACTION IN ('J55','J50','J51') " & _
        "ORDER BY CODE_TRANSACTION, DATE_HISTORY"
  
  Set rsM = conn.Execute(sql)
  result = "["
  count = 0
  
  Do While Not rsM.EOF
    If count > 0 Then result = result & ","
    result = result & "{" & _
      """part"":" & QuoteJSON(rsM("PART")) & "," & _
      """quantity"":" & rsM("QUANTITY") & "," & _
      """codeTransaction"":" & QuoteJSON(rsM("CODE_TRANSACTION")) & "," & _
      """dateHistory"":" & QuoteJSON(rsM("DATE_HISTORY")) & "," & _
      """serialNumber"":" & QuoteJSON(Trim(Replace(rsM("SERIAL_NUMBER"), Chr(0), ""))) & _
      "}"
    count = count + 1
    rsM.MoveNext
  Loop
  
  rsM.Close
  result = result & "]"
  GetMaterialPullsJSON = result
End Function

' ============================================================================
' 3E - Match parent operation
' Query JOB_OPERATIONS with rules:
'   JOB = parentJob, SUFFIX = parentSuffix
'   LMO IN ('L','O'), SEQ < '990000'
'   DATE_COMPLETED <= parentDateHist OR DATE_COMPLETED IS NULL
'   ORDER BY DATE_COMPLETED DESC, SEQ DESC
'   TOP 1
' Then 3F-3G: Join ROUTER_LINE and JOB_DETAIL
' ============================================================================
Function GetParentOperationJSON(conn, parentJob, parentSuffix, parentDateHist)
  Dim sqlOps, rsOps, result, seq, operation, router, routerSeq
  Dim routerDesc, partWcOutside, poNumber, isOutside
  
  sqlOps = "SELECT TOP 1 SEQ, OPERATION, ROUTER, ROUTER_SEQ " & _
           "FROM JOB_OPERATIONS " & _
           "WHERE JOB = '" & parentJob & "' " & _
           "AND SUFFIX = '" & parentSuffix & "' " & _
           "AND LMO IN ('L','O') " & _
           "AND SEQ < '990000' " & _
           "AND (DATE_COMPLETED IS NULL OR DATE_COMPLETED <= '" & parentDateHist & "') " & _
           "ORDER BY DATE_COMPLETED DESC, SEQ DESC"
  
  Set rsOps = conn.Execute(sqlOps)
  
  If rsOps.EOF Then
    GetParentOperationJSON = "null"
    rsOps.Close
    Exit Function
  End If
  
  seq = rsOps("SEQ")
  operation = rsOps("OPERATION")
  router = rsOps("ROUTER")
  routerSeq = rsOps("ROUTER_SEQ")
  
  rsOps.Close
  
  ' 3F - Join ROUTER_LINE for DESC_RT_LINE and PART_WC_OUTSIDE
  routerDesc = ""
  partWcOutside = ""
  
  Dim sqlRouter, rsRouter
  sqlRouter = "SELECT DESC_RT_LINE, PART_WC_OUTSIDE " & _
              "FROM ROUTER_LINE " & _
              "WHERE ROUTER = '" & router & "' " & _
              "AND LINE_ROUTER = '" & routerSeq & "'"
  
  Set rsRouter = conn.Execute(sqlRouter)
  If Not rsRouter.EOF Then
    routerDesc = rsRouter("DESC_RT_LINE")
    partWcOutside = rsRouter("PART_WC_OUTSIDE")
  End If
  rsRouter.Close
  
  ' 3G - Join JOB_DETAIL for PO if PART_WC_OUTSIDE = 'Y'
  poNumber = ""
  isOutside = False
  
  If partWcOutside = "Y" Then
    isOutside = True
    Dim sqlDetail, rsDetail
    sqlDetail = "SELECT REFERENCE " & _
                "FROM JOB_DETAIL " & _
                "WHERE JOB = '" & parentJob & "' " & _
                "AND SUFFIX = '" & parentSuffix & "' " & _
                "AND OPERATION = '" & operation & "'"
    
    Set rsDetail = conn.Execute(sqlDetail)
    If Not rsDetail.EOF Then
      poNumber = rsDetail("REFERENCE")
    End If
    rsDetail.Close
  End If
  
  ' Build operation JSON
  Dim outsideStr
  If isOutside Then
    outsideStr = "true"
  Else
    outsideStr = "false"
  End If
  
  result = "{" & _
    """seq"":" & QuoteJSON(seq) & "," & _
    """operation"":" & QuoteJSON(operation) & "," & _
    """router_desc"":" & QuoteJSON(routerDesc) & "," & _
    """po_number"":" & QuoteJSON(poNumber) & "," & _
    """outside"":" & outsideStr & _
    "}"
  
  GetParentOperationJSON = result
End Function
