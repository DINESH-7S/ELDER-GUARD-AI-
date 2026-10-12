$ErrorActionPreference = 'Stop'
$docx = 'E:\Elder_guard\docs\report\ElderGuard_Mini_Project_Report.docx'
$pdf  = 'E:\Elder_guard\docs\report\ElderGuard_Mini_Project_Report.pdf'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $d = $word.Documents.Open($docx)
  $d.Repaginate()
  foreach ($i in 1..2) {
    $d.Fields.Update() | Out-Null
    foreach ($t in $d.TablesOfContents) { $t.Update() }
  }
  $d.Save()
  $d.ExportAsFixedFormat($pdf, 17)
  Write-Output ("pages: " + $d.ComputeStatistics(2))
  $d.Close($false)
} finally {
  $word.Quit()
}
