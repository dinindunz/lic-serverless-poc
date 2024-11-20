import json
import os
import boto3
import pymysql

def lambda_handler(event, context):
    ssm = boto3.client('ssm')
    secrets_manager = boto3.client('secretsmanager')

    # Retrieve database credentials from Secrets Manager
    secret_arn = os.getenv('RDS_SECRET_ARN')
    secret = secrets_manager.get_secret_value(SecretId=secret_arn)
    db_credentials = json.loads(secret['SecretString'])

    # Retrieve SQL schema from SSM Parameter Store
    schema_param_name = os.getenv('SCHEMA_PARAM')
    schema_param = ssm.get_parameter(Name=schema_param_name)
    schema = schema_param['Parameter']['Value']

    connection_config = {
        'host': db_credentials['host'],
        'user': db_credentials['username'],
        'password': db_credentials['password'],
        'database': db_credentials['dbname'],
        'port': int(db_credentials.get('port', 3306)),  # Default port to 3306 if not provided
    }

    try:
        # Connect to the database
        connection = pymysql.connect(**connection_config)
        print('Connected to database successfully.')

        # Split schema into individual statements and execute them
        statements = [stmt.strip() for stmt in schema.split(';') if stmt.strip()]
        with connection.cursor() as cursor:
            for stmt in statements:
                print(f'Executing: {stmt}')
                cursor.execute(stmt)

        connection.commit()
        print('Database schema applied successfully.')
    except Exception as error:
        print('Failed to apply database schema:', error)
        raise error
    finally:
        if connection:
            connection.close()
