variable "environment" { type = string }
variable "app_name"    { type = string }
variable "aws_region"  { type = string }
variable "account_id"  { type = string }
variable "presignup_lambda_arn" {
  type    = string
  default = ""
}
