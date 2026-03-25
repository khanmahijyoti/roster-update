import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function AppLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Redirecting...' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin' }} />
        <Stack.Screen name="restaurants" options={{ title: 'Restaurants' }} />
        <Stack.Screen name="worker" options={{ title: 'Worker' }} />
        <Stack.Screen name="reports" options={{ title: 'Reports' }} />
        <Stack.Screen name="archive" options={{ title: 'Archive' }} />
      </Stack>
    </>
  )
}
