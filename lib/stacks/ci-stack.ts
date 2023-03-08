import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { getEnv } from '../app/utils';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ApplicationStackName } from './constants';
import { NotificationRule } from 'aws-cdk-lib/aws-codestarnotifications';

export class CiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const applicationName = getEnv('APPLICATION')
    const stage = getEnv('STAGE')

    // Define the pipeline
    const sourceOutput = new codepipeline.Artifact(`${applicationName}-code-${stage}`);
    //const cdkBuildOutput = new codepipeline.Artifact(`${applicationName}-build-output-${stage}`);

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


    const buildProject = new codebuild.PipelineProject(this, 'build-project', {
      projectName: `${applicationName}-${stage}`,
      role: this.createBuildRole(applicationName, stage),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4
      },
      environmentVariables: {
        AWS_ACCOUNT: { value: this.account },
        AWS_REGION: { value: this.region },
        APPLICATION: { value: getEnv('APPLICATION') },
        STAGE: { value: getEnv('STAGE') },
        PIPE_DRIVE_API_KEY: {
          value: getEnv('PIPE_DRIVE_API_KEY'),
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT
        },
        PIPE_DRIVE_API_URL: { value: getEnv('PIPE_DRIVE_API_URL') },
        GITHUB_REPO: { value: getEnv('GITHUB_REPO') },
        GITHUB_OWNER: { value: getEnv('GITHUB_OWNER') },
        CODESTAR_CONNECTION_ARN: { value: getEnv('CODESTAR_CONNECTION_ARN') },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: { commands: ['n 16', 'npm install'] },
          build: { commands: [`npm run cdk deploy -- ${ApplicationStackName} --require-approval never`] }
        },
        // artifacts: {
        //   'base-directory': 'dist',
        //   files: [
        //     `${StackName}.template.json`
        //   ]
        // }
      })
    })


    const buildAction = new actions.CodeBuildAction({
      actionName: 'build',
      project: buildProject,
      input: sourceOutput,
      //outputs: [cdkBuildOutput]
    })

    new cdk.CfnOutput(this, 'RoleB', {
      value: buildProject?.role?.roleName || 'na'
    })

    new cdk.CfnOutput(this, 'RoleA', {
      value: buildAction.actionProperties?.role?.roleName || 'na'
    })

    new cdk.CfnOutput(this, 'RoleP', {
      value: pipeline.role?.roleName
    })

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [buildAction]
    })

    // pipeline.addStage({
    //   stageName: 'Deploy',
    //   actions: [
    //     new actions.CloudFormationCreateUpdateStackAction({
    //       actionName: 'deploy',
    //       templatePath: cdkBuildOutput.atPath(`${StackName}.template.json`),
    //       stackName: StackName,
    //       adminPermissions: true,
    //       parameterOverrides: {
    //         env: stage,
    //       },
    //       extraInputs: [sourceOutput],
    //     }),
    //   ]
    // })

  }

  createBuildRole(applicationName: string, stage: string) {
    const deployRole = new iam.Role(this, 'role', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      roleName: `${applicationName}-ci-${stage}`,
      description: `deploys ${applicationName} at ${stage}`,
    })

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'cloudformation:CreateStack',
          'cloudformation:UpdateStack',
          'cloudformation:DescribeStacks',
          'cloudformation:DeleteStack',
          'cloudformation:CreateChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:ValidateTemplate',
        ],
        resources: [
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/*`,
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/CDKToolkit/*`
        ],
      }))

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'ssm:GetParameter',
        ],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/cdk-bootstrap/*`
        ],
      }))

    deployRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      resources: [
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/codebuild/${applicationName}-${stage}:*`,
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/codebuild/${applicationName}-${stage}`
      ]
    }))


    deployRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: [
        "codebuild:BatchPutCodeCoverages",
        "codebuild:BatchPutTestCases",
        "codebuild:CreateReport",
        "codebuild:CreateReportGroup",
        "codebuild:UpdateReport"
      ],
      resources: [
        `arn:aws:codebuild:${this.region}:${this.account}:report-group/${applicationName}-${stage}-*`
      ]
    }))

    deployRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: [
        "s3:GetBucket*",
        "s3:GetObject*",
        "s3:List*"
      ],
      resources: [
        `arn:aws:s3:::${applicationName}-ci-${stage}-*`,
        `arn:aws:s3:::${applicationName}-ci-${stage}-*/*`
      ]
    }))

    deployRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: [
        "kms:Decrypt",
        "kms:DescribeKey",
        "kms:Encrypt",
        "kms:GenerateDataKey*",
        "kms:ReEncrypt*"
      ],
      resources: [
        `arn:aws:kms:${this.region}:${this.account}:key/*`
      ]
    }))

    return deployRole

  }

}
