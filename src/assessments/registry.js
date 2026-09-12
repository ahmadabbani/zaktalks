import { exampleLikert } from './definitions/example-likert';
import { moneyEgoStates } from './definitions/money-ego-states';
import { energySelfAssessment } from './definitions/energy-self-assessment';
import { archetypeScriptReframingWorksheet } from './definitions/archetype-script-reframing-worksheet';
import { unlockFinancialFrequency } from './definitions/unlock-financial-frequency';
import { relationNeeds } from './definitions/relation-needs';
import { transactionalAnalysisQuestionnaire } from './definitions/transactional-analysis-questionnaire';
import { strokingQuestionnaire } from './definitions/stroking-questionnaire';
import { dramaTriangleAssessment } from './definitions/drama-triangle-assessment';
import { codependencyAssessment } from './definitions/codependency-assessment';
import { driverAssessment } from './definitions/driver-questionnaire';
import { egoStateAnalysis } from './definitions/ego-state-analysis';
import { fairytaleQuestionnaire } from './definitions/fairytale-questionnaire';
import { getAssessmentStatementCount } from '@/lib/assessment-lesson-metadata';

export const ASSESSMENTS = {
  [exampleLikert.id]: exampleLikert,
  [moneyEgoStates.id]: moneyEgoStates,
  [energySelfAssessment.id]: energySelfAssessment,
  [archetypeScriptReframingWorksheet.id]: archetypeScriptReframingWorksheet,
  [unlockFinancialFrequency.id]: unlockFinancialFrequency,
  [relationNeeds.id]: relationNeeds,
  [transactionalAnalysisQuestionnaire.id]: transactionalAnalysisQuestionnaire,
  [strokingQuestionnaire.id]: strokingQuestionnaire,
  [dramaTriangleAssessment.id]: dramaTriangleAssessment,
  [codependencyAssessment.id]: codependencyAssessment,
  [driverAssessment.id]: driverAssessment,
  [egoStateAnalysis.id]: egoStateAnalysis,
  [fairytaleQuestionnaire.id]: fairytaleQuestionnaire,
};

const LEGACY_ASSESSMENT_IDS = {
  'driver-questionnaire-v1': driverAssessment.id,
};

export const getAssessmentList = () => {
  return Object.values(ASSESSMENTS)
    .filter(a => a.externalOnly !== true)
    .map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      questionCount: getAssessmentStatementCount(a)
    }));
};

export const getExternalAssessmentPresentation = (assessment) => {
  if (!assessment) return null;
  return assessment.externalPresentation
    ? { ...assessment, ...assessment.externalPresentation }
    : assessment;
};

export const getExternalAssessmentTitle = (assessment) => {
  return getExternalAssessmentPresentation(assessment)?.title || '';
};

export const getAssessmentById = (id) => {
  return ASSESSMENTS[id] || ASSESSMENTS[LEGACY_ASSESSMENT_IDS[id]] || null;
};
