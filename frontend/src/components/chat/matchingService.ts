/**
 * Calls the existing AI service (Groq via the agent server) to detect the
 * appropriate medical specialty from a patient's described symptoms.
 *
 * The agent server at /api/agent/match-specialty reuses the same
 * booking/symptom_matcher.py LLM client already used by the booking agent.
 *
 * This function can be swapped for any other AI provider later without
 * touching ChatWidget.tsx.
 */
export interface SpecialtyMatch {
  specialty: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export async function detectSpecialty(symptoms: string): Promise<SpecialtyMatch> {
  console.log('Symptoms:', symptoms);

  const res = await fetch('/api/agent/match-specialty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms }),
  });

  if (!res.ok) {
    throw new Error(`AI service error: HTTP ${res.status}`);
  }

  const data: SpecialtyMatch = await res.json();
  console.log('AI Response:', data);
  console.log('Selected Specialty:', data.specialty);

  return data;
}
