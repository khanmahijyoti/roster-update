'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, Users, Clock, Building2, ChevronDown, ChevronUp, FileDown, RefreshCw, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportReportToPDF } from '@/utils/pdf-export';
import { AdminNav } from '@/components/layout/AdminNav';

interface ArchivedWeek {
  weekStart: Date;
  weekEnd: Date;
  label: string;
}

interface WorkerStat {
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
}

interface ReportSummary {
  restaurant_name: string;
  week_start: string;
  week_end: string;
  total_shifts: number;
  total_workers: number;
  worker_stats: WorkerStat[];
  generated_at: string;
}

interface Report {
  id: string;
  restaurant_id: string;
  week_start_date: string;
  week_end_date: string;
  summary_data: ReportSummary;
  total_hours: number;
  created_at: string;
}

export default function ReportsPage() {
  const { user, profile, role, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [availableWeeks, setAvailableWeeks] = useState<ArchivedWeek[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (role !== 'super_admin' && role !== 'worker') {
        router.push('/dashboard');
      } else {
        loadReports();
        loadRestaurants();
        generateAvailableWeeks();
      }
    }
  }, [user, role, authLoading]);

  // Auto-select first report when week changes
  useEffect(() => {
    const filteredReports = getFilteredReports();
    if (filteredReports.length > 0) {
      setSelectedReport(filteredReports[0]);
    } else {
      setSelectedReport(null);
    }
  }, [selectedWeekIndex]);

  async function loadReports() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .order('week_start_date', { ascending: false });

      if (error) throw error;

      setReports((data as Report[]) || []);

      // Auto-select the most recent report
      if (data && data.length > 0 && !selectedReport) {
        setSelectedReport(data[0] as Report);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRestaurants() {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name');

      if (error) throw error;

      setRestaurants(data || []);
      if (data && data.length > 0) {
        setSelectedRestaurantId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading restaurants:', error);
    }
  }

  async function generateAvailableWeeks() {
    try {
      // Find the earliest shift in the database
      const { data: earliestShift, error } = await supabase
        .from('shifts')
        .select('start_time')
        .order('start_time', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (!earliestShift || earliestShift.length === 0) {
        // No shifts yet, just show empty
        setAvailableWeeks([]);
        return;
      }

      const firstShiftDate = new Date(earliestShift[0].start_time);
      const today = new Date();
      
      // Find the Monday of the week containing the first shift
      const firstShiftDay = firstShiftDate.getDay();
      const daysFromMonday = firstShiftDay === 0 ? 6 : firstShiftDay - 1;
      const firstWeekStart = new Date(firstShiftDate);
      firstWeekStart.setDate(firstShiftDate.getDate() - daysFromMonday);
      firstWeekStart.setHours(0, 0, 0, 0);
      
      // Find the Sunday of the most recent completed week
      const todayDay = today.getDay();
      const daysToLastSunday = todayDay === 0 ? 7 : todayDay;
      const lastCompletedWeekEnd = new Date(today);
      lastCompletedWeekEnd.setDate(today.getDate() - daysToLastSunday);
      lastCompletedWeekEnd.setHours(23, 59, 59, 999);
      
      // Generate all weeks from first week to last completed week
      const weeks: ArchivedWeek[] = [];
      let currentWeekStart = new Date(firstWeekStart);
      
      while (currentWeekStart <= lastCompletedWeekEnd) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);
        weekEnd.setHours(0, 0, 0, 0); // Keep at start of day for consistent date formatting
        
        weeks.push({
          weekStart: new Date(currentWeekStart),
          weekEnd: new Date(weekEnd),
          label: `${formatDate(formatDateToYYYYMMDD(currentWeekStart))} - ${formatDate(formatDateToYYYYMMDD(weekEnd))}`,
        });
        
        // Move to next week
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }
      
      // Reverse so most recent weeks are first
      weeks.reverse();
      
      setAvailableWeeks(weeks);
    } catch (error) {
      console.error('Error generating available weeks:', error);
      setAvailableWeeks([]);
    }
  }

  async function handleGenerateReport() {
    if (!selectedRestaurantId) {
      alert('Please select a restaurant');
      return;
    }

    if (availableWeeks.length === 0) {
      alert('No weeks available. Please ensure shifts exist in the system.');
      return;
    }

    // Get the currently selected week from the week selector
    const selectedWeek = availableWeeks[selectedWeekIndex];
    const weekStart = formatDateToYYYYMMDD(selectedWeek.weekStart);
    const weekEnd = formatDateToYYYYMMDD(selectedWeek.weekEnd);

    console.log('Generating report for:', weekStart, 'to', weekEnd);

    try {
      setGeneratingReport(true);

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekStart,
          weekEnd,
          restaurantId: selectedRestaurantId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Report generated successfully for week ${weekStart} to ${weekEnd}!`);
        setShowGenerateForm(false);
        
        // Reload reports to show the new one
        await loadReports();
        
        // The week is already selected (selectedWeekIndex), so the report will show automatically
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // Group reports by week
  function groupReportsByWeek(): Map<string, Report[]> {
    const grouped = new Map<string, Report[]>();
    
    reports.forEach((report) => {
      const weekKey = `${report.week_start_date}_${report.week_end_date}`;
      if (!grouped.has(weekKey)) {
        grouped.set(weekKey, []);
      }
      grouped.get(weekKey)!.push(report);
    });
    
    return grouped;
  }

  // Filter reports by selected week
  function getFilteredReports(): Report[] {
    if (availableWeeks.length === 0) return reports;
    
    const selectedWeek = availableWeeks[selectedWeekIndex];
    
    // Format dates consistently - use local date string (YYYY-MM-DD)
    const weekStartStr = formatDateToYYYYMMDD(selectedWeek.weekStart);
    const weekEndStr = formatDateToYYYYMMDD(selectedWeek.weekEnd);
    
    console.log('Filtering reports:');
    console.log('Selected week:', weekStartStr, 'to', weekEndStr);
    console.log('Available reports:', reports.map(r => ({
      id: r.id,
      start: r.week_start_date,
      end: r.week_end_date,
      restaurant: r.summary_data.restaurant_name
    })));
    
    const filtered = reports.filter(report => {
      const matches = report.week_start_date === weekStartStr && report.week_end_date === weekEndStr;
      console.log(`Report ${report.id}: ${report.week_start_date} to ${report.week_end_date} - Matches: ${matches}`);
      return matches;
    });
    
    console.log('Filtered reports:', filtered.length);
    return filtered;
  }
  
  // Helper to format date as YYYY-MM-DD in local timezone
  function formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function exportToCSV(report: Report) {
    const summary = report.summary_data;
    let csv = 'Worker Name,Worker Email,Total Hours,Shift Count\n';

    summary.worker_stats.forEach((worker) => {
      csv += `"${worker.worker_name}","${worker.worker_email}",${worker.total_hours},${worker.shift_count}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${summary.week_start}-${summary.week_end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <AdminNav onSignOut={signOut} />

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                Weekly Reports
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                View worker hours and shift history
              </p>
            </div>
            <Button
              onClick={() => setShowGenerateForm(!showGenerateForm)}
              className="shadow-sm text-sm sm:text-base w-fit"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>

          {/* Week Selector Controls */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-6">
                <label className="text-sm font-medium">Select Week:</label>
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedWeekIndex(Math.min(selectedWeekIndex + 1, availableWeeks.length - 1))}
                    disabled={selectedWeekIndex >= availableWeeks.length - 1 || availableWeeks.length === 0}
                    className="shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <select
                    value={selectedWeekIndex}
                    onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
                    className="flex-1 h-10 rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    disabled={availableWeeks.length === 0}
                  >
                    {availableWeeks.map((week, index) => (
                      <option key={index} value={index}>
                        {week.label}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedWeekIndex(Math.max(selectedWeekIndex - 1, 0))}
                    disabled={selectedWeekIndex <= 0 || availableWeeks.length === 0}
                    className="shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Generate Report Form */}
        {showGenerateForm && availableWeeks.length > 0 && (
          <Card className="border-2 border-primary shadow-lg">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Generate Weekly Report
              </CardTitle>
              <CardDescription>
                Create a report for selected week: {availableWeeks[selectedWeekIndex].label}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Restaurant</label>
                    <select
                      value={selectedRestaurantId}
                      onChange={(e) => setSelectedRestaurantId(e.target.value)}
                      className="w-full h-10 rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={generatingReport || !selectedRestaurantId}
                    className="shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${generatingReport ? 'animate-spin' : ''}`} />
                    {generatingReport ? 'Generating...' : 'Generate Report'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowGenerateForm(false)}
                    className="shadow-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <Card className="lg:col-span-1 shadow-lg border-0">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Past Reports
              </CardTitle>
              <CardDescription>Select a week to view details</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {getFilteredReports().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No reports for this week</p>
                  <p className="text-xs mt-2">Try selecting a different week or generate a new report</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {getFilteredReports().map((report, reportIndex) => (
                    <motion.button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedReport?.id === report.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/50 bg-card hover:bg-muted/30'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: reportIndex * 0.05 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {report.summary_data.restaurant_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(report.week_start_date)} - {formatDate(report.week_end_date)}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Details */}
          <Card className="lg:col-span-2 shadow-lg border-0">
            <CardHeader className="bg-muted/50">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">
                    {selectedReport
                      ? `${selectedReport.summary_data.restaurant_name} Report`
                      : 'Select a Report'}
                  </CardTitle>
                  {selectedReport && (
                    <CardDescription className="text-base mt-1">
                      Week: {formatDate(selectedReport.week_start_date)} -{' '}
                      {formatDate(selectedReport.week_end_date)}
                    </CardDescription>
                  )}
                </div>
                {selectedReport && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => exportReportToPDF(selectedReport)}
                      size="sm"
                      variant="default"
                      className="shadow-sm"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button
                      onClick={() => exportToCSV(selectedReport)}
                      size="sm"
                      variant="outline"
                      className="shadow-sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {!selectedReport ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a report from the list to view details</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-muted/30 p-4 rounded-xl border-2 border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <p className="text-xs font-medium text-foreground">Total Hours</p>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {selectedReport.total_hours.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl border-2 border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-primary" />
                        <p className="text-xs font-medium text-foreground">Workers</p>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {selectedReport.summary_data.total_workers}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-xl border-2 border-primary/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <p className="text-xs font-medium text-foreground">Shifts</p>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {selectedReport.summary_data.total_shifts}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl border-2 border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        <p className="text-xs font-medium text-foreground">Avg Hours</p>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {selectedReport.summary_data.total_workers > 0
                          ? (
                              selectedReport.total_hours / selectedReport.summary_data.total_workers
                            ).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                  </div>

                  {/* Worker Details */}
                  <div>
                    <h3 className="font-bold text-lg mb-4 text-foreground">Worker Breakdown</h3>
                    <div className="space-y-3">
                      {selectedReport.summary_data.worker_stats.map((worker, index) => (
                        <motion.div
                          key={worker.worker_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-2 rounded-xl overflow-hidden bg-white"
                        >
                          <button
                            onClick={() =>
                              setExpandedWorker(
                                expandedWorker === worker.worker_id ? null : worker.worker_id
                              )
                            }
                            className="w-full p-4 flex items-center justify-between hover:bg-purple-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                                {worker.worker_name.split(' ').map((n) => n[0]).join('')}
                              </div>
                              <div className="text-left">
                                <p className="font-semibold">{worker.worker_name}</p>
                                <p className="text-xs text-muted-foreground">{worker.worker_email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-primary">
                                  {worker.total_hours.toFixed(1)} hrs
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {worker.shift_count} shifts
                                </p>
                              </div>
                              {expandedWorker === worker.worker_id ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </button>

                          {expandedWorker === worker.worker_id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t-2 bg-muted/50"
                            >
                              <div className="p-4 space-y-2">
                                <p className="font-semibold text-sm text-foreground mb-3">
                                  Shift Details
                                </p>
                                {worker.shifts.map((shift, shiftIndex) => (
                                  <div
                                    key={shiftIndex}
                                    className="bg-white p-3 rounded-lg border border-primary/30"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium text-sm">
                                          {formatDate(shift.date)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                        </p>
                                        <p className="text-xs text-primary mt-1">
                                          {shift.restaurant_name}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-primary">
                                          {shift.hours.toFixed(1)} hrs
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
