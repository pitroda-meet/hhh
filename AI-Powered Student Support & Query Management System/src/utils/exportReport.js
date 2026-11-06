export function downloadReport(report) {
  const rows = [
    ['SAHAY — INSTITUTE SUPPORT REPORT'],
    ['Generated at', new Date(report.now).toISOString()],
    ['Metric', 'Value'],
    ...Object.entries(report.summary),
    [], ['Department', 'Total', 'Resolved', 'Pending', 'Average first response (hours)'],
    ...report.departments.map((d) => [d.name, d.total, d.resolved, d.pending, d.average_response]),
    [], ['Staff', 'Assigned', 'Resolved', 'Pending', 'Average first response (hours)', 'Satisfaction'],
    ...report.staff_performance.map((s) => [s.name, s.assigned, s.resolved, s.pending, s.average_response, s.satisfaction]),
    [], ['Date', 'Created', 'Resolved'],
    ...report.trend.map((d) => [d.date.slice(0, 10), d.created, d.resolved]),
  ];
  const escape = (value) => {
    const text = String(value ?? '');
    return `"${(/^[=+@-]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sahay-support-report-${new Date(report.now).toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
