$apiKey = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjdiMzg3ZDA5LWIxN2EtNDk2Ny05MjU2LWRiMjMxZDFlMjcyOSJ9.eyJzdWIiOiJhMGIxYmUxZC00MWY2LTQ1YjctYmEzMC0zNGQyNDg3N2FmNjIiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiYTBiMWJlMWQtNDFmNi00NWI3LWJhMzAtMzRkMjQ4NzdhZjYyIiwiaWF0IjoxNzgyODc4Nzc3LCJleHAiOjE3OTA2NTQ3NzYsImp0aSI6IjgzNTg1NzVmLTM3OTItNDRkYy05NjQ5LTE2ZDZhYTI5NmNiNCJ9.gb7-f5IX2_SONshK9WY7A8iGjiimkbsePpfsCwjlcYm4LtdmwEnXCZdX34MjK38CnqYBNIQX9CoA-_NYE1XLig"
$baseUrl = "https://twenty.opc.mdriaz.com.bd"
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type"  = "application/json"
}
$templateId = "cf952f15-87ac-4cd7-98d9-21186fa6dcfe"

$sampleHtml = "<h1>YBH Contract Template</h1><p>This agreement is entered into as of <strong>{{date}}</strong>, between <strong>{{client_name}}</strong> (Client) and <strong>YBH</strong> (Service Provider).</p><h2>1. Scope of Services</h2><p>The Service Provider agrees to deliver the following services:</p><ul><li>Service Item 1</li><li>Service Item 2</li><li>Service Item 3</li></ul><h2>2. Payment Terms</h2><p>Total project value: <strong>{{amount}}</strong>. Payment is due within 30 days of invoice.</p><h2>3. Signatures</h2><table border='1' cellpadding='8' style='width:100%;border-collapse:collapse'><tr><th>Client</th><th>Provider</th></tr><tr><td>___________________</td><td>___________________</td></tr></table>"

$body = @{
    query = @"
mutation {
  updateDocumentTemplate(
    id: "$templateId"
    data: { htmlSource: "$sampleHtml" }
  ) {
    id
    name
    htmlSource
  }
}
"@
} | ConvertTo-Json -Depth 5

Write-Host "=== Updating Document Template ===" -ForegroundColor Cyan
$resp = Invoke-RestMethod `
    -Uri "$baseUrl/graphql" `
    -Method POST `
    -Headers $headers `
    -Body $body

$resp | ConvertTo-Json -Depth 10
