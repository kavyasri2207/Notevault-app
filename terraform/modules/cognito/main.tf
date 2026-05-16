########################################################################
# Module: Cognito
# Provisions:
#  - User Pool with email verification + strong password policy
#  - Pre-SignUp trigger (auto-confirm for dev)
#  - App Client (SRP auth, no client secret → browser-safe)
#  - Identity Pool (optional – for future IAM-based access)
########################################################################

resource "aws_cognito_user_pool" "main" {
  name = "notevault-${var.environment}-user-pool"

  # ── Attribute Schema ──────────────────────────────────────────────
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  lambda_config {
    pre_sign_up = "arn:aws:lambda:${var.aws_region}:${var.account_id}:function:notevault-${var.environment}-auth"
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    mutable             = true
    required            = true
    string_attribute_constraints {
      min_length = 2
      max_length = 80
    }
  }

  # ── Password Policy ───────────────────────────────────────────────
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  # ── Account Recovery ─────────────────────────────────────────────
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # ── Email (Cognito default sender – no SES setup needed for dev) ──
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # ── Token Validity ─────────────────────────────────────────────────
  user_pool_add_ons {
    advanced_security_mode = var.environment == "prod" ? "ENFORCED" : "OFF"
  }

  tags = { Name = "notevault-${var.environment}-user-pool" }
}

# ── App Client ────────────────────────────────────────────────────────
resource "aws_cognito_user_pool_client" "web" {
  name         = "notevault-${var.environment}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # No client secret → can be safely used from browser / mobile
  generate_secret = false

  # Auth flows: SRP (secure) + USER_PASSWORD (for server-side Lambda calls)
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # Token expiry
  access_token_validity  = 1    # 1 hour
  id_token_validity      = 1    # 1 hour
  refresh_token_validity = 30   # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"
}

# ── User Pool Domain (hosted UI – useful for OAuth flows) ─────────────
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "notevault-${var.environment}-${random_id.suffix.hex}"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "random_id" "suffix" {
  byte_length = 4
}
