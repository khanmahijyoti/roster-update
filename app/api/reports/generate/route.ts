import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatDateISO } from '@/utils/date-utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { weekStart, weekEnd, restaurantId } = body;

    if (!weekStart || !weekEnd || !restaurantId) {
      return NextResponse.json(
        { error: 'Missing required fields: weekStart, weekEnd, restaurantId' },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    endDate.setHours(23, 59, 59, 999);

    // Get all shifts for the week at this restaurant
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select(`
        *,
        worker:profiles!worker_id(id, email, first_name, last_name),
        restaurant:restaurants(id, name)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('status', 'published')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time');

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 });
    }

    // Calculate worker statistics
    const workerStats = new Map<string, {
      worker_id: string;
      worker_name: string;
      worker_email: string;
      total_hours: number;
      shift_count: number;
      shifts: Array<{
        date: string;
        start_time: string;
        end_time: string;
        hours: number;
        restaurant_name: string;
      }>;
    }>();

    let totalHours = 0;

    shifts?.forEach((shift: any) => {
      const workerId = shift.worker_id;
      const startTime = new Date(shift.start_time);
      const endTime = new Date(shift.end_time);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      totalHours += hours;

      if (!workerStats.has(workerId)) {
        workerStats.set(workerId, {
          worker_id: workerId,
          worker_name: `${shift.worker?.first_name} ${shift.worker?.last_name}`,
          worker_email: shift.worker?.email || '',
          total_hours: 0,
          shift_count: 0,
          shifts: [],
        });
      }

      const stats = workerStats.get(workerId)!;
      stats.total_hours += hours;
      stats.shift_count += 1;
      stats.shifts.push({
        date: formatDateISO(startTime),
        start_time: shift.start_time,
        end_time: shift.end_time,
        hours: parseFloat(hours.toFixed(2)),
        restaurant_name: shift.restaurant?.name || '',
      });
    });

    // Convert map to array and sort by total hours
    const workerStatsArray = Array.from(workerStats.values())
      .sort((a, b) => b.total_hours - a.total_hours)
      .map(stat => ({
        ...stat,
        total_hours: parseFloat(stat.total_hours.toFixed(2)),
      }));

    // Build summary data
    const summaryData = {
      restaurant_name: shifts?.[0]?.restaurant?.name || '',
      week_start: formatDateISO(startDate),
      week_end: formatDateISO(endDate),
      total_shifts: shifts?.length || 0,
      total_workers: workerStatsArray.length,
      worker_stats: workerStatsArray,
      generated_at: new Date().toISOString(),
    };

    // Check if report already exists for this week and restaurant
    const { data: existingReport } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('week_start_date', formatDateISO(startDate))
      .single();

    if (existingReport) {
      // Update existing report
      const { data: updatedReport, error: updateError } = await supabase
        .from('weekly_reports')
        .update({
          summary_data: summaryData,
          total_hours: parseFloat(totalHours.toFixed(2)),
        })
        .eq('id', existingReport.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating report:', updateError);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Report updated successfully',
        report: updatedReport,
      });
    } else {
      // Create new report
      const { data: newReport, error: insertError } = await supabase
        .from('weekly_reports')
        .insert({
          restaurant_id: restaurantId,
          week_start_date: formatDateISO(startDate),
          week_end_date: formatDateISO(endDate),
          summary_data: summaryData,
          total_hours: parseFloat(totalHours.toFixed(2)),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating report:', insertError);
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Report generated successfully',
        report: newReport,
      });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
