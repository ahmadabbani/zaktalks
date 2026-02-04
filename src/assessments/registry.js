import { exampleLikert } from './definitions/example-likert';

export const ASSESSMENTS = {
  [exampleLikert.id]: exampleLikert,
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
