const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!key) throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set')

export const PUBLISHABLE_KEY: string = key
