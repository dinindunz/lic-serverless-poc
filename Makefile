.PHONY: all install-deps setup-lambda bootstrap deploy schema

# Install npm dependencies
install-deps:
	npm install

# Setup Python dependencies for Lambda layers
setup-lambda:
	mkdir -p lambda/layers/python
	python3 -m pip install -r lambda/layers/requirements.txt --target lambda/layers/python

# Bootstrap the CDK application
bootstrap:
	cdk bootstrap

# Deploy the CDK application
deploy:
	cdk deploy

# Apply database schema
schema:
	@echo "Deploying database schema"
	aws lambda invoke --function-name lic-schema-apply --region ap-southeast-2 --payload '{}' response.json | jq

# Run all tasks in sequence
all: install-deps setup-lambda bootstrap deploy schema
