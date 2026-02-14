'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Building2, Check, X } from 'lucide-react';
import { Restaurant } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface RestaurantManagerProps {
  restaurants: Restaurant[];
  onRestaurantsChange: () => void;
}

export function RestaurantManager({ restaurants, onRestaurantsChange }: RestaurantManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    timezone: 'Australia/Sydney',
  });

  const supabase = createClient();

  const timezones = [
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Australia/Adelaide',
    'Australia/Perth',
    'Australia/Hobart',
    'Australia/Darwin',
  ];

  async function handleCreateRestaurant(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newRestaurant.name.trim()) {
      setError('Restaurant name is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      const { error: insertError } = await supabase
        .from('restaurants')
        .insert({
          name: newRestaurant.name.trim(),
          timezone: newRestaurant.timezone,
        });

      if (insertError) throw insertError;

      setSuccess(`Restaurant "${newRestaurant.name}" created successfully!`);
      setNewRestaurant({ name: '', timezone: 'Australia/Sydney' });
      setShowCreateForm(false);
      onRestaurantsChange();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error creating restaurant:', err);
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteRestaurant(restaurantId: string, restaurantName: string) {
    if (!confirm(`Are you sure you want to delete "${restaurantName}"? This will also delete all shifts, assignments, and reports for this restaurant.`)) {
      return;
    }

    try {
      setDeleting(restaurantId);
      setError(null);
      setSuccess(null);

      const { error: deleteError } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId);

      if (deleteError) throw deleteError;

      setSuccess(`Restaurant "${restaurantName}" deleted successfully!`);
      onRestaurantsChange();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting restaurant:', err);
      setError(err.message || 'Failed to delete restaurant');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Restaurant Management</CardTitle>
            <CardDescription>
              Create and manage restaurants in your system
            </CardDescription>
          </div>
          {!showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Restaurant
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
            <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start gap-2">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card className="border-2 border-blue-500">
            <CardHeader>
              <CardTitle className="text-lg">Create New Restaurant</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRestaurant} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Main Branch, Downtown Location"
                    value={newRestaurant.name}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
                    required
                    disabled={creating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={newRestaurant.timezone}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, timezone: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    disabled={creating}
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={creating} className="flex-1">
                    {creating ? 'Creating...' : 'Create Restaurant'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setError(null);
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Restaurant List */}
        {restaurants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No restaurants yet</p>
            <p className="text-sm">Create your first restaurant to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-gray-700">
              Existing Restaurants ({restaurants.length})
            </h3>
            <div className="space-y-2">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{restaurant.name}</p>
                      <p className="text-xs text-gray-500">{restaurant.timezone}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRestaurant(restaurant.id, restaurant.name)}
                    disabled={deleting === restaurant.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deleting === restaurant.id ? (
                      'Deleting...'
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
