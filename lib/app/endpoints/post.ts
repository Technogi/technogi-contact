import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { plainToClass } from 'class-transformer'
import { getEnv } from '../utils';
import { ContactRequest } from '../models';

const dynamodb = new DynamoDBClient({ region: getEnv('AWS_REGION', 'us-east-1') });
const stepFunctions = new SFNClient({ region: getEnv('AWS_REGION', 'us-east-1') });

const defaultHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Origin': '*',
}


export const handler: APIGatewayProxyHandler = async (event, _ctx) => {
  try {
    const { email, comments = '', leadType = 'General Lead', name = '' } = plainToClass(ContactRequest, JSON.parse(event.body || '{}'))
    if (!email) {
      return {
        headers: defaultHeaders,
        statusCode: 400,
        body: JSON.stringify({
          errorCode: 'EmailMissing',
          errorMessage: {
            es: 'El correo electrónico es requerido',
            en: 'Email is required'
          }
        })
      }
    }

    await dynamodb.send(new PutItemCommand({
      Item: {
        id: { S: `${email}-${Date.now()}` },
        name: { S: name },
        email: { S: email },
        comments: { S: comments },
        leadType: { S: leadType }
      },
      TableName: getEnv('TABLE_NAME'),
    }))

    await stepFunctions.send(new StartExecutionCommand({
      stateMachineArn: getEnv('WORKFLOW_ARN'),
      input: event.body || '{}'
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'received' }),
      headers: defaultHeaders,

    }
  } catch (e) {
    console.error('Error saving request', e)
    console.log(event.body)
    return {
      headers: defaultHeaders,
      statusCode: 500,
      body: JSON.stringify({
        errorCode: 'Internal',
        errorMessage: {
          es: 'Ha habido un error. Intente más tarde',
          en: 'We are having troubles. Please try again later'
        }
      })
    }
  }
}