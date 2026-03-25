import { Redirect } from 'expo-router'
import { useSession } from '../context/session-context'

export default function IndexScreen() {
  const { session } = useSession()
  return session ? <Redirect href="/(app)" /> : <Redirect href="/(auth)" />
}
