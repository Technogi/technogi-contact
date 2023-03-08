#!/usr/bin/env node
import 'source-map-support/register';
import { config } from 'dotenv'
import * as cdk from 'aws-cdk-lib';
import { ContactWorkflowStack } from '../lib/stacks/contact-workflow-stack';
import { getEnv } from '../lib/app/utils';
import { CiStack } from '../lib/stacks/ci-stack';
import { ApplicationStackName } from '../lib/stacks/constants';

config()
const stage = getEnv('STAGE')
const app = new cdk.App();

new ContactWorkflowStack(app, ApplicationStackName, {
  env: { account: getEnv('AWS_ACCOUNT'), region: getEnv('AWS_REGION', 'us-east-1') },
  stackName: `technogi-contact-${stage}`,
  description: 'Contact Application',
  tags: {
    Stage: stage,
    Application: getEnv('APPLICATION')
  }
});

new CiStack(app, 'TechnogiContactCiStack', {
  env: { account: getEnv('AWS_ACCOUNT'), region: getEnv('AWS_REGION', 'us-east-1') },
  stackName: `technogi-contact-ci-${stage}`,
  description: 'Contact Application CI',
  tags: {
    Stage: stage,
    Application: getEnv('APPLICATION')
  }
})