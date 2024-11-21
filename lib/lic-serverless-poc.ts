import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';
const fs = require('fs');

export class LicServerlessPocStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for Static Website Hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS, // Allow bucket policy-based public access
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,      
    });

    // Deploy website content to S3
    new s3deploy.BucketDeployment(this, 'WebsiteDeployment', {
      sources: [s3deploy.Source.asset('./website-dist')], // Path to your website files
      destinationBucket: websiteBucket,
    });

    websiteBucket.addToResourcePolicy(new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [
            `${websiteBucket.bucketArn}`,
            `${websiteBucket.bucketArn}/*`
        ],
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
    }));

    // Use the default VPC
    const vpc = new ec2.Vpc(this, 'LicVpc', {
      cidr: '10.0.0.0/16', // Default VPC CIDR range
      maxAzs: 3, // Default VPC spans all availability zones
      subnetConfiguration: [
        {
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24, // Standard subnet size
        }]
    });
    const vpcSubnets = {
      subnetType: ec2.SubnetType.PUBLIC,
    }

    const databaseName = 'lic'
    const masterDbUser = 'lic_admin'

    // Create an RDS Instance
    const rdsInstance = new rds.DatabaseInstance(this, 'RdsInstance', {
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0 }),
      instanceIdentifier: "lic",
      vpc,
      vpcSubnets,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      storageEncrypted: true,
      multiAz: false,
      databaseName,
      credentials: rds.Credentials.fromGeneratedSecret(masterDbUser), // Auto-generated secret
      publiclyAccessible: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    rdsInstance.connections.allowDefaultPortFromAnyIpv4();

    // Store SQL Schema in SSM Parameter
    const sqlSchema = fs.readFileSync('./migrations/schema.sql', 'utf-8');

    const schemaParameter = new ssm.StringParameter(this, 'SqlSchemaParameter', {
      parameterName: '/rds/schema',
      stringValue: sqlSchema,
    });

    // Define Lambda Layer
    const pythonLayer = new lambda.LayerVersion(this, 'PythonLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/layers')),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      description: 'Shared python layer for Lambda',
    });

    // Lambda Function to Apply Schema
    const schemaApplyLambda = new lambda.Function(this, 'SchemaApplyLambda', {
      functionName: "lic-schema-apply",
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset('./lambda'),
      handler: 'schemaApply.lambda_handler',
      environment: {
        RDS_SECRET_ARN: rdsInstance.secret!.secretArn,
        SCHEMA_PARAM: schemaParameter.parameterName,
      },
      layers: [pythonLayer],
      allowPublicSubnet: true,
      timeout: cdk.Duration.minutes(15),
    });

    // Grant Lambda Access to RDS Secrets and SSM
    rdsInstance.secret!.grantRead(schemaApplyLambda);
    schemaParameter.grantRead(schemaApplyLambda);

    // IAM Policy for Lambda to Access RDS
    schemaApplyLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['rds:*', 'ssm:GetParameter'],
        resources: ['*'], // Adjust resource scope as needed
      })
    );

    // Lambda Function to handle form submissions
    const formHandlerLambda = new lambda.Function(this, 'FormHandlerLambda', {
      functionName: "lic-form-handler",
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'formHandler.lambda_handler',
      code: lambda.Code.fromAsset('./lambda'),
      environment: {
        RDS_SECRET_ARN: rdsInstance.secret!.secretArn,
      },
      layers: [pythonLayer],
      allowPublicSubnet: true,
      timeout: cdk.Duration.minutes(15),
    });

    // Allow Lambda to Access RDS Credentials
    if (rdsInstance.secret) {
      rdsInstance.secret.grantRead(formHandlerLambda);
      rdsInstance.secret.grantRead(schemaApplyLambda);
    }

    // API Gateway for the Lambda function
    const api = new apigateway.RestApi(this, 'FormSubmissionApi', {
      restApiName: 'Form Submission Service',
      description: 'Handles data submission from the static website.',
    });

    // Add a POST method to the API Gateway
    const formSubmission = api.root.addResource('submit');
    formSubmission.addMethod('POST', new apigateway.LambdaIntegration(formHandlerLambda), {
        authorizationType: apigateway.AuthorizationType.NONE,
        apiKeyRequired: false, // If you are not using an API key
    });

    // Add CORS support to the resource
    formSubmission.addCorsPreflight({
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Allow all origins or specify an array of allowed origins
        allowMethods: apigateway.Cors.ALL_METHODS, // Allow all HTTP methods (GET, POST, etc.)
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS, // Allow default headers or specify custom headers
    });

    // Outputs
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'URL for the static website hosted on S3',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: rdsInstance.instanceEndpoint.hostname,
      description: 'RDS Endpoint',
    });
  }
}
