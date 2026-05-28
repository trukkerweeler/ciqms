' processcert-coc.vbs
' Implements Steps 1-3 of GlobalCert Chain-of-Custody extraction
' Designed for use by processcert.html frontend
'
' Step 1: Fetch Inventory Transactions (J52) — suffix-agnostic for given JOB
' Step 2: Accept selected transactions from frontend
' Step 3: Build first-level chain-of-custody links only
'
' Usage: cscript //Nologo processcert-coc.vbs <JOB> [selectedTransactionIndices]
' Example: cscript //Nologo processcert-coc.vbs 122166 0,1,3
'
' Returns: JSON structure with Step 1 transactions, selections, and CoC links

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

Dim job, selectedIndicesStr
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
' STEP 1: Fetch Inventory Transactions (J52)
' Query ITEM_HISTORY for J52 rows matching JOB (suffix-agnostic)
' ============================================================================
Dim j52Transactions
Set j52Transactions = CreateObject("Scripting.Collection")

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

Dim transactionIndex
transactionIndex = 0
Dim transactionObj

Do While Not rs.EOF
  Set transactionObj = CreateObject("Scripting.Dictionary")
  transactionObj("index") = transactionIndex
  transactionObj("dateHistory") = rs("DATE_HISTORY")
  transactionObj("timeItemHistory") = rs("TIME_ITEM_HISTORY")
  transactionObj("part") = rs("PART")
  transactionObj("quantity") = rs("QUANTITY")
  transactionObj("job") = rs("JOB")
  transactionObj("suffix") = rs("SUFFIX")
  transactionObj("serialNumber") = rs("SERIAL_NUMBER")
  
  j52Transactions.Add transactionObj
  transactionIndex = transactionIndex + 1
  rs.MoveNext
Loop

rs.Close

' ============================================================================
' STEP 2: Accept Selected Transactions from Frontend
' Parse selectedIndicesStr (comma-separated list of indices to include)
' ============================================================================
Dim selectedIndices
Set selectedIndices = CreateObject("Scripting.Dictionary")

If selectedIndicesStr <> "" Then
  Dim indicesParts
  indicesParts = Split(selectedIndicesStr, ",")
  Dim idx
  For idx = 0 To UBound(indicesParts)
    selectedIndices(Trim(indicesParts(idx))) = True
  Next
Else
  ' If no selection provided, select all transactions
  Dim i
  For i = 0 To j52Transactions.Count - 1
    selectedIndices(i) = True
  Next
End If

' ============================================================================
' STEP 3: Build Initial Chain-of-Custody Links
' For each selected J52 transaction, load:
'  - Child job header (JOB_HEADER) using SERIAL_NUMBER
'  - Child job's J52 rows (its own completions)
'  - Child job's material pulls (J55, J50, J51)
' STOP HERE - no recursion beyond one level
' ============================================================================
Dim cocLinks
Set cocLinks = CreateObject("Scripting.Collection")

