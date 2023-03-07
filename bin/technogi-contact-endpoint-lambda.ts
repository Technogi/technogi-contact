#!/usr/bin/env node
import 'source-map-support/register';
import { config } from 'dotenv'
import * as cdk from 'aws-cdk-lib';
import { TechnogiContactEndpointLambdaStack } from '../lib/technogi-contact-endpoint-lambda-stack';
import { getEnv } from '../lib/app/utils';

config()
const stage = getEnv('STAGE')
const app = new cdk.App();

new TechnogiContactEndpointLambdaStack(app, 'TechnogiContactEndpointLambdaStack', {
  env: { account: getEnv('AWS_ACCOUNT'), region: getEnv('AWS_REGION', 'us-east-1') },
  stackName: `technogi-contact-${stage}`,
  description: 'Contact Application',
  tags: {
    Stage: stage,
    Application: getEnv('APPLICATION')
  }
});