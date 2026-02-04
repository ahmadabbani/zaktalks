// Example Assessment Component
// This is a template for creating assessment lessons

export default function ExampleAssessment({ userId, lessonId, onComplete }) {
  // Component receives:
  // - userId: current user's ID
  // - lessonId: current lesson's ID
  // - onComplete: callback function to call when assessment is completed
  //   Usage: onComplete(score) where score is 0-100

  const handleSubmit = (score) => {
    // Call this when user completes the assessment
    onComplete(score);
  };

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Example Assessment</h2>
      <p>Build your assessment UI here with questions, answers, and scoring logic.</p>
      
      {/* Your assessment content goes here */}
      
      <button 
        className="btn btn-primary" 
        onClick={() => handleSubmit(100)}
        style={{ marginTop: 'var(--space-lg)' }}
      >
        Submit Assessment
      </button>
    </div>
  );
}