Dim childJob, childSuffix, childSerialNum, dateHist, timeHist
For i = 1 To j52Transactions.Count
  Dim currentTxn
  Set currentTxn = j52Transactions(i)
  
  ' Check if this transaction is selected
  If selectedIndices.Exists(currentTxn("index") - 1) Or selectedIndices.Exists(CStr(currentTxn("index") - 1)) Then
    
    ' Extract values from selected J52 transaction
    childSerialNum = currentTxn("serialNumber")
    dateHist = currentTxn("dateHistory")
    timeHist = currentTxn("timeItemHistory")
    Dim parentSuffix
    parentSuffix = currentTxn("suffix")
    
    ' Create CoC link object for this parent→child relationship
    Dim cocLink
    Set cocLink = CreateObject("Scripting.Dictionary")
    cocLink("parentJob") = job
    cocLink("parentSuffix") = parentSuffix
    cocLink("j52Transaction") = currentTxn
    
    ' Load child job header from JOB_HEADER using SERIAL_NUMBER
    Dim sqlChildHeader
    sqlChildHeader = "SELECT JOB, SUFFIX, SERIAL_NUMBER, PART, QUANTITY " & _
                     "FROM JOB_HEADER " & _
                     "WHERE SERIAL_NUMBER = '" & childSerialNum & "'"
    
    Set rs = conn.Execute(sqlChildHeader)
    Dim childJobHeader
    Set childJobHeader = CreateObject("Scripting.Dictionary")
    
    If Not rs.EOF Then
      childJobHeader("job") = rs("JOB")
      childJobHeader("suffix") = rs("SUFFIX")
      childJobHeader("serialNumber") = rs("SERIAL_NUMBER")
      childJobHeader("part") = rs("PART")
      childJobHeader("quantity") = rs("QUANTITY")
      
      childJob = rs("JOB")
      childSuffix = rs("SUFFIX")
    End If
    rs.Close
    
    cocLink("childJobHeader") = childJobHeader
    
    ' Load child job's J52 rows (its own completions)
    Dim sqlChildJ52
    sqlChildJ52 = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, SERIAL_NUMBER " & _
                  "FROM ITEM_HISTORY " & _
                  "WHERE SERIAL_NUMBER = '" & childSerialNum & "' " & _
                  "AND CODE_TRANSACTION = 'J52' " & _
                  "ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY"
    
    Set rs = conn.Execute(sqlChildJ52)
    Dim childJ52Rows
    Set childJ52Rows = CreateObject("Scripting.Collection")
    
    Do While Not rs.EOF
      Dim childJ52Obj
      Set childJ52Obj = CreateObject("Scripting.Dictionary")
      childJ52Obj("dateHistory") = rs("DATE_HISTORY")
      childJ52Obj("timeItemHistory") = rs("TIME_ITEM_HISTORY")
      childJ52Obj("part") = rs("PART")
      childJ52Obj("quantity") = rs("QUANTITY")
      childJ52Obj("job") = rs("JOB")
      childJ52Obj("suffix") = rs("SUFFIX")
      childJ52Obj("serialNumber") = rs("SERIAL_NUMBER")
      
      childJ52Rows.Add childJ52Obj
      rs.MoveNext
    Loop
    rs.Close
    
    cocLink("childJ52Rows") = childJ52Rows
    
    ' Load child job's material pulls (J55, J50, J51)
    Dim materialPulls
    Set materialPulls = CreateObject("Scripting.Dictionary")
    
    ' J55 - Material Issue
    Dim j55Rows
    Set j55Rows = CreateObject("Scripting.Collection")
    Dim sqlJ55
    sqlJ55 = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, CODE_TRANSACTION " & _
             "FROM ITEM_HISTORY " & _
             "WHERE JOB = '" & childJob & "' " & _
             "AND SUFFIX = '" & childSuffix & "' " & _
             "AND CODE_TRANSACTION = 'J55' " & _
             "ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY"
    
    Set rs = conn.Execute(sqlJ55)
    Do While Not rs.EOF
      Dim j55Obj
      Set j55Obj = CreateObject("Scripting.Dictionary")
      j55Obj("dateHistory") = rs("DATE_HISTORY")
      j55Obj("timeItemHistory") = rs("TIME_ITEM_HISTORY")
      j55Obj("part") = rs("PART")
      j55Obj("quantity") = rs("QUANTITY")
      j55Obj("job") = rs("JOB")
      j55Obj("suffix") = rs("SUFFIX")
      j55Obj("codeTransaction") = rs("CODE_TRANSACTION")
      
      j55Rows.Add j55Obj
      rs.MoveNext
    Loop
    rs.Close
    
    materialPulls("j55") = j55Rows
    
    ' J50 - Lot Issue
    Dim j50Rows
    Set j50Rows = CreateObject("Scripting.Collection")
    Dim sqlJ50
    sqlJ50 = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, CODE_TRANSACTION " & _
             "FROM ITEM_HISTORY " & _
             "WHERE JOB = '" & childJob & "' " & _
             "AND SUFFIX = '" & childSuffix & "' " & _
             "AND CODE_TRANSACTION = 'J50' " & _
             "ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY"
    
    Set rs = conn.Execute(sqlJ50)
    Do While Not rs.EOF
      Dim j50Obj
      Set j50Obj = CreateObject("Scripting.Dictionary")
      j50Obj("dateHistory") = rs("DATE_HISTORY")
      j50Obj("timeItemHistory") = rs("TIME_ITEM_HISTORY")
      j50Obj("part") = rs("PART")
      j50Obj("quantity") = rs("QUANTITY")
      j50Obj("job") = rs("JOB")
      j50Obj("suffix") = rs("SUFFIX")
      j50Obj("codeTransaction") = rs("CODE_TRANSACTION")
      
      j50Rows.Add j50Obj
      rs.MoveNext
    Loop
    rs.Close
    
    materialPulls("j50") = j50Rows
    
    ' J51 - Heat/Lot Issue
    Dim j51Rows
    Set j51Rows = CreateObject("Scripting.Collection")
    Dim sqlJ51
    sqlJ51 = "SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, CODE_TRANSACTION " & _
             "FROM ITEM_HISTORY " & _
             "WHERE JOB = '" & childJob & "' " & _
             "AND SUFFIX = '" & childSuffix & "' " & _
             "AND CODE_TRANSACTION = 'J51' " & _
             "ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY"
    
    Set rs = conn.Execute(sqlJ51)
    Do While Not rs.EOF
      Dim j51Obj
      Set j51Obj = CreateObject("Scripting.Dictionary")
      j51Obj("dateHistory") = rs("DATE_HISTORY")
      j51Obj("timeItemHistory") = rs("TIME_ITEM_HISTORY")
      j51Obj("part") = rs("PART")
      j51Obj("quantity") = rs("QUANTITY")
      j51Obj("job") = rs("JOB")
      j51Obj("suffix") = rs("SUFFIX")
      j51Obj("codeTransaction") = rs("CODE_TRANSACTION")
      
      j51Rows.Add j51Obj
      rs.MoveNext
    Loop
    rs.Close
    
    materialPulls("j51") = j51Rows
    
    cocLink("materialPulls") = materialPulls
    
    ' Add complete CoC link to collection
    cocLinks.Add cocLink
  End If
