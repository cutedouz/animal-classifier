import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL 沒有讀到')
}

if (!supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 沒有讀到')
}

export const supabase = createClient(supabaseUrl, supabaseKey)