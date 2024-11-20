#!/bin/bash
npm install -g aws-cdk
npm install
pushd lambda/layers/
mkdir python
python3 -m pip install -r requirements.txt --target ./python
popd
cdk bootstrap
cdk deploy
echo "Deploying database schema"
aws lambda invoke --function-name lic-schema-apply --region ap-southeast-2 --payload {} response.json
