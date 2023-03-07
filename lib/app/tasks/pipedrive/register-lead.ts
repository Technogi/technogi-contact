import { Handler } from 'aws-lambda'
import { plainToClass } from 'class-transformer'
import { registerLead } from '../../business/register-lead-on-pipe-drive'
import { ContactRequest } from '../../models'

export const handler: Handler = async event => {
  const request = plainToClass(ContactRequest, event)
  await registerLead(request)
  return 'OK'
}