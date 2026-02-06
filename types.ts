
export enum RiskLevel {
  LOW = 'Low',
  MODERATE = 'Moderate',
  HIGH = 'High',
  CRITICAL = 'Critical',
  UNKNOWN = 'Unknown'
}

export enum TimeSensitivity {
  NON_URGENT = 'Non-Urgent',
  MONITOR_CLOSELY = 'Monitor Closely',
  TIME_CRITICAL = 'Time-Critical',
  IMMEDIATE_VERIFICATION = 'Immediate Verification Recommended'
}

export enum ConfidenceLevel {
  LOW = 'Low',
  MODERATE = 'Moderate',
  HIGH = 'High'
}

export interface ScoreBreakdown {
  opticalSeverity: number;
  visibleArea: number;
  ecosystemSensitivity: number;
  humanProximity: number;
}

export interface ActionIntelligence {
  recommendedAction: 'Monitor' | 'Escalate' | 'Contain';
  notificationTargets: string[];
  followUpEvidence: string[];
  labValidationAdvisory: string;
  remediationStrategy: string[];
}

export interface AnalysisReport {
  detectedOptics: string[];
  nonDetectableOptics: string[];
  aquaImpactScore: number;
  comparativeIntelligence: string;
  timeSensitivity: TimeSensitivity;
  plainLanguageSummary: string;
  scoreBreakdown: ScoreBreakdown;
  scoreExplanation: string;
  likelyPollutionCategory: string;
  environmentalImpactExplanation: string;
  humanHealthImplications: string;
  environmentalRiskLevel: RiskLevel;
  riskJustification: string;
  actionIntelligence: ActionIntelligence;
  confidencePercentage: number;
  confidenceLevel: ConfidenceLevel;
  confidenceFactors: string[];
  assessmentLimitations: string[];
  systemAdvisory: string;
  sourceMode?: 'Live' | 'Demo';
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  data: AnalysisReport | null;
  resources: string | null;
  sources: GroundingSource[];
  error: string | null;
  mode: 'Live' | 'Demo';
}
