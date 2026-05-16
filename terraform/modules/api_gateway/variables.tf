variable "environment"          { type = string }
variable "aws_region"           { type = string }
variable "app_name"             { type = string }
variable "cognito_user_pool_id" { type = string }
variable "cognito_client_id"    { type = string }
variable "lambda_notes_arn"     { type = string }
variable "lambda_summarize_arn" { type = string }
variable "lambda_auth_arn"      { type = string }
