output "lambda_exec_role_arn"        { value = aws_iam_role.lambda_exec.arn }

output "notes_crud_function_arn"     { value = aws_lambda_function.notes_crud.arn }
output "notes_crud_function_name"    { value = aws_lambda_function.notes_crud.function_name }
output "notes_crud_invoke_arn"       { value = aws_lambda_function.notes_crud.invoke_arn }

output "summarize_function_arn"      { value = aws_lambda_function.summarize.arn }
output "summarize_function_name"     { value = aws_lambda_function.summarize.function_name }
output "summarize_invoke_arn"        { value = aws_lambda_function.summarize.invoke_arn }

output "auth_function_arn"           { value = aws_lambda_function.auth.arn }
output "auth_function_name"          { value = aws_lambda_function.auth.function_name }
output "auth_invoke_arn"             { value = aws_lambda_function.auth.invoke_arn }
