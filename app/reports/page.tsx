'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, Users, Clock, Building2, ChevronDown, ChevronUp } from 'lucide-react';

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

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (role !== 'super_admin' && role !== 'worker') {
        router.push('/dashboard');
      } else {
        loadReports();
      }
    }
  }, [user, role, authLoading]);

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
              Weekly Reports
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              View worker hours and shift history
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin')}
              className="shadow-sm text-sm sm:text-base"
            >
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={signOut} className="shadow-sm text-sm sm:text-base">
              Sign Out
            </Button>
          </div>
        </div>

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
              {reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No reports generated yet</p>
                  <p className="text-xs mt-2">Reports are generated every Saturday night</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {reports.map((report, index) => (
                    <motion.button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedReport?.id === report.id
                          ? 'border-primary bg-muted/50 shadow-md'
                          : 'border-gray-200 hover:border-primary/50 bg-white'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {report.summary_data.restaurant_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(report.week_start_date)} - {formatDate(report.week_end_date)}
                          </p>
                          <p className="text-xs text-purple-600 font-medium mt-1">
                            {report.total_hours.toFixed(1)} hours
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
                  <Button
                    onClick={() => exportToCSV(selectedReport)}
                    size="sm"
                    variant="outline"
                    className="shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
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
  );
}
