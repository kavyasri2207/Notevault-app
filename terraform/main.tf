########################################################################
# NoteVault – Terraform Root
# Provisions: VPC, DocumentDB, Cognito, Lambda, API Gateway, CloudWatch
########################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "NoteVault"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

########################################################################
# Data Sources
########################################################################
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }

########################################################################
# Modules
########################################################################
module "vpc" {
  source      = "./modules/vpc"
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  azs         = slice(data.aws_availability_zones.available.names, 0, 2)
}

module "documentdb" {
  source               = "./modules/documentdb"
  environment          = var.environment
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  lambda_sg_id         = module.vpc.lambda_sg_id
  db_username          = var.docdb_username
  db_password          = var.docdb_password
  instance_class       = var.docdb_instance_class
  instance_count       = var.docdb_instance_count
}

module "cognito" {
  source      = "./modules/cognito"
  environment = var.environment
  app_name    = var.app_name
  aws_region  = var.aws_region
  account_id  = data.aws_caller_identity.current.account_id
}

module "lambda" {
  source               = "./modules/lambda"
  environment          = var.environment
  aws_region           = var.aws_region
  account_id           = data.aws_caller_identity.current.account_id
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  lambda_sg_id         = module.vpc.lambda_sg_id
  docdb_endpoint       = module.documentdb.cluster_endpoint
  docdb_username       = var.docdb_username
  docdb_password       = var.docdb_password
  cognito_user_pool_id  = module.cognito.user_pool_id
  cognito_user_pool_arn = module.cognito.user_pool_arn
  cognito_client_id     = module.cognito.user_pool_client_id
  gemini_api_key       = var.gemini_api_key
  gemini_models        = var.gemini_models
}

module "api_gateway" {
  source               = "./modules/api_gateway"
  environment          = var.environment
  aws_region           = var.aws_region
  app_name             = var.app_name
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id    = module.cognito.user_pool_client_id
  lambda_notes_arn     = module.lambda.notes_crud_function_arn
  lambda_summarize_arn = module.lambda.summarize_function_arn
  lambda_auth_arn      = module.lambda.auth_function_arn
}

module "monitoring" {
  source                = "./modules/monitoring"
  environment           = var.environment
  aws_region            = var.aws_region
  notes_function_name   = module.lambda.notes_crud_function_name
  summarize_function_name = module.lambda.summarize_function_name
  auth_function_name    = module.lambda.auth_function_name
  api_gateway_id        = module.api_gateway.api_id
}

########################################################################
# Outputs
########################################################################
output "api_gateway_url" {
  description = "Base URL for the NoteVault HTTP API"
  value       = module.api_gateway.api_url
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito App Client ID (used by frontend)"
  value       = module.cognito.user_pool_client_id
}

output "documentdb_endpoint" {
  description = "DocumentDB cluster writer endpoint"
  value       = module.documentdb.cluster_endpoint
  sensitive   = true
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatch Dashboard URL"
  value       = module.monitoring.dashboard_url
}
