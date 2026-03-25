import { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../context/session-context'

export default function HomeScreen() {
  const { session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function resolveRole() {
      if (!session?.user.id) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        console.error('Failed to load role:', error)
        router.replace('/(app)/worker')
        setLoading(false)
        return
      }

      if (!data) {
        console.warn('No profile row found for user. Defaulting to worker route.')
        router.replace('/(app)/worker')
        setLoading(false)
        return
      }

      if (data?.role === 'super_admin') {
        router.replace('/(app)/admin')
      } else {
        router.replace('/(app)/worker')
      }

      setLoading(false)
    }

    resolveRole()

    return () => {
      active = false
    }
  }, [router, session?.user.id])

  if (!loading) {
    return null
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.subtitle}>Loading your dashboard...</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 12,
  },
})
