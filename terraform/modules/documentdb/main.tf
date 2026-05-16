########################################################################
# Module: DocumentDB
# Provisions a DocumentDB cluster (MongoDB-compatible) with:
#  - Dedicated security group allowing only Lambda SG ingress on 27017
#  - Subnet group using private subnets
#  - Parameter group with TLS enabled
########################################################################

# ── Security Group ─────────────────────────────────────────────────────
resource "aws_security_group" "docdb" {
  name        = "notevault-${var.environment}-docdb-sg"
  description = "Allow DocumentDB access from Lambda SG only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MongoDB from Lambda"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [var.lambda_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "notevault-${var.environment}-docdb-sg" }
}

# ── Subnet Group ───────────────────────────────────────────────────────
resource "aws_docdb_subnet_group" "main" {
  name       = "notevault-${var.environment}-docdb-subnet-group"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "notevault-${var.environment}-docdb-subnet-group" }
}

# ── Parameter Group (TLS optional for dev, enabled for prod) ──────────
resource "aws_docdb_cluster_parameter_group" "main" {
  family      = "docdb5.0"
  name        = "notevault-${var.environment}-docdb-params"
  description = "NoteVault DocumentDB parameter group"

  parameter {
    name  = "tls"
    value = var.environment == "prod" ? "enabled" : "disabled"
  }

  tags = { Name = "notevault-${var.environment}-docdb-params" }
}

# ── Cluster ────────────────────────────────────────────────────────────
resource "aws_docdb_cluster" "main" {
  cluster_identifier              = "notevault-${var.environment}"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = var.db_username
  master_password                 = var.db_password
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.docdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name
  skip_final_snapshot             = var.environment != "prod"
  deletion_protection             = var.environment == "prod"
  storage_encrypted               = true
  backup_retention_period         = var.environment == "prod" ? 7 : 1
  preferred_backup_window         = "03:00-04:00"

  tags = { Name = "notevault-${var.environment}-docdb-cluster" }
}

# ── Cluster Instances ─────────────────────────────────────────────────
resource "aws_docdb_cluster_instance" "instances" {
  count              = var.instance_count
  identifier         = "notevault-${var.environment}-docdb-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.instance_class
  tags               = { Name = "notevault-${var.environment}-docdb-${count.index + 1}" }
}
