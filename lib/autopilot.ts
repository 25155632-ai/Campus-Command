import { downstream, riskFromImpact, type Edge } from './engine';

export type OpsNode = { id:string; type:string; label:string; status?:string; priority?:string };

export function buildOpsPlan(nodes: OpsNode[], edges: Edge[], triggerId: string, seedIds: string[] = []) {
  const seeds = seedIds.length ? seedIds : [triggerId];
  const impacted = [...new Set(seeds.flatMap(seed => downstream(seed, edges).concat(seed)).filter(id => id !== triggerId))];
  const impactedNodes = nodes.filter(n => impacted.includes(n.id));
  const blocked = impactedNodes.filter(n => n.status === 'blocked').length;
  const risk = riskFromImpact(impactedNodes.length, blocked > 0 ? 1 : 0, blocked);
  const actions = impactedNodes.map((n, i) => ({
    order: i + 1,
    target: n.label,
    targetType: n.type,
    action: n.status === 'blocked' ? 'Escalate and assign backup owner' : n.type === 'resource' ? 'Reconfirm allocation' : 'Review downstream readiness',
    reason: `Impacted by ${triggerId}`,
    approvalRequired: n.type === 'event' || n.type === 'resource'
  }));
  return { risk, impactedCount: impactedNodes.length, blockedCount: blocked, actions };
}
