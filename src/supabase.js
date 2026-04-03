import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xkoameyqstnnpahlbuzf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrb2FtZXlxc3RubnBhaGxidXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzU3MTUsImV4cCI6MjA5MDgxMTcxNX0.g38H1HWq9K1LQKGOnLirPimgamGta2usRhtNaeBhJME'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
