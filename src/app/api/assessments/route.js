import { NextResponse } from 'next/server';
import { getAssessmentList } from '@/assessments/registry';

export async function GET() {
  try {
    const assessments = getAssessmentList();
    return NextResponse.json(assessments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}
