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
Dim baseWorkorder, baseSuffix, operationCodesStr, test: test = True
If WScript.Arguments.Count > 0 Then
  baseWorkorder = WScript.Arguments(0)
  If WScript.Arguments.Count > 1 Then
    baseSuffix = WScript.Arguments(1)
  End If
  If WScript.Arguments.Count > 2 Then
    operationCodesStr = WScript.Arguments(2)
  End If
Else
  If test Then
    baseWorkorder = "122429" ' Example for testing
    baseSuffix = "001" ' Example suffix
    operationCodesStr = "6061,D172" ' Example operations
  Else
    MsgBox "Usage: globalcert.vbs <baseWorkorder> <suffix> <operationCodes>"
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
  
  ' Step 1: Query base work order operations - SOPHISTICATED JOIN using ROUTER_SEQ range for specs
  ' NEW APPROACH: Use vjd.SEQ BETWEEN vjo.ROUTER_SEQ AND vjo.ROUTER_SEQ + 99 to find context-aware specs
  sqlQuery = "SELECT DISTINCT " & _
    "vjo.SEQ, " & _
    "vjo.OPERATION, " & _
    "vjo.ROUTER_SEQ, " & _
    "vrl.DESC_RT_LINE, " & _
    "vjo.DATE_COMPLETED, " & _
    "vjo.UNITS_COMPLETE, " & _
    "COALESCE(vrl.PART_WC_OUTSIDE, '') AS PART_WC_OUTSIDE, " & _
    "jh.PART, " & _
    "jh.PART_DESCRIPTION, " & _
    "COALESCE(vjd.REFERENCE, '') AS REFERENCE, " & _
    "'" & baseWorkorder & "-" & baseSuffix & "' AS SOURCE_WO " & _
    "FROM JOB_HEADER jh " & _
    "LEFT JOIN V_JOB_OPERATIONS vjo ON jh.JOB = vjo.JOB AND jh.SUFFIX = vjo.SUFFIX " & _
    "LEFT JOIN V_ROUTER_LINE vrl ON vjo.ROUTER = vrl.ROUTER AND vjo.ROUTER_SEQ = vrl.LINE_ROUTER " & _
    "LEFT JOIN V_JOB_DETAIL vjd ON vjd.JOB = vjo.JOB AND vjd.SUFFIX = vjo.SUFFIX AND CAST(vjd.SEQ AS CHAR(6)) BETWEEN CAST(vjo.ROUTER_SEQ AS CHAR(6)) AND CAST((CAST(vjo.ROUTER_SEQ AS INTEGER) + 99) AS CHAR(6)) " & _
    "WHERE jh.JOB = " & CLng(baseWorkorder) & " " & _
    "AND jh.SUFFIX = '" & baseSuffix & "' " & _
    "AND vjo.LMO IN ('L','O') " & _
    "AND vjo.SEQ < '990000' " & _
    "AND vjo.OPERATION <> '' " & _
    operationFilter & " " & _
    "ORDER BY vjo.SEQ"
  
  WScript.StdErr.Write "DEBUG SQL BASE (NEW): " & sqlQuery & vbCrLf

  ' OLD QUERY (COMMENTED OUT - REVERT HERE IF NEEDED):
  ' sqlQuery = "SELECT DISTINCT " & _
  '   "vjo.SEQ, " & _
  '   "vjo.OPERATION, " & _
  '   "vjo.ROUTER_SEQ, " & _
  '   "vrl.DESC_RT_LINE, " & _
  '   "vjo.DATE_COMPLETED, " & _
  '   "vjo.UNITS_COMPLETE, " & _
  '   "COALESCE(vrl.PART_WC_OUTSIDE, '') AS PART_WC_OUTSIDE, " & _
  '   "jh.PART, " & _
  '   "jh.PART_DESCRIPTION, " & _
  '   "COALESCE(vjd.REFERENCE, '') AS REFERENCE, " & _
  '   "'" & baseWorkorder & "-" & baseSuffix & "' AS SOURCE_WO " & _
  '   "FROM JOB_HEADER jh " & _
  '   "LEFT JOIN V_JOB_OPERATIONS vjo ON jh.JOB = vjo.JOB AND jh.SUFFIX = vjo.SUFFIX " & _
  '   "LEFT JOIN V_ROUTER_LINE vrl ON vjo.ROUTER = vrl.ROUTER AND vjo.ROUTER_SEQ = vrl.LINE_ROUTER " & _
  '   "LEFT JOIN V_JOB_DETAIL vjd ON vjd.JOB = vjo.JOB AND vjd.SUFFIX = vjo.SUFFIX AND vjd.SEQ = vjo.SEQ " & _
  '   "WHERE jh.JOB = " & CLng(baseWorkorder) & " " & _
  '   "AND jh.SUFFIX = '" & baseSuffix & "' " & _
  '   "AND vjo.LMO IN ('L','O') " & _
  '   "AND vjo.SEQ < '990000' " & _
  '   "AND vjo.OPERATION <> '' " & _
  '   operationFilter & " " & _
  '   "ORDER BY vjo.SEQ"

  rs.Open sqlQuery, conn, 3, 1 ' 3 = adOpenStatic, 1 = adLockReadOnly
  If Err.Number <> 0 Then
    WScript.StdErr.Write "ERROR BASE QUERY: " & Err.Description & vbCrLf
    Err.Clear
    WScript.StdOut.Write "{""baseWorkorder"":""" & baseWorkorder & """,""data"":[]}"
  Else
    ' Collect base results
    Dim allData, baseResults, childWorkorders
    Set allData = CreateObject("Scripting.Dictionary")
    Set baseResults = CreateObject("ADODB.Recordset")
    Set childWorkorders = CreateObject("Scripting.Dictionary")
    
    ' Copy base results into memory
    If Not rs.EOF Then
      baseResults.CursorLocation = 3 ' Client-side
      rs.MoveFirst
      While Not rs.EOF
        Dim baseRow
        Set baseRow = CreateObject("Scripting.Dictionary")
        Dim fld
        For Each fld In rs.Fields
          baseRow.Add fld.Name, fld.Value
        Next
        allData.Add allData.Count, baseRow
        rs.MoveNext
      Wend
    End If
    rs.Close
    
    ' Step 2: Find child work orders from V_ITEM_HISTORY
    Dim childQuery
    childQuery = "SELECT DISTINCT SERIAL_NUMBER FROM V_ITEM_HISTORY " & _
      "WHERE JOB = " & CLng(baseWorkorder) & " " & _
      "AND SERIAL_NUMBER <> '' " & _
      "AND SERIAL_NUMBER LIKE '%-___' " & _
      "AND SERIAL_NUMBER <> '" & baseWorkorder & "-000'"
    
    WScript.StdErr.Write "DEBUG CHILD QUERY: " & childQuery & vbCrLf
    
    rs.Open childQuery, conn, 3, 1
    If Err.Number = 0 And Not rs.EOF Then
      rs.MoveFirst
      While Not rs.EOF
        Dim childWOStr, childJob, childSuffix
        childWOStr = Trim(rs("SERIAL_NUMBER").Value)
        ' Parse "122429-001" into job and suffix
        Dim dashPos
        dashPos = InStr(childWOStr, "-")
        If dashPos > 0 Then
          childJob = CLng(Left(childWOStr, dashPos - 1))
          childSuffix = Mid(childWOStr, dashPos + 1)  ' Keep as string
          childWorkorders.Add childWorkorders.Count, Array(childJob, childSuffix, childWOStr)
          WScript.StdErr.Write "Found child WO: " & childWOStr & " (Job: " & childJob & ", Suffix: " & childSuffix & ")" & vbCrLf
        End If
        rs.MoveNext
      Wend
    End If
    rs.Close
    
    ' Step 3: Query operations for each child work order
    Dim childIdx
    For childIdx = 0 To childWorkorders.Count - 1
      Dim childArray, childJobNum, childSuffixStr, childWOName
      childArray = childWorkorders.Item(childIdx)
      childJobNum = childArray(0)
      childSuffixStr = childArray(1)  ' Already a string
      childWOName = childArray(2)
      
      Dim childOpQuery
      ' NEW APPROACH: Use vjd.SEQ BETWEEN vjo.ROUTER_SEQ AND vjo.ROUTER_SEQ + 99 for context-aware specs
      childOpQuery = "SELECT DISTINCT " & _
        "vjo.SEQ, " & _
        "vjo.OPERATION, " & _
        "vjo.ROUTER_SEQ, " & _
        "vrl.DESC_RT_LINE, " & _
        "vjo.DATE_COMPLETED, " & _
        "vjo.UNITS_COMPLETE, " & _
        "COALESCE(vrl.PART_WC_OUTSIDE, '') AS PART_WC_OUTSIDE, " & _
        "jh.PART, " & _
        "jh.PART_DESCRIPTION, " & _
        "COALESCE(vjd.REFERENCE, '') AS REFERENCE, " & _
        "'" & childWOName & "' AS SOURCE_WO " & _
        "FROM JOB_HEADER jh " & _
        "LEFT JOIN V_JOB_OPERATIONS vjo ON jh.JOB = vjo.JOB AND jh.SUFFIX = vjo.SUFFIX " & _
        "LEFT JOIN V_ROUTER_LINE vrl ON vjo.ROUTER = vrl.ROUTER AND vjo.ROUTER_SEQ = vrl.LINE_ROUTER " & _
        "LEFT JOIN V_JOB_DETAIL vjd ON vjd.JOB = vjo.JOB AND vjd.SUFFIX = vjo.SUFFIX AND CAST(vjd.SEQ AS CHAR(6)) BETWEEN CAST(vjo.ROUTER_SEQ AS CHAR(6)) AND CAST((CAST(vjo.ROUTER_SEQ AS INTEGER) + 99) AS CHAR(6)) " & _
        "WHERE jh.JOB = " & childJobNum & " " & _
        "AND jh.SUFFIX = '" & childSuffixStr & "' " & _
        "AND vjo.LMO IN ('L','O') " & _
        "AND vjo.SEQ < '990000' " & _
        "AND vjo.OPERATION <> '' " & _
        operationFilter & " " & _
        "ORDER BY vjo.SEQ"
      
      ' OLD QUERY (COMMENTED OUT - REVERT HERE IF NEEDED):
      ' childOpQuery = "SELECT DISTINCT " & _
      '   "vjo.SEQ, " & _
      '   "vjo.OPERATION, " & _
      '   "vjo.ROUTER_SEQ, " & _
      '   "vrl.DESC_RT_LINE, " & _
      '   "vjo.DATE_COMPLETED, " & _
      '   "vjo.UNITS_COMPLETE, " & _
      '   "COALESCE(vrl.PART_WC_OUTSIDE, '') AS PART_WC_OUTSIDE, " & _
      '   "jh.PART, " & _
      '   "jh.PART_DESCRIPTION, " & _
      '   "COALESCE(vjd.REFERENCE, '') AS REFERENCE, " & _
      '   "'" & childWOName & "' AS SOURCE_WO " & _
      '   "FROM JOB_HEADER jh " & _
      '   "LEFT JOIN V_JOB_OPERATIONS vjo ON jh.JOB = vjo.JOB AND jh.SUFFIX = vjo.SUFFIX " & _
      '   "LEFT JOIN V_ROUTER_LINE vrl ON vjo.ROUTER = vrl.ROUTER AND vjo.ROUTER_SEQ = vrl.LINE_ROUTER " & _
      '   "LEFT JOIN V_JOB_DETAIL vjd ON vjd.JOB = vjo.JOB AND vjd.SUFFIX = vjo.SUFFIX AND vjd.SEQ = vjo.SEQ " & _
      '   "WHERE jh.JOB = " & childJobNum & " " & _
      '   "AND jh.SUFFIX = '" & childSuffixStr & "' " & _
      '   "AND vjo.LMO IN ('L','O') " & _
      '   "AND vjo.SEQ < '990000' " & _
      '   "AND vjo.OPERATION <> '' " & _
      '   operationFilter & " " & _
      '   "ORDER BY vjo.SEQ"
      
      WScript.StdErr.Write "DEBUG CHILD OP QUERY (NEW): " & childOpQuery & vbCrLf
      
      rs.Open childOpQuery, conn, 3, 1
      If Err.Number = 0 And Not rs.EOF Then
        rs.MoveFirst
        While Not rs.EOF
          Set baseRow = CreateObject("Scripting.Dictionary")
          For Each fld In rs.Fields
            baseRow.Add fld.Name, fld.Value
          Next
          allData.Add allData.Count, baseRow
          rs.MoveNext
        Wend
      End If
      rs.Close
      Err.Clear
    Next
    
    ' Output combined results
    If allData.Count > 0 Then
      WScript.StdOut.Write RecordsetToJSON2(allData, baseWorkorder)
    Else
      WScript.StdOut.Write "{""baseWorkorder"":""" & baseWorkorder & """,""data"":[]}"
    End If
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
