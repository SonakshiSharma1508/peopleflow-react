import { addDays, createOffboardingTasks, createOnboardingTasks, todayISO } from './domain.js';

export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'People Operations',
  'Sales',
  'Customer Success',
  'Finance',
];

/** Every person and record in this dataset is fictional. Dates move with the demo. */
export function createSeed(today = todayISO()) {
  addDays(today, 0); // Validate caller-supplied dates with the same rules as the application.
  const at = (offset = 0, hour = '09') => `${addDays(today, offset)}T${hour}:15:00.000Z`;
  const rows = [
    [
      'EMP-1042',
      'Aisha Sharma',
      'Frontend Engineer',
      'Engineering',
      'Bengaluru',
      'Nikhil Rao',
      4,
      'onboarding',
      3,
    ],
    [
      'EMP-1043',
      'Daniel Kim',
      'Product Designer',
      'Design',
      'Remote',
      'Elena Brooks',
      1,
      'onboarding',
      2,
    ],
    [
      'EMP-1044',
      'Priya Nair',
      'Customer Success Specialist',
      'Customer Success',
      'Mumbai',
      'Sofia Patel',
      -3,
      'onboarding',
      3,
    ],
    [
      'EMP-1045',
      'Omar Hassan',
      'Product Analyst',
      'Product',
      'Hyderabad',
      'Maya Chen',
      7,
      'onboarding',
      0,
    ],
    [
      'EMP-1046',
      'Zoe Williams',
      'Account Executive',
      'Sales',
      'Remote',
      'Arjun Mehta',
      -1,
      'onboarding',
      5,
    ],
    [
      'EMP-1047',
      'Leo Fernandes',
      'People Operations Associate',
      'People Operations',
      'Pune',
      'Sana Ali',
      2,
      'onboarding',
      1,
    ],
    [
      'EMP-1021',
      'Maya Chen',
      'Senior Product Manager',
      'Product',
      'Bengaluru',
      'Sana Ali',
      1,
      'offboarding',
      2,
    ],
    [
      'EMP-1028',
      'Rohan Desai',
      'Backend Engineer',
      'Engineering',
      'Hyderabad',
      'Nikhil Rao',
      -1,
      'offboarding',
      1,
    ],
    [
      'EMP-1001',
      'Nikhil Rao',
      'Engineering Manager',
      'Engineering',
      'Bengaluru',
      'Sana Ali',
      -180,
      'active',
      7,
    ],
    ['EMP-1005', 'Elena Brooks', 'Design Lead', 'Design', 'Remote', 'Sana Ali', -150, 'active', 7],
    [
      'EMP-1008',
      'Sofia Patel',
      'Customer Success Lead',
      'Customer Success',
      'Mumbai',
      'Sana Ali',
      -120,
      'active',
      7,
    ],
    ['EMP-1013', 'Arjun Mehta', 'Sales Manager', 'Sales', 'Pune', 'Sana Ali', -90, 'active', 7],
    [
      'EMP-1016',
      'Sana Ali',
      'People Operations Lead',
      'People Operations',
      'Bengaluru',
      'Executive team',
      -240,
      'active',
      7,
    ],
    [
      'EMP-1041',
      'Noah Wilson',
      'Finance Analyst',
      'Finance',
      'Mumbai',
      'Sana Ali',
      -4,
      'onboarding',
      7,
    ],
  ];
  const employees = rows.map(
    ([id, name, title, department, location, manager, offset, journey, completed]) => {
      const date = addDays(today, offset);
      const tasks =
        journey === 'offboarding'
          ? createOffboardingTasks(id, date)
          : createOnboardingTasks(id, date);
      tasks.forEach((task, index) => {
        if (index < completed) {
          task.completed = true;
          task.completedAt = at(-2);
        }
      });
      // Employees approaching their start date may already have an allocated laptop.
      const assets =
        journey === 'onboarding' && completed < 3
          ? []
          : [
              {
                id: `${id}-laptop`,
                name: 'MacBook Air 13-inch',
                serial: `PF-MBA-${id.slice(-4)}`,
                returned: false,
              },
              {
                id: `${id}-badge`,
                name: 'Office access card',
                serial: `PF-ID-${id.slice(-4)}`,
                returned: false,
              },
            ];
      if (id === 'EMP-1021') assets[1].returned = true;
      const notes =
        id === 'EMP-1044'
          ? [
              {
                id: 'note-seed-1',
                text: 'Work accounts are ready. Please confirm equipment delivery before the team orientation.',
                actor: 'HR',
                at: at(-1),
              },
            ]
          : id === 'EMP-1021'
            ? [
                {
                  id: 'note-seed-2',
                  text: 'Knowledge handover is approved. IT is coordinating the laptop return before the final day.',
                  actor: 'Manager',
                  at: at(-1),
                },
              ]
            : id === 'EMP-1042'
              ? [
                  {
                    id: 'note-seed-3',
                    text: 'Joining from the Bengaluru office. Welcome session is scheduled for 10:00 on the first day.',
                    actor: 'HR',
                    at: at(-1),
                  },
                ]
              : [];
      return {
        id,
        name,
        title,
        department,
        location,
        manager,
        date,
        journey,
        email: `${name
          .toLowerCase()
          .replace(/[^a-z ]/g, '')
          .replace(/\s+/g, '.')}@example.com`,
        tasks,
        assets,
        notes,
      };
    },
  );
  const activity = [
    ['EMP-1041', 'Completed “Agree on the first 30-day plan”', 'Manager', 0, '10'],
    ['EMP-1042', 'Completed “Provision work accounts”', 'IT', 0, '09'],
    ['EMP-1044', 'Added a coordination note', 'HR', -1, '16'],
    ['EMP-1021', 'Recorded return of Office access card (PF-ID-1021)', 'IT', -1, '14'],
    ['EMP-1047', 'Completed “Verify employment documents”', 'HR', -1, '11'],
    ['EMP-1045', 'Created an employee profile and onboarding checklist', 'HR', -2, '10'],
    ['EMP-1028', 'Started offboarding and created the exit checklist', 'HR', -3, '09'],
  ].map(([employeeId, message, actor, offset, hour], index) => ({
    id: `event-seed-${index + 1}`,
    employeeId,
    employeeName: employees.find((employee) => employee.id === employeeId).name,
    message,
    actor,
    at: at(offset, hour),
  }));
  return { schemaVersion: 1, employees, activity, role: 'HR' };
}
