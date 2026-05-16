variable "environment"          { type = string }
variable "aws_region"           { type = string }
variable "lambda_sg_id"        { type = string }
variable "account_id"           { type = string }
variable "vpc_id"               { type = string }
variable "private_subnet_ids"   { type = list(string) }
variable "docdb_endpoint"       { type = string }
variable "docdb_username"       { type = string }
variable "docdb_password" {
  type      = string
  sensitive = true
}
variable "cognito_user_pool_id" { type = string }
variable "cognito_user_pool_arn" { type = string }
variable "cognito_client_id" {
  type    = string
  default = ""
}
variable "gemini_api_key" {
  type      = string
  sensitive = true
}
variable "gemini_models" { type = string }
