import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { getEnv } from '../app/utils';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as pipelines from 'aws-cdk-lib/pipelines';

const StackName = 'TechnogiContactEndpointLambdaStack'
export class CiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const applicationName = getEnv('APPLICATION')
    const stage = getEnv('STAGE')

    // Define the pipeline
    const sourceOutput = new codepipeline.Artifact(`${applicationName}-code-${stage}`);
    const cdkBuildOutput = new codepipeline.Artifact(`${applicationName}-build-output-${stage}`);

    const pipeline = new codepipeline.Pipeline(this, 'pipeline', {
      pipelineName: `${applicationName}-${stage}`,

    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new actions.CodeStarConnectionsSourceAction({
          actionName: 'source',
          connectionArn: getEnv('CODESTAR_CONNECTION_ARN'),
          owner: getEnv('GITHUB_OWNER'),
          repo: getEnv('GITHUB_REPO'),
          output: sourceOutput,
          branch: 'main'
        }),
      ]
    })

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new actions.CodeBuildAction({
          actionName: 'build',
          project: new codebuild.PipelineProject(this, 'build-project', {
            projectName: `${applicationName}-${stage}`,
            buildSpec: codebuild.BuildSpec.fromObject({
              version: '0.2',
              phases: {
                install: { commands: ['npm install'] },
                build: { commands: ['npm run cdk synth -- -o dist'] }
              },
              artifacts: {
                'base-directory': 'dist',
                files: [
                  `${StackName}.template.json`
                ]
              }
            })
          }),
          input: sourceOutput,
          outputs: [cdkBuildOutput]
        })
      ]
    })

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new actions.CloudFormationCreateUpdateStackAction({
          actionName: 'deploy',
          templatePath: cdkBuildOutput.atPath(`${StackName}.template.json`),
          stackName: StackName,
          adminPermissions: true,
          parameterOverrides: {
            env: stage,
          },
          extraInputs: [sourceOutput],
        }),
      ]
    })

  }

}
