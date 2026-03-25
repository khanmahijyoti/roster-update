import { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { tokens } from '../../theme/tokens'
import { ui } from '../../theme/styles'

type RestaurantRow = {
  id: string
  name: string
  timezone: string
}

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Australia/Perth',
  'Australia/Hobart',
  'Australia/Darwin',
]

export default function RestaurantsScreen() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('Australia/Sydney')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    loadRestaurants()
  }, [])

  async function loadRestaurants() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('restaurants')
        .select('id,name,timezone')
        .order('name')
      if (error) throw error
      setRestaurants((data || []) as RestaurantRow[])
    } catch (error) {
      console.error('Failed to load restaurants:', error)
      Alert.alert('Error', 'Could not load restaurants.')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setEditingId(null)
    setName('')
    setTimezone('Australia/Sydney')
  }

  function loadForEdit(restaurant: RestaurantRow) {
    setEditingId(restaurant.id)
    setName(restaurant.name)
    setTimezone(restaurant.timezone)
  }

  async function saveRestaurant() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Restaurant name is required.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase
          .from('restaurants')
          .update({ name: name.trim(), timezone })
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('restaurants').insert({
          name: name.trim(),
          timezone,
        })
        if (error) throw error
      }

      resetForm()
      await loadRestaurants()
      Alert.alert('Saved', editingId ? 'Restaurant updated.' : 'Restaurant created.')
    } catch (error: any) {
      console.error('Save restaurant failed:', error)
      Alert.alert('Failed', error?.message || 'Could not save restaurant.')
    } finally {
      setSaving(false)
    }
  }

  async function removeRestaurant(restaurant: RestaurantRow) {
    Alert.alert(
      'Delete restaurant',
      `Delete "${restaurant.name}"? This also removes related shifts and reports.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('restaurants').delete().eq('id', restaurant.id)
              if (error) throw error
              if (editingId === restaurant.id) {
                resetForm()
              }
              await loadRestaurants()
            } catch (error: any) {
              console.error('Delete restaurant failed:', error)
              Alert.alert('Failed', error?.message || 'Could not delete restaurant.')
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Restaurant Management</Text>
        <Text style={styles.subtitle}>Create, edit and remove restaurants</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{editingId ? 'Edit Restaurant' : 'Create Restaurant'}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Restaurant name"
            placeholderTextColor={tokens.color.mutedForeground}
          />

          <Text style={styles.label}>Timezone</Text>
          <View style={styles.rowWrap}>
            {TIMEZONES.map((tz) => (
              <Pressable
                key={tz}
                onPress={() => setTimezone(tz)}
                style={[styles.chip, timezone === tz ? styles.chipOn : null]}
              >
                <Text style={styles.chipText}>{tz.replace('Australia/', '')}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={saveRestaurant} style={styles.primaryBtn} disabled={saving}>
              <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Text>
            </Pressable>
            <Pressable onPress={resetForm} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Restaurants ({restaurants.length})</Text>
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!loading && restaurants.length === 0 ? <Text style={styles.muted}>No restaurants found.</Text> : null}

          {restaurants.map((restaurant) => (
            <View key={restaurant.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.value}>{restaurant.name}</Text>
                <Text style={styles.muted}>{restaurant.timezone}</Text>
              </View>
              <Pressable onPress={() => loadForEdit(restaurant)} style={styles.secondaryBtnSmall}>
                <Text style={styles.secondaryBtnText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => removeRestaurant(restaurant)} style={styles.deleteBtnSmall}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: ui.screen,
  container: ui.page,
  card: ui.card,
  title: ui.title,
  subtitle: ui.subtitle,
  sectionTitle: ui.sectionTitle,
  muted: ui.muted,
  value: ui.value,
  label: {
    color: tokens.color.mutedForeground,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: tokens.color.card,
    color: tokens.color.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: ui.chip,
  chipOn: ui.chipOn,
  chipText: ui.chipText,
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    ...ui.primaryButton,
    minWidth: 110,
  },
  primaryBtnText: ui.primaryButtonText,
  secondaryBtn: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: tokens.color.secondary,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryBtnSmall: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: tokens.color.secondary,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: tokens.color.secondaryForeground,
    fontWeight: '700',
  },
  deleteBtnSmall: {
    borderRadius: 8,
    backgroundColor: tokens.color.destructive,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteText: {
    color: tokens.color.destructiveForeground,
    fontWeight: '700',
  },
  itemRow: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: tokens.color.secondary,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})
