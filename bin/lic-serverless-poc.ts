#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LicServerlessPocStack } from '../lib/lic-serverless-poc';

const app = new cdk.App();
new LicServerlessPocStack(app, 'LicServerlessPocStack-1-0');
