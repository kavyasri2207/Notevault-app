########################################################################
# Variables – NoteVault Terraform
########################################################################

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev / staging / prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "app_name" {
  description = "Application name prefix used for resource naming"
  type        = string
  default     = "notevault"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ── DocumentDB ─────────────────────────────────────────────────────────
variable "docdb_username" {
  description = "Master username for DocumentDB"
  type        = string
  default     = "notevaultadmin"
}

variable "docdb_password" {
  description = "Master password for DocumentDB (mark sensitive in tfvars)"
  type        = string
  sensitive   = true
}

variable "docdb_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "docdb_instance_count" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 1
}

# ── Gemini AI ──────────────────────────────────────────────────────────
variable "gemini_api_key" {
  description = "Google Gemini API key for note summarisation"
  type        = string
  sensitive   = true
}

variable "gemini_models" {
  description = "Comma-separated list of Gemini model names (fallback order)"
  type        = string
  default     = "gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash-lite"
}

