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

export default function SignupScreen() {
  const { session } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      router.replace('/(app)')
    }
  }, [router, session])

  async function onSignUp() {
    if (!email || !password || !fullName) {
      Alert.alert('Missing fields', 'Please complete all fields.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    setLoading(false)

    if (error) {
      Alert.alert('Sign up failed', error.message)
      return
    }

    Alert.alert('Account created', 'You can now sign in.')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start using roster mobile</Text>

        <View style={styles.form}>
          <TextInput
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={fullName}
          />
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

        <Pressable disabled={loading} onPress={onSignUp} style={styles.button}>
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create account'}</Text>
        </Pressable>

        <View style={styles.row}>
          <Text style={styles.rowText}>Already have an account?</Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
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
