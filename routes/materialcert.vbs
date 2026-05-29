' globalcert.vbs - Query DB for globalcert endpoint, patterned after certpass.vbs
' Usage: cscript //Nologo globalcert.vbs <baseWorkorder> <suffix> <operationCodes>

Dim conn, rs, fso, dsn, uid, pwd, file, WshShell, DocumentsPath, CIQMSPath
On Error Resume Next

Set fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
DocumentsPath = WshShell.SpecialFolders("MyDocuments")
CIQMSPath = DocumentsPath & "\CIQMS"
If UCase(WshShell.ExpandEnvironmentStrings("%COMPUTERNAME%")) = "QUALITY-MGR" Then
  CIQMSPath = DocumentsPath & "\CIQMS1"
End If
Dim envPath
envPath = CIQMSPath & "\.env"
Set file = fso.OpenTextFile(envPath, 1)
If Err.Number <> 0 Then
    Err.Clear
    envPath = CIQMSPath & "\env"  ' Try without extension
    Set file = fso.OpenTextFile(envPath, 1)
End If
If Err.Number <> 0 Then
  MsgBox "Error opening .env file: " & Err.Description
  Err.Clear
  WScript.Quit
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
  MsgBox "Error: DSN, UID, or PWD not found in .env file."
  WScript.Quit
End If

Set conn = CreateObject("ADODB.Connection")
Set rs = CreateObject("ADODB.Recordset")

' get the arguments from the command line
Dim baseWorkorder, baseSuffix, operationCodesStr, codeTransaction, dateHistory, invHistTime, test: test = True
If WScript.Arguments.Count > 0 Then
  baseWorkorder = WScript.Arguments(0)
  If WScript.Arguments.Count > 1 Then
    baseSuffix = WScript.Arguments(1)
  End If
  If WScript.Arguments.Count > 2 Then
    operationCodesStr = WScript.Arguments(2)
  End If
  If WScript.Arguments.Count > 3 Then
    codeTransaction = WScript.Arguments(3)
  End If
  If WScript.Arguments.Count > 4 Then
    dateHistory = WScript.Arguments(4)
  End If
  If WScript.Arguments.Count > 5 Then
    invHistTime = WScript.Arguments(5)
  End If
Else
  If test Then
    baseWorkorder = "122429" ' Example for testing
    baseSuffix = "001" ' Example suffix
    operationCodesStr = "6061,D172" ' Example operations
    codeTransaction = "J55" ' Example transaction code
    dateHistory = "" ' Example: no filter
    invHistTime = "" ' Example: no filter
  Else
    MsgBox "Usage: globalcert.vbs <baseWorkorder> <suffix> <operationCodes> <codeTransaction> [dateHistory] [invHistTime]"
    WScript.Quit
  End If
End If

conn.Open "DSN=" & dsn & ";UID=" & uid & ";PWD=" & pwd
If Err.Number <> 0 Then
  MsgBox "Connection failed: " & Err.Description
  Err.Clear
  WScript.Quit
End If
On Error GoTo 0

