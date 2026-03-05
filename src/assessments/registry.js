import { exampleLikert } from './definitions/example-likert';
import { moneyEgoStates } from './definitions/money-ego-states';
import { energySelfAssessment } from './definitions/energy-self-assessment';

export const ASSESSMENTS = {
  [exampleLikert.id]: exampleLikert,
  [moneyEgoStates.id]: moneyEgoStates,
  [energySelfAssessment.id]: energySelfAssessment,
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
