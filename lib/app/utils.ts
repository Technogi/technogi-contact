/**
 * Gets Env variable. If does not exists, gets a default value. If no default value
 * is provided, an exception is thrown
 * @param {string} env
 * @param {string} [defaultValue]
 * @return {*} 
 */
export function getEnv(env: string, defaultValue?: string) {
  const val = process.env[env] || defaultValue
  if (!val) throw new Error(`environment variable ${env} is not defined`)
  return val
}