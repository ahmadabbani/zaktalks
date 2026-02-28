import { exampleLikert } from './definitions/example-likert';
import { moneyEgoStates } from './definitions/money-ego-states';

export const ASSESSMENTS = {
  [exampleLikert.id]: exampleLikert,
  [moneyEgoStates.id]: moneyEgoStates,
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
