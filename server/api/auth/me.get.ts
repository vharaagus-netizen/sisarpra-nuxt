import { getUserFromEvent } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromEvent(event)
  return {
    authenticated: Boolean(user),
    user,
  }
})

