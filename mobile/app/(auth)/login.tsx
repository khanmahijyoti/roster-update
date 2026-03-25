import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../context/session-context'
import { useRouter } from 'expo-router'
import { tokens } from '../../theme/tokens'

export default function LoginScreen() {
  const { session } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      router.replace('/(app)')
    }
  }, [router, session])

  async function onSignIn() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        Alert.alert('Sign in failed', error.message)
        console.error('Sign in error:', error)
      } else {
        console.log('Sign in successful:', data.user.email)
        // Session context will handle navigation automatically
      }
    } catch (err) {
      console.error('Sign in exception:', err)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your roster</Text>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        <Pressable disabled={loading} onPress={onSignIn} style={styles.button}>
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
        </Pressable>

        <View style={styles.row}>
          <Text style={styles.rowText}>Need an account?</Text>
          <Link href="/(auth)/signup" style={styles.link}>
            Create one
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.color.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: tokens.color.foreground,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: tokens.color.mutedForeground,
    marginTop: 8,
  },
  form: {
    gap: 12,
    marginTop: 24,
  },
  input: {
    backgroundColor: tokens.color.card,
    borderColor: tokens.color.border,
    borderRadius: 10,
    borderWidth: 1,
    color: tokens.color.foreground,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary,
    borderRadius: 10,
    marginTop: 20,
    paddingVertical: 14,
  },
  buttonText: {
    color: tokens.color.primaryForeground,
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  rowText: {
    color: tokens.color.mutedForeground,
  },
  link: {
    color: tokens.color.primary,
    fontWeight: '600',
  },
})
