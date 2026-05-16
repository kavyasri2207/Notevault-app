########################################################################
# Module: Monitoring
# Provisions:
#  - CloudWatch Dashboard for high-level monitoring
#  - Basic alarms for Lambda errors
########################################################################

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "NoteVault-${var.environment}-Metrics"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiId", var.api_gateway_id, { label = "Total Requests", region = var.aws_region }],
            [".", "4XXError", ".", ".", { label = "4XX Errors", region = var.aws_region }],
            [".", "5XXError", ".", ".", { label = "5XX Errors", region = var.aws_region }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "API Gateway Traffic & Errors"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", var.notes_function_name, { label = "Notes CRUD Errors", region = var.aws_region }],
            [".", "Errors", "FunctionName", var.summarize_function_name, { label = "Summarize Errors", region = var.aws_region }],
            [".", "Errors", "FunctionName", var.auth_function_name, { label = "Auth Errors", region = var.aws_region }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Lambda Execution Errors"
        }
      }
    ]
  })
}

output "dashboard_url" {
  value = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=NoteVault-${var.environment}-Metrics"
}
