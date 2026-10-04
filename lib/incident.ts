export type IncidentType = 'venue' | 'resource' | 'team' | 'volunteer' | 'task_delay' | 'network';

export const INCIDENTS: Record<IncidentType, {
  label: string;
  short: string;
  target: 'venue' | 'resource' | 'team' | 'task';
  description: string;
  recovery: string;
}> = {
  venue: { label: 'Venue unavailable', short: 'VENUE', target: 'venue', description: 'Relocate an event and recalculate everything downstream.', recovery: 'Move the event to a viable venue.' },
  resource: { label: 'Equipment / resource failure', short: 'RESOURCE', target: 'resource', description: 'Take a resource offline and trace operational consequences.', recovery: 'Reallocate, replace or escalate the resource.' },
  team: { label: 'Team unavailable', short: 'TEAM', target: 'team', description: 'Remove a team from coverage and expose dependent work.', recovery: 'Reassign ownership and protect critical work.' },
  volunteer: { label: 'Volunteer shortage', short: 'VOLUNTEER', target: 'team', description: 'Reduce volunteer capacity and calculate dispatch pressure.', recovery: 'Redistribute volunteer coverage and escalate gaps.' },
  task_delay: { label: 'Session / task delay', short: 'DELAY', target: 'task', description: 'Delay an operational task and trace dependent actions.', recovery: 'Re-sequence dependent work and notify owners.' },
  network: { label: 'Network outage', short: 'NETWORK', target: 'resource', description: 'Take event connectivity offline and trace technical impact.', recovery: 'Activate backup connectivity and technical response.' },
};

export const incidentList = Object.entries(INCIDENTS).map(([value, meta]) => ({ value: value as IncidentType, ...meta }));