If conn.State = 1 Then
  On Error Resume Next
  Dim sqlQuery, operationFilter
  
  ' Build operation filter if operation codes provided
  operationFilter = ""
  If operationCodesStr <> "" Then
    Dim opCodes, i, opList
    opCodes = Split(operationCodesStr, ",")
    opList = ""
    For i = LBound(opCodes) To UBound(opCodes)
      If opList <> "" Then opList = opList & ","
      opList = opList & "'" & Trim(opCodes(i)) & "'"
    Next
    operationFilter = " AND vjo.OPERATION IN (" & opList & ")"
  End If
  
  ' Extract child workorders from inventory FIRST
  Dim childWorkorders, childIdx, childArray, childJobNum, childSuffixStr, childWOName, dictEnum, keyIdx, childSerialNum, childQuery, serialNum, dashPos, childJobStr, childExtractQuery, finalUnionQuery, dictCounter, dateTimeFilter
  Set childWorkorders = CreateObject("Scripting.Dictionary")
  dictCounter = 0
  
  ' Build date/time filter if provided
  dateTimeFilter = ""
  If dateHistory <> "" And invHistTime <> "" Then
    dateTimeFilter = " AND DATE_HISTORY = '" & dateHistory & "' AND INV_HIST_TIME = '" & invHistTime & "'"
  End If
  
  childExtractQuery = "SELECT DISTINCT SERIAL_NUMBER FROM ITEM_HISTORY " & _
    "WHERE JOB = " & CLng(baseWorkorder) & " " & _
    "AND SUFFIX = '000' " & _
    "AND SERIAL_NUMBER <> '' " & _
    "AND SERIAL_NUMBER LIKE '%-___' " & _
    "AND CODE_TRANSACTION = '" & codeTransaction & "' " & _
    "AND SEQUENCE = 990000" & _
    dateTimeFilter
  
  WScript.StdErr.Write "DEBUG CHILD EXTRACT: " & childExtractQuery & vbCrLf
  
  rs.Open childExtractQuery, conn, 3, 1
  If Not rs.EOF Then
    rs.MoveFirst
    While Not rs.EOF
      serialNum = Trim(rs("SERIAL_NUMBER"))
      dashPos = InStr(serialNum, "-")
      If dashPos > 0 Then
        childJobStr = Left(serialNum, dashPos - 1)
        childSuffixStr = Mid(serialNum, dashPos + 1, 3)
        childJobNum = CLng(childJobStr)
        If Not childWorkorders.Exists(dictCounter) Then
          ' Store: [jobNum, suffix, serialNum]
          childWorkorders.Add dictCounter, Array(childJobNum, childSuffixStr, serialNum)
          dictCounter = dictCounter + 1
          WScript.StdErr.Write "Found child WO: " & serialNum & " (Job: " & childJobNum & ", Suffix: " & childSuffixStr & ")" & vbCrLf
        End If
      End If
      rs.MoveNext
    Wend
  End If
  rs.Close
  
  
  ' Build combined result array with child operations
  Dim allData
  Set allData = CreateObject("Scripting.Dictionary")
  childIdx = 0
  
  ' Execute queries for each child work order separately (avoids timeout with large UNION queries)
  If childWorkorders.Count > 0 Then
    For childIdx = 0 To childWorkorders.Count - 1
      childArray = childWorkorders.Item(childIdx)
      childJobNum = childArray(0)
      childSuffixStr = childArray(1)
      childSerialNum = childArray(2)  ' SERIAL_NUMBER now stored in array
      
      childQuery = "SELECT DISTINCT " & _
        "vjo.SEQ, vjo.OPERATION, vjo.ROUTER_SEQ, vrl.DESC_RT_LINE, vjo.DATE_COMPLETED, " & _
        "ABS(vih.QUANTITY) AS QUANTITY, COALESCE(vjd.REFERENCE, '') AS REFERENCE, " & _
        "vrl.PART_WC_OUTSIDE, jh.PART, jh.PART_DESCRIPTION, " & _
        "vih.SERIAL_NUMBER AS SOURCE_WO " & _
        "FROM JOB_HEADER jh " & _
        "LEFT JOIN V_JOB_OPERATIONS vjo ON jh.JOB = vjo.JOB AND jh.SUFFIX = vjo.SUFFIX " & _
        "LEFT JOIN ITEM_HISTORY vih ON vih.JOB = " & CLng(baseWorkorder) & " AND vih.SUFFIX = '000' " & _
          "AND vih.SEQUENCE = 990000 AND vih.CODE_TRANSACTION = '" & codeTransaction & "' " & _
          "AND vih.SERIAL_NUMBER = '" & childSerialNum & "' " & _
        "LEFT JOIN V_ROUTER_LINE vrl ON vjo.ROUTER = vrl.ROUTER AND vjo.ROUTER_SEQ = vrl.LINE_ROUTER " & _
        "LEFT JOIN V_JOB_DETAIL vjd ON vjd.JOB = vjo.JOB AND vjd.SUFFIX = vjo.SUFFIX " & _
        "WHERE jh.JOB = " & childJobNum & " AND jh.SUFFIX = '" & childSuffixStr & "' " & _
        "AND vih.QUANTITY IS NOT NULL AND vjo.LMO IN ('L','O') " & _
        "AND vjo.SEQ < '990000' AND vjo.OPERATION <> '' " & _
        operationFilter & " " & _
        "ORDER BY vjo.SEQ"
      
      WScript.StdErr.Write "DEBUG CHILD OP QUERY: " & childQuery & vbCrLf
      
      Dim childRs
      Set childRs = CreateObject("ADODB.Recordset")
      childRs.Open childQuery, conn, 3, 1
      If Err.Number = 0 And Not childRs.EOF Then
        childRs.MoveFirst
        While Not childRs.EOF
          Dim resRow
          Set resRow = CreateObject("Scripting.Dictionary")
          Dim fld
          For Each fld In childRs.Fields
            resRow.Add fld.Name, fld.Value
          Next
          allData.Add allData.Count, resRow
          childRs.MoveNext
        Wend
      End If
      If childRs.State = 1 Then childRs.Close
      Set childRs = Nothing
      Err.Clear
    Next
    
    ' Output combined results
    If allData.Count > 0 Then
      WScript.StdOut.Write RecordsetToJSON2(allData, baseWorkorder)
    Else
      WScript.StdOut.Write "{""baseWorkorder"":""" & baseWorkorder & """,""data"":[]}"
    End If
  Else
    ' No child workorders found
    WScript.StdOut.Write "{""baseWorkorder"":""" & baseWorkorder & """,""data"":[]}"
  End If
  On Error GoTo 0
End If

' Clean up resources
If Not rs Is Nothing Then
  If rs.State = 1 Then rs.Close
  Set rs = Nothing
End If
If Not conn Is Nothing Then
  If conn.State = 1 Then conn.Close
  Set conn = Nothing
End If

Function RecordsetToJSON(rs, baseWorkorder)
  Dim field, json, record, data
  If rs.EOF Then
    RecordsetToJSON = "{""baseWorkorder"":""" & baseWorkorder & """,""data"":[]}"
    Exit Function
  End If
  data = "["
  Do Until rs.EOF
    record = "{"
    For Each field In rs.Fields
      record = record & """" & field.Name & """: " & ToJSONValue(field.Value) & ","
    Next
    record = Left(record, Len(record) - 1) ' Remove trailing comma
    record = record & "},"
    data = data & record
    rs.MoveNext
  Loop
  If Right(data, 1) = "," Then
    data = Left(data, Len(data) - 1) ' Remove trailing comma
  End If
  data = data & "]"
  json = "{""baseWorkorder"":""" & baseWorkorder & """,""data"":" & data & "}"
  RecordsetToJSON = json
End Function

Function RecordsetToJSON2(dataDict, baseWorkorder)
  Dim json, record, data, idx, field
  data = "["
  For idx = 0 To dataDict.Count - 1
    Set field = dataDict.Item(idx)
    record = "{"
    Dim key
    For Each key In field.Keys
      record = record & """" & key & """: " & ToJSONValue(field.Item(key)) & ","
    Next
    record = Left(record, Len(record) - 1) ' Remove trailing comma
    record = record & "},"
    data = data & record
  Next
  If Right(data, 1) = "," Then
    data = Left(data, Len(data) - 1) ' Remove trailing comma
  End If
  data = data & "]"
  json = "{""baseWorkorder"":""" & baseWorkorder & """,""data"":" & data & "}"
  RecordsetToJSON2 = json
End Function

Function ToJSONValue(val)
  If IsNull(val) Then
    ToJSONValue = "null"
  Else
    ToJSONValue = """" & EscapeJSON(CStr(val)) & """"
  End If
End Function

Function EscapeJSON(str)
  str = Replace(str, "\", "\\")
    str = Replace(str, """", """""")
  str = Replace(str, "/", "\/")
  str = Replace(str, Chr(8), "\b")
  str = Replace(str, Chr(12), "\f")
  str = Replace(str, Chr(10), "\n")
  str = Replace(str, Chr(13), "\r")
  str = Replace(str, Chr(9), "\t")
  EscapeJSON = str
End Function
