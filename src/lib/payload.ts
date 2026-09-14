import { getPayload } from 'payload'
import config from '@payload-config'

/** Shared Payload Local API client for server components. */
export const getPayloadClient = async () => getPayload({ config })