Next

' ============================================================================
' Output Results as JSON for processcert.html
' ============================================================================
Dim output
output = "{"
output = output & """success"": true, "
output = output & """step1_j52_transactions"": " & CollectionToJSON(j52Transactions) & ", "
output = output & """selectedIndices"": " & ArrayToJSON(selectedIndicesStr) & ", "
output = output & """step3_coc_links"": " & CocLinksToJSON(cocLinks)
output = output & "}"

WScript.Echo output

conn.Close

' ============================================================================
' Helper Functions for JSON Conversion
' ============================================================================

Function DictionaryToJSON(dict)
  Dim result, key
  result = "{"
  Dim first
  first = True
  For Each key In dict.Keys
    If Not first Then result = result & ", "
    result = result & """" & key & """: " & ValueToJSON(dict(key))
    first = False
  Next
  result = result & "}"
  DictionaryToJSON = result
End Function

Function CollectionToJSON(col)
  Dim result, i
  result = "["
  For i = 1 To col.Count
    If i > 1 Then result = result & ", "
    result = result & ValueToJSON(col(i))
  Next
  result = result & "]"
  CollectionToJSON = result
End Function

Function ValueToJSON(val)
  If TypeName(val) = "Dictionary" Then
    ValueToJSON = DictionaryToJSON(val)
  ElseIf TypeName(val) = "Collection" Then
    ValueToJSON = CollectionToJSON(val)
  ElseIf VarType(val) = 8 Then ' String
    ValueToJSON = """" & EscapeJSON(val) & """"
  ElseIf IsNull(val) Then
    ValueToJSON = "null"
  Else
    ValueToJSON = val
  End If
End Function

Function ArrayToJSON(arr)
  If arr = "" Then
    ArrayToJSON = "[]"
  Else
    Dim parts, i, result
    parts = Split(arr, ",")
    result = "["
    For i = 0 To UBound(parts)
      If i > 0 Then result = result & ", "
      result = result & Trim(parts(i))
    Next
    result = result & "]"
    ArrayToJSON = result
  End If
End Function

Function CocLinksToJSON(col)
  Dim result, i
  result = "["
  For i = 1 To col.Count
    If i > 1 Then result = result & ", "
    result = result & DictionaryToJSON(col(i))
  Next
  result = result & "]"
  CocLinksToJSON = result
End Function

Function EscapeJSON(str)
  Dim result
  result = Replace(str, "\", "\\")
  result = Replace(result, """", "\""")
  result = Replace(result, "/", "\/")
  result = Replace(result, Chr(8), "\b")
  result = Replace(result, Chr(9), "\t")
  result = Replace(result, Chr(10), "\n")
  result = Replace(result, Chr(12), "\f")
  result = Replace(result, Chr(13), "\r")
  EscapeJSON = result
End Function
