#!/bin/bash
npm install -g aws-cdk
npm install
pushd lambda/layers/
mkdir python
python3 -m pip install -r requirements.txt --target ./python
popd
cdk bootstrap
cdk deploy
aws lambda invoke --function-name lic-schema-apply
