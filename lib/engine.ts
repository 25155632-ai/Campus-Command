export type Edge = { source_id: string; target_id: string; relation: string; source_type?: string; target_type?: string };

export function downstream(startId: string, edges: Edge[]) {
  const seen = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const edge of edges) {
      if (edge.source_id === id && !seen.has(edge.target_id)) {
        seen.add(edge.target_id);
        queue.push(edge.target_id);
      }
    }
  }
  seen.delete(startId);
  return [...seen];
}

export function shortestImpactPath(startId: string, targetId: string, edges: Edge[]) {
  const queue: string[][] = [[startId]];
  const seen = new Set([startId]);
  while (queue.length) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (current === targetId) return path;
    for (const edge of edges.filter((e) => e.source_id === current)) {
      if (!seen.has(edge.target_id)) {
        seen.add(edge.target_id);
        queue.push([...path, edge.target_id]);
      }
    }
  }
  return [];
}

export function riskFromImpact(count: number, conflicts: number, overdue = 0) {
  const pressure = count + conflicts * 3 + overdue * 2;
  if (pressure >= 12 || conflicts >= 3) return 'critical';
  if (pressure >= 7 || conflicts >= 2) return 'high';
  if (pressure >= 3 || conflicts >= 1) return 'medium';
  return 'low';
}

export function detectConflicts(events: Array<{id:string;name:string;start_at:string;end_at?:string|null;venue:string}>) {
  const conflicts: Array<{kind:string;left:string;right:string;detail:string}> = [];
  for (let i = 0; i < events.length; i++) for (let j = i + 1; j < events.length; j++) {
    const a = events[i], b = events[j];
    const aStart = new Date(a.start_at).getTime(), bStart = new Date(b.start_at).getTime();
    const aEnd = new Date(a.end_at || aStart + 2 * 60 * 60 * 1000).getTime();
    const bEnd = new Date(b.end_at || bStart + 2 * 60 * 60 * 1000).getTime();
    if (a.venue && a.venue === b.venue && aStart < bEnd && bStart < aEnd) {
      conflicts.push({kind:'venue',left:a.name,right:b.name,detail:`${a.venue} is double-booked`});
    }
    if (Math.abs(aStart - bStart) < 30 * 60 * 1000 && a.id !== b.id) {
      conflicts.push({kind:'schedule',left:a.name,right:b.name,detail:'Start windows are less than 30 minutes apart'});
    }
  }
  return conflicts;
}

export function extractAnnouncement(text: string) {
  const source = text.trim();
  const lower = source.toLowerCase();

  const dateMatch = source.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2})\b/) || source.match(/\b(\d{1,2}[/-]\d{1,2}[/-]20\d{2})\b/);
  const timePattern = String.raw`(?:([01]?\d|2[0-3]):([0-5]\d)\s*(AM|PM)?|((?:1[0-2]|0?[1-9])\s*(?:AM|PM)))`;

  function normalizeTime(match: RegExpMatchArray | null) {
    if (!match) return null;
    if (match[1] !== undefined) {
      let h = Number(match[1]); const m = match[2]; const ap = match[3]?.toUpperCase();
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    }
    const raw = (match[4] || '').replace(/\s+/g, ' ');
    const parts = raw.split(/\s+/); let h = Number(parts[0]); const ap = parts[1]?.toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:00`;
  }

  const eventTime = source.match(new RegExp(String.raw`(?:event\s+(?:time|starts?)|(?:the\s+)?event\s+(?:will\s+)?(?:start|begin)|(?:starts?|begins?|opens?)\s+(?:at|on)?)\s*${timePattern}\b`, 'i'))
    || source.match(new RegExp(String.raw`\b(?:starts?|begins?)\s+${timePattern}\b`, 'i'));
  const volunteerDeployment = source.match(new RegExp(String.raw`volunteers?[^.\n]{0,120}?(?:report|deploy|arriv\w*|check\s*-?in|before|by|at)\s*(?:at|by)?\s*${timePattern}\b`, 'i'));
  const speakerArrival = source.match(new RegExp(String.raw`speakers?[^.\n]{0,120}?(?:arriv\w*|report|check\s*-?in|begin|start)[^.\n]{0,50}?\s*(?:at)?\s*${timePattern}\b`, 'i'));

  const venueMatch =
    source.match(/(?:venue|location|hall|auditorium|room)\s*(?:is|:|-)?\s*([A-Z][A-Za-z0-9&'().\- ]{2,60}?)(?=[.!?,;\n]|$)/i)
    || source.match(/\b(?:at|held at|taking place at|hosted at)\s+([A-Z][A-Za-z0-9&'().\- ]{2,60}?)(?=[.!?,;\n]|$)/i);

  const deadlineMatch = source.match(/(?:registration\s+(?:closes|ends)|registration\s+deadline|deadline|register(?:ation)?\s+by|closes)\s*(?:on|by|is)?\s*[:\-]?\s*(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]20\d{2})/i);

  const type = lower.includes('hackathon') ? 'Hackathon'
    : lower.includes('conference') ? 'Conference'
    : lower.includes('workshop') ? 'Workshop'
    : lower.includes('research') ? 'Research'
    : 'Campus Event';

  const actions: string[] = [];
  if (/register|registration/i.test(source)) actions.push('Complete registration');
  if (/bring\b/i.test(source)) actions.push('Prepare required materials');
  if (/volunteer/i.test(source)) actions.push('Confirm volunteer assignment');
  if (/speaker/i.test(source)) actions.push('Confirm speaker logistics');

  return {
    title: source.split(/[.!?\n]/)[0].slice(0, 90) || 'Untitled announcement',
    type,
    date: dateMatch?.[1] || null,
    time: normalizeTime(eventTime),
    venue: venueMatch?.[1]?.trim() || null,
    deadline: deadlineMatch?.[1] || null,
    volunteerDeploymentTime: normalizeTime(volunteerDeployment),
    speakerArrivalTime: normalizeTime(speakerArrival),
    actions: actions.length ? actions : ['Review announcement and assign an owner'],
  };
}
