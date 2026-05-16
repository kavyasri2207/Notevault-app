output "cluster_endpoint"     { value = aws_docdb_cluster.main.endpoint }
output "cluster_port"         { value = aws_docdb_cluster.main.port }
output "docdb_sg_id"          { value = aws_security_group.docdb.id }
