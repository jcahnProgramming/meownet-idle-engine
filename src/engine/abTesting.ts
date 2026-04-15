// ─────────────────────────────────────────────
//  MeowNet Idle Engine — A/B Testing
//
//  Variant assignment is deterministic per user:
//  same user always gets same variant.
//  Variants are defined in remote config, so
//  you can create experiments without app updates.
//
//  Usage in gameConfig remote_config:
//  {
//    "experiments": {
//      "prestige_threshold": {
//        "variants": ["control", "lower_threshold"],
//        "weights": [50, 50]
//      }
//    }
//  }
//
//  Usage in code:
//    const variant = getVariant('prestige_threshold');
//    if (variant === 'lower_threshold') { ... }
// ─────────────────────────────────────────────

export interface Experiment {
  variants: string[];
  weights: number[]; // must sum to 100
}

let _experiments: Record<string, Experiment> = {};
let _userId = 'anonymous';
let _assignments: Record<string, string> = {};

export function initABTesting(
  experiments: Record<string, Experiment>,
  userId: string
) {
  _experiments = experiments;
  _userId = userId;
  _assignments = {};
}

// Deterministic hash: same user + experiment always = same variant
function hashUserExperiment(userId: string, experimentId: string): number {
  const str = `${userId}:${experimentId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100;
}

export function getVariant(experimentId: string): string {
  if (_assignments[experimentId]) return _assignments[experimentId];

  const experiment = _experiments[experimentId];
  if (!experiment) return 'control';

  const hash = hashUserExperiment(_userId, experimentId);
  let cumulative = 0;
  for (let i = 0; i < experiment.variants.length; i++) {
    cumulative += experiment.weights[i] ?? 0;
    if (hash < cumulative) {
      _assignments[experimentId] = experiment.variants[i];
      return experiment.variants[i];
    }
  }

  _assignments[experimentId] = experiment.variants[0];
  return experiment.variants[0];
}

export function getAllVariants(): Record<string, string> {
  for (const id of Object.keys(_experiments)) {
    getVariant(id); // ensure all are assigned
  }
  return { ..._assignments };
}

export function isInVariant(experimentId: string, variant: string): boolean {
  return getVariant(experimentId) === variant;
}
