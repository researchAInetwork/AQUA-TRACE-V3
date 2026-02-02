export enum RiskLevel {
  LOW = 'Low',
  MODERATE = 'Moderate',
  HIGH = 'High',
  CRITICAL = 'Critical',
  UNKNOWN = 'Unknown'
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
}

export interface AnalysisReport {
  detectedOptics: string[];
  nonDetectableOptics: string[];
  aquaImpactScore: number;
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
  assessmentLimitations: string[];
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
}
