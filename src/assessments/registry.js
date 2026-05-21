import { exampleLikert } from './definitions/example-likert';
import { moneyEgoStates } from './definitions/money-ego-states';
import { energySelfAssessment } from './definitions/energy-self-assessment';
import { archetypeScriptReframingWorksheet } from './definitions/archetype-script-reframing-worksheet';
import { unlockFinancialFrequency } from './definitions/unlock-financial-frequency';
import { relationNeeds } from './definitions/relation-needs';
import { transactionalAnalysisQuestionnaire } from './definitions/transactional-analysis-questionnaire';
import { strokingQuestionnaire } from './definitions/stroking-questionnaire';
import { dramaTriangleAssessment } from './definitions/drama-triangle-assessment';

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
};

export const getAssessmentList = () => {
  return Object.values(ASSESSMENTS).map(a => ({
    id: a.id,
    title: a.title,
    description: a.description
  }));
};

export const getAssessmentById = (id) => {
  return ASSESSMENTS[id] || null;
};
