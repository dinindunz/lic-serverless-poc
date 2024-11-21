import pymysql
import boto3
import json
import os


def lambda_handler(event, context):
    try:
        # Parse the incoming request
        body = json.loads(event["body"])
        name = body.get("name")
        email = body.get("email")
        message = body.get("message")

        # Get the database credentials from AWS Secrets Manager
        secrets_manager = boto3.client("secretsmanager")
        secret_arn = os.environ["RDS_SECRET_ARN"]
        secret_response = secrets_manager.get_secret_value(SecretId=secret_arn)
        db_credentials = json.loads(secret_response["SecretString"])

        # Database connection details
        connection_config = {
            "host": db_credentials["host"],
            "user": db_credentials["username"],
            "password": db_credentials["password"],
            "database": db_credentials["dbname"],
            "port": db_credentials["port"],
        }

        # Connect to the database and execute the query
        connection = pymysql.connect(**connection_config)
        with connection.cursor() as cursor:
            query = "INSERT INTO submissions (name, email, message) VALUES (%s, %s, %s)"
            cursor.execute(query, (name, email, message))
        connection.commit()

        # Return success response
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps(
                {
                    "message": "Data submitted successfully!",
                }
            ),
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps(
                {
                    "message": "Failed to process the data.",
                    "error": str(e),
                }
            ),
        }

    finally:
        if "connection" in locals():
            connection.close()
