/** A dossier is a research plan and modern production hypothesis, not verified object evidence. */
export interface StudySample {
  role: 'primary' | 'comparison';
  title: string;
  period: string;
  medium: string;
  sourceId: string;
  focus: string;
}

export interface StudyStatement {
  claim: string;
  sourceIds: string[];
  status: 'reference' | 'verified';
}

export interface StructuralObservation {
  location: string;
  observation: string;
  significance: string;
  verify: string;
}

export interface ProductionLock {
  parameter: string;
  rule: string;
  rationale: string;
}

export interface SingleVariableExperiment {
  id: string;
  variable: string;
  fixed: string[];
  a: string;
  b: string;
  acceptance: string;
}

export interface AIFailure {
  symptom: string;
  cause: string;
  correction: string;
}

export interface ResearchDossier {
  id: string;
  traditionId: string;
  title: string;
  question: string;
  samples: StudySample[];
  evidence: {
    historicalFacts: StudyStatement[];
    interpretations: StudyStatement[];
    translations: StudyStatement[];
  };
  observations: StructuralObservation[];
  /** Every lock is a modern project recommendation; none is a historical measurement. */
  productionLocks: ProductionLock[];
  experiments: SingleVariableExperiment[];
  aiFailures: AIFailure[];
  reviewChecks: string[];
  limits: string[];
}
