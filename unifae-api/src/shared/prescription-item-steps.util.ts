export type PrescriptionStepRow = {
  order: number;
  text: string;
};

export function parseInstructionsToSteps(text: string | null | undefined): PrescriptionStepRow[] {
  if (!text?.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const numbered = line.match(/^\d+[\).\-\s]+(.+)$/);
      return {
        order: index + 1,
        text: (numbered?.[1] ?? line).trim(),
      };
    });
}

export function stepsToInstructionsText(steps: PrescriptionStepRow[]): string | null {
  if (!steps.length) return null;
  return steps.map((step) => `${step.order}. ${step.text}`).join('\n');
}

export function normalizeStepDescriptions(
  steps: Array<{ description: string }> | undefined,
  instructions: string | null | undefined,
): PrescriptionStepRow[] {
  if (steps?.length) {
    const seen = new Set<string>();
    const out: PrescriptionStepRow[] = [];
    for (const step of steps) {
      const text = step.description.trim().replace(/\s+/g, ' ');
      const key = text.toLowerCase();
      if (!text || seen.has(key)) continue;
      seen.add(key);
      out.push({ order: out.length + 1, text });
    }
    return out;
  }
  return parseInstructionsToSteps(instructions);
}
