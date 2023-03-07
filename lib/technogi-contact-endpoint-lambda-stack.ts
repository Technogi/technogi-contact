import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { getEnv } from './app/utils';
import { resolve } from 'path';

export class TechnogiContactEndpointLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stage = getEnv('STAGE')

    const contactRequestsTable = new dynamodb.Table(this, 'contact-requests', {
      tableName: `${getEnv('APPLICATION')}-contact-requests`,
      tableClass: dynamodb.TableClass.STANDARD,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      }
    })

    const postContactRequest = new nodejs.NodejsFunction(this, 'post-contact-request', {
      functionName: `${getEnv('APPLICATION')}-post-contact-request-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      description: 'Posts a contact Request to Technogi\'s Team',
      entry: resolve(__dirname, 'app', 'endpoints', 'post.ts'),
      environment: {
        STAGE: getEnv('STAGE'),
        TABLE_NAME: contactRequestsTable.tableName,
      }
    })

    const registerLeadAtPipeDrive = new nodejs.NodejsFunction(this, 'register-lead', {
      functionName: `${getEnv('APPLICATION')}-register-lead-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      description: 'Registers lead at PipeDrive CRM',
      entry: resolve(__dirname, 'app', 'tasks', 'pipedrive/register-lead.ts'),
      environment: {
        STAGE: getEnv('STAGE'),
        PIPE_DRIVE_API_KEY: getEnv('PIPE_DRIVE_API_KEY'),
        PIPE_DRIVE_API_URL: getEnv('PIPE_DRIVE_API_URL'),
      }
    })

    const definition = new tasks.LambdaInvoke(this, 'register-lead-step', {
      lambdaFunction: registerLeadAtPipeDrive,
      timeout: cdk.Duration.seconds(30),
    })

    const contactWorkFlow = new sfn.StateMachine(this, 'contact-workflow', {
      definition,
      timeout: cdk.Duration.minutes(1),
      stateMachineName: `${getEnv('APPLICATION')}-contact-workflow`
    })

    contactRequestsTable.grantWriteData(postContactRequest)
    contactWorkFlow.grantStartExecution(postContactRequest)

    postContactRequest.addEnvironment('WORKFLOW_ARN', contactWorkFlow.stateMachineArn)

  }
}
