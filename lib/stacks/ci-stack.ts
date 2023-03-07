import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { getEnv } from '../app/utils';
import * as pipelines from 'aws-cdk-lib/pipelines';

export class CiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new pipelines.CodePipeline(this, 'pipeline', {
      pipelineName: getEnv('APPLICATION'),
      synth: new pipelines.ShellStep('synth', {
        input: pipelines.CodePipelineSource.gitHub(getEnv('GITHUB_REPO'), 'main'),
        commands: ['npm ci', 'npm run build', 'npx cdk synth']
      }),
    })
  }

}
