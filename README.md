# LIC Serverless POC

## Overview

This project uses a `Makefile` to streamline the development workflow for a cloud application. The Makefile includes tasks for installing dependencies, setting up AWS Lambda layers, bootstrapping and deploying the CDK application, and applying a database schema. 

## Prerequisites

Ensure the following tools are installed and properly configured:

1. **Node.js and npm**: For managing JavaScript dependencies.
2. **Python 3.x and pip**: For handling Python dependencies.
3. **AWS CDK**: For deploying the infrastructure.
4. **AWS CLI**: For managing AWS resources.
5. **jq**: For processing JSON outputs.

## Usage

You can use the provided `Makefile` to automate tasks. Below is a description of each target.

### Makefile Targets

### `install-deps`
Installs all Node.js dependencies specified in `package.json`.

**Usage:**
```sh
make install-deps
```

### `setup-lambda`
Sets up Python dependencies required for AWS Lambda layers. Dependencies are installed in the `lambda/layers/python` directory.

**Usage:**
```sh
make setup-lambda
```

### `bootstrap`
Bootstraps the AWS CDK application. This is required before deploying any CDK stacks.

**Usage:**
```sh
make bootstrap
```

### `deploy`
Deploys the AWS CDK application. This deploys all stacks defined in the application.

Replace with your API Gateway URL in `website-dist/index.html` coming from deployment output and redeploy.

**Usage:**
```sh
make deploy
```

### `schema`
Applies the database schema by invoking an AWS Lambda function named `lic-schema-apply`.

**Usage:**
```sh
make schema
```

### `all`
Runs all tasks in sequence: `install-deps`, `setup-lambda`, `bootstrap`, `deploy`, and `schema`.

**Usage:**
```sh
make all
```

## Notes

- Ensure you have the necessary AWS credentials configured to perform deployments and invoke Lambda functions.
- Modify the `Makefile` or related configuration files as needed to suit your specific project requirements.

