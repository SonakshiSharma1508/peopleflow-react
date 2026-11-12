export function csvValue(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function directoryCSV(employees) {
  const rows = [
    [
      'Employee ID',
      'Name',
      'Job title',
      'Department',
      'Work email',
      'Manager',
      'Location',
      'Status',
      'Milestone',
    ],
    ...employees.map((person) => [
      person.id,
      person.name,
      person.title,
      person.department,
      person.email,
      person.manager,
      person.location,
      person.journey,
      person.date,
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(csvValue).join(',')).join('\r\n');
}
