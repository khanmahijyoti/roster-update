import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeek } from '@/utils/date-utils';

/**
 * This endpoint should be called by a cron job every Saturday night at 23:30
 * It will generate reports for all restaurants for the current week
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get current week dates
    const currentWeek = getCurrentWeek();
    const weekStart = currentWeek.start.toISOString().split('T')[0];
    const weekEnd = currentWeek.end.toISOString().split('T')[0];

    // Get all restaurants
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name');

    if (restaurantsError) {
      console.error('Error fetching restaurants:', restaurantsError);
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      );
    }

    const results = [];
    const errors = [];

    // Generate report for each restaurant
    for (const restaurant of restaurants || []) {
      try {
        // Call the generate endpoint internally
        const generateUrl = new URL('/api/reports/generate', request.url);
        const response = await fetch(generateUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            weekStart,
            weekEnd,
            restaurantId: restaurant.id,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            status: 'success',
            data,
          });
        } else {
          const errorData = await response.json();
          errors.push({
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            status: 'failed',
            error: errorData.error,
          });
        }
      } catch (error: any) {
        errors.push({
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated reports for ${results.length} restaurants`,
      week_start: weekStart,
      week_end: weekEnd,
      results,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in auto-generate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
