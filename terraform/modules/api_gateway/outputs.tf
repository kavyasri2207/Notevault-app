output "api_url" {
  description = "Base URL for the HTTP API"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_id" {
  description = "API Gateway ID"
  value       = aws_apigatewayv2_api.main.id
}

output "execution_arn" {
  description = "API Gateway Execution ARN"
  value       = aws_apigatewayv2_api.main.execution_arn
}
