# CoDraft Supabase Auth Setup Guide

## Overview

This guide provides comprehensive recommendations for setting up authentication in CoDraft using Supabase Auth, including configuration, security best practices, and integration strategies.

## 1. Supabase Auth Configuration

### Authentication Settings

```javascript
// supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window?.localStorage, // Use localStorage for web
    flowType: 'pkce' // Recommended for better security
  }
})
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Server-side only
SUPABASE_JWT_SECRET=your-jwt-secret # For JWT verification
```

## 2. Authentication Providers

### Email/Password Authentication

```sql
-- Enable email/password auth in Supabase dashboard
-- Authentication > Settings > Enable email confirmations

-- Custom email templates can be configured in:
-- Authentication > Templates
```

### Social Authentication (Recommended)

Enable these OAuth providers in Supabase dashboard:

1. **Google OAuth** - For professional users
2. **GitHub OAuth** - For developers
3. **Discord OAuth** - For community-focused users

```javascript
// Social login implementation
const signInWithProvider = async (provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })

  if (error) console.error('Error:', error)
  return data
}
```

## 3. User Profile Management

### Automatic Profile Creation

The schema includes a trigger to automatically create user profiles:

```sql
-- This trigger is already included in supabase_triggers.sql
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();
```

### Profile Update Function

```javascript
// Client-side profile management
export const updateUserProfile = async (profileData) => {
  const { data: user } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      username: profileData.username,
      full_name: profileData.full_name,
      bio: profileData.bio,
      avatar_url: profileData.avatar_url,
      theme: profileData.theme,
      email_notifications: profileData.email_notifications,
      browser_notifications: profileData.browser_notifications
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}
```

## 4. Authentication Middleware

### Server-Side Auth Verification

```javascript
// middleware/auth.js
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export async function verifyAuth(req, res) {
  const supabase = createServerSupabaseClient({ req, res })

  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { authenticated: false, user: null }
    }

    return { authenticated: true, user }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { authenticated: false, user: null }
  }
}
```

### API Route Protection

```javascript
// API route example with auth protection
export default async function handler(req, res) {
  const { authenticated, user } = await verifyAuth(req, res)

  if (!authenticated) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Continue with authenticated request
  // user.id is available for database queries
}
```

## 5. Client-Side Auth State Management

### React Context Setup

```javascript
// contexts/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    fetchUserProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

## 6. Security Recommendations

### JWT Configuration

```sql
-- Set JWT expiry time (in Supabase dashboard)
-- Authentication > Settings > JWT expiry: 3600 (1 hour)

-- Configure JWT secrets properly
-- Ensure JWT_SECRET is stored securely
```

### Password Policies

Configure in Supabase Dashboard → Authentication → Settings:

- **Minimum password length**: 8 characters
- **Require uppercase**: Yes
- **Require lowercase**: Yes
- **Require numbers**: Yes
- **Require special characters**: Yes

### Rate Limiting

```sql
-- Enable rate limiting in Supabase dashboard
-- Authentication > Settings > Rate limits

-- Email signups: 30 per hour
-- Password resets: 10 per hour
-- Email OTP: 60 per hour
```

### CORS Configuration

```javascript
// Allow only your domain in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000'],
  credentials: true
}
```

## 7. Email Configuration

### Custom Email Templates

Configure in Supabase Dashboard → Authentication → Templates:

1. **Confirm Signup**
2. **Reset Password**
3. **Email Change**
4. **Magic Link**

### SMTP Settings

For production, configure custom SMTP:

```yaml
# In Supabase dashboard
SMTP_HOST: your-smtp-host
SMTP_PORT: 587
SMTP_USER: your-smtp-user
SMTP_PASS: your-smtp-password
```

## 8. Multi-Factor Authentication (MFA)

### Enable MFA Support

```javascript
// Enable MFA for users
const enableMFA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'CoDraft Account'
  })

  if (error) throw error

  // Show QR code to user
  return data
}

// Verify MFA
const verifyMFA = async (factorId, challengeId, code) => {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code
  })

  if (error) throw error
  return data
}
```

## 9. Session Management

### Automatic Session Refresh

```javascript
// Handle session refresh automatically
useEffect(() => {
  const handleAuthChange = (event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed automatically')
    }
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)

  return () => subscription.unsubscribe()
}, [])
```

### Manual Session Validation

```javascript
// Validate session before sensitive operations
const validateSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    // Redirect to login
    window.location.href = '/auth/login'
    return false
  }

  // Check if token is close to expiry (refresh if < 5 minutes)
  const expiresAt = session.expires_at * 1000
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

  if (expiresAt - now < fiveMinutes) {
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Session refresh failed:', error)
      return false
    }
  }

  return true
}
```

## 10. Testing Authentication

### Test User Setup

```javascript
// Create test users for development
const createTestUser = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: email.split('@')[0],
        full_name: 'Test User'
      }
    }
  })

  if (error) throw error
  return data
}
```

### Authentication Flow Testing

```javascript
// Test complete auth flow
describe('Authentication Flow', () => {
  test('User can sign up', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'TestPassword123!'
    })

    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
  })

  test('User profile is created automatically', async () => {
    // Test the trigger creates profile
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    expect(data).toBeTruthy()
    expect(data.username).toBeTruthy()
  })
})
```

## 11. Migration from Existing Auth

### Data Migration Script

```javascript
// Migrate existing users to Supabase Auth
const migrateUser = async (existingUser) => {
  try {
    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: existingUser.email,
      password: generateTempPassword(), // User will need to reset
      email_confirm: true,
      user_metadata: {
        username: existingUser.username,
        full_name: existingUser.full_name
      }
    })

    if (authError) throw authError

    // The trigger will create the profile automatically
    // Update any foreign key references
    await updateUserReferences(existingUser.id, authUser.user.id)

    console.log(`Migrated user: ${existingUser.email}`)
  } catch (error) {
    console.error(`Failed to migrate user ${existingUser.email}:`, error)
  }
}
```

## 12. Monitoring and Analytics

### Auth Event Tracking

```javascript
// Track authentication events
const trackAuthEvent = (event, metadata = {}) => {
  // Send to your analytics service
  analytics.track('auth_event', {
    event,
    timestamp: new Date().toISOString(),
    ...metadata
  })
}

// Use in auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  trackAuthEvent(event, {
    user_id: session?.user?.id,
    provider: session?.user?.app_metadata?.provider
  })
})
```

This comprehensive auth setup provides a secure, scalable foundation for CoDraft's user management while leveraging Supabase's powerful authentication features.