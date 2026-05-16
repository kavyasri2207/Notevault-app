########################################################################
# Module: Lambda
# Provisions:
#  - IAM role + policies for all Lambda functions
#  - Security Group for Lambda (egress to DocumentDB + internet)
#  - Lambda functions: notes-crud, summarize, auth (Cognito wrapper)
#  - CloudWatch Log Groups with 14-day retention
#  - ZIP archives built from local source
########################################################################

# ── IAM Role ──────────────────────────────────────────────────────────
resource "aws_iam_role" "lambda_exec" {
  name = "notevault-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Managed policy: VPC networking (ENI creation)
resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Managed policy: basic CloudWatch logging
resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Inline policy: Cognito read (verify tokens + admin operations)
resource "aws_iam_role_policy" "cognito_access" {
  name = "notevault-${var.environment}-cognito-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CognitoUserPoolAccess"
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminRespondToAuthChallenge",
          "cognito-idp:GetUser",
          "cognito-idp:InitiateAuth",
          "cognito-idp:SignUp",
          "cognito-idp:ConfirmSignUp",
          "cognito-idp:RevokeToken",
        ]
        Resource = "arn:aws:cognito-idp:${var.aws_region}:${var.account_id}:userpool/${var.cognito_user_pool_id}"
      }
    ]
  })
}

# ── CloudWatch Log Groups ─────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "notes_crud" {
  name              = "/aws/lambda/notevault-${var.environment}-notes-crud"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "summarize" {
  name              = "/aws/lambda/notevault-${var.environment}-summarize"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/lambda/notevault-${var.environment}-auth"
  retention_in_days = 14
}

# ── ZIP archives ──────────────────────────────────────────────────────
data "archive_file" "notes_crud" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/notes-crud"
  output_path = "${path.root}/../lambdas/.zips/notes-crud.zip"
}

data "archive_file" "summarize" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/summarize"
  output_path = "${path.root}/../lambdas/.zips/summarize.zip"
}

data "archive_file" "auth" {
  type        = "zip"
  source_dir  = "${path.root}/../lambdas/auth-triggers"
  output_path = "${path.root}/../lambdas/.zips/auth.zip"
}

# ── Common Environment Variables ──────────────────────────────────────
locals {
  common_env = {
    NODE_ENV             = var.environment
    DOCDB_ENDPOINT       = var.docdb_endpoint
    DOCDB_USERNAME       = var.docdb_username
    DOCDB_PASSWORD       = var.docdb_password
    COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    AWS_REGION_NAME      = var.aws_region
  }
}

# ── Lambda: notes-crud ────────────────────────────────────────────────
resource "aws_lambda_function" "notes_crud" {
  function_name    = "notevault-${var.environment}-notes-crud"
  description      = "NoteVault CRUD operations backed by DocumentDB"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.notes_crud.output_path
  source_code_hash = data.archive_file.notes_crud.output_base64sha256

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_sg_id]
  }

  environment {
    variables = local.common_env
  }

  depends_on = [
    aws_cloudwatch_log_group.notes_crud,
    aws_iam_role_policy_attachment.vpc_access,
  ]

  tags = { Name = "notevault-${var.environment}-notes-crud" }
}

# ── Lambda: summarize ─────────────────────────────────────────────────
resource "aws_lambda_function" "summarize" {
  function_name    = "notevault-${var.environment}-summarize"
  description      = "NoteVault AI summarization via Google Gemini"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  timeout          = 60   # Gemini can be slow under load
  memory_size      = 256
  filename         = data.archive_file.summarize.output_path
  source_code_hash = data.archive_file.summarize.output_base64sha256

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_sg_id]
  }

  environment {
    variables = merge(local.common_env, {
      GEMINI_API_KEY = var.gemini_api_key
      GEMINI_MODELS  = var.gemini_models
    })
  }

  depends_on = [
    aws_cloudwatch_log_group.summarize,
    aws_iam_role_policy_attachment.vpc_access,
  ]

  tags = { Name = "notevault-${var.environment}-summarize" }
}

# ── Lambda: auth (Cognito sign-up / sign-in wrapper) ─────────────────
resource "aws_lambda_function" "auth" {
  function_name    = "notevault-${var.environment}-auth"
  description      = "NoteVault auth wrapper around Cognito (signup/login/me)"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  timeout          = 30
  memory_size      = 256
  filename         = data.archive_file.auth.output_path
  source_code_hash = data.archive_file.auth.output_base64sha256

  # Auth Lambda does NOT need VPC – it only calls Cognito endpoints
  environment {
    variables = merge(local.common_env, {
      COGNITO_CLIENT_ID = var.cognito_client_id
    })
  }

  depends_on = [aws_cloudwatch_log_group.auth]

  tags = { Name = "notevault-${var.environment}-auth" }
}
resource "aws_lambda_permission" "cognito_presignup" {
  statement_id  = "AllowCognitoInvokePreSignUp"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = var.cognito_user_pool_arn
}
