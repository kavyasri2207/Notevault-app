########################################################################
# Module: API Gateway (HTTP API v2)
# - Single HTTP API with Cognito JWT Authorizer
# - Routes: /auth/* (no auth), /notes/* (JWT required)
# - Lambda integrations for each route group
# - Permissions for API Gateway to invoke each Lambda
########################################################################

resource "aws_apigatewayv2_api" "main" {
  name          = "notevault-${var.environment}-api"
  protocol_type = "HTTP"
  description   = "NoteVault HTTP API"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key"]
    max_age       = 300
  }

  tags = { Name = "notevault-${var.environment}-api" }
}

# ── JWT Authorizer (Cognito) ──────────────────────────────────────────
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "notevault-${var.environment}-cognito-authorizer"

  jwt_configuration {
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
    audience = [var.cognito_client_id]
  }
}

# ── Stage ─────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.apigw.arn
    format          = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  tags = { Name = "notevault-${var.environment}-api-stage" }
}

resource "aws_cloudwatch_log_group" "apigw" {
  name              = "/aws/apigateway/notevault-${var.environment}"
  retention_in_days = 14
}

# ── Integrations ──────────────────────────────────────────────────────
resource "aws_apigatewayv2_integration" "auth" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_auth_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "notes" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_notes_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "summarize" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.lambda_summarize_arn
  payload_format_version = "2.0"
}

# ── Auth Routes (public – no JWT required) ────────────────────────────
resource "aws_apigatewayv2_route" "auth_signup" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/auth/signup"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "auth_login" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "auth_refresh" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/auth/refresh"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

# ── Auth /me Route (JWT required) ─────────────────────────────────────
resource "aws_apigatewayv2_route" "auth_me" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/auth/me"
  target             = "integrations/${aws_apigatewayv2_integration.auth.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ── Notes Routes (all JWT protected) ─────────────────────────────────
resource "aws_apigatewayv2_route" "notes_list" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/notes"
  target             = "integrations/${aws_apigatewayv2_integration.notes.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "notes_get" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/notes/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.notes.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "notes_create" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/notes"
  target             = "integrations/${aws_apigatewayv2_integration.notes.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "notes_update" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/notes/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.notes.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "notes_delete" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /api/notes/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.notes.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "notes_summarize" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/notes/{id}/summarize"
  target             = "integrations/${aws_apigatewayv2_integration.summarize.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# ── Lambda Invoke Permissions ─────────────────────────────────────────
resource "aws_lambda_permission" "apigw_auth" {
  statement_id  = "AllowAPIGWInvokeAuth"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_auth_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_notes" {
  statement_id  = "AllowAPIGWInvokeNotes"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_notes_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_summarize" {
  statement_id  = "AllowAPIGWInvokeSummarize"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_summarize_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
