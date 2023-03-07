import axios from 'axios'
import { getEnv } from '../utils'
import { ContactRequest } from '../models'



/**
 * Register the contact request as a PipeDriveLead
 *
 * @export
 * @param {ContactRequest} { email, name = 'Not Provided', leadType = 'General Lead', comments }
 */
export async function registerLead({ email, name = 'Not Provided', leadType = 'General Lead', comments }: ContactRequest) {
  // Search for contact with this email
  let personId
  try {
    const personData = await axios.get(`${getEnv('PIPE_DRIVE_API_URL')}/persons/search`, {
      params: {
        term: email,
        fields: 'email',
        api_token: getEnv('PIPE_DRIVE_API_KEY'),
        exact_match: 'true'
      }
    })

    if (personData.data?.data?.items?.length > 0) {
      personId = personData.data.data.items[0]?.item?.id
    } else {
      const newPersonData = await axios.post(
        `${getEnv('PIPE_DRIVE_API_URL')}/persons`,
        { name, email },
        { params: { api_token: getEnv('PIPE_DRIVE_API_KEY') } })
      personId = newPersonData?.data?.data?.id
    }
  } catch (e) {
    console.error(e)
    throw new Error('Error generating person id')
  }

  //Registering lead
  let leadId
  try {
    const leadData = await axios.post(`${getEnv('PIPE_DRIVE_API_URL')}/leads`, {
      title: leadType,
      person_id: personId
    }, { params: { api_token: getEnv('PIPE_DRIVE_API_KEY') } })

    leadId = leadData.data.data?.id

  } catch (e) {
    console.error(e)
    throw new Error('Error registering lead')
  }

  //Registering comment
  if (comments)
    try {
      await axios.post(`${getEnv('PIPE_DRIVE_API_URL')}/notes`, {
        content: comments,
        lead_id: leadId
      }, { params: { api_token: getEnv('PIPE_DRIVE_API_KEY') } })

    } catch (e) {
      console.error(e)
      throw new Error('Error registering comment for lead')
    }
}
