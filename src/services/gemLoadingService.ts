import type { SubjectGem, GemCategory } from '../types/gameTypes';
import TOPICS from '../constants/unicamp_topics.json' assert { type: 'json' };

function slugify(s: string) {
  return s
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function makeGemId(category: GemCategory, subject: string | undefined, topic: string) {
  const cat = category.toLowerCase();
  const sub = subject ? slugify(subject) : 'core';
  const top = slugify(topic);
  return `${cat}_${sub}_${top}`;
}

export async function loadGemsFromFile(): Promise<SubjectGem[]> {
  const nowISO = new Date().toISOString();
  const gems: SubjectGem[] = [];

  const pushTopic = (category: GemCategory, subject: string | undefined, arr: string[], weightTag: 'high' | 'medium') => {
    for (const topic of arr) {
      const id = makeGemId(category, subject, topic);
      const gem: SubjectGem = {
        id,
        name: topic,
        level: 1,
        xp: 0,
        category,
        createdAt: nowISO,
        tier: weightTag === 'high' ? 2 : 1,
        weight: weightTag === 'high' ? 2 : 1,
        cycles: 1,
        tags: [subject ?? category, weightTag]
      };
      gems.push(gem);
    }
  };

  // Math
  const math = (TOPICS as any).Math;
  pushTopic('Math', undefined, math.high, 'high');
  pushTopic('Math', undefined, math.medium, 'medium');

  // Science
  const sci = (TOPICS as any).Science;
  pushTopic('Science', 'Physics', sci.Physics.high, 'high');
  pushTopic('Science', 'Physics', sci.Physics.medium, 'medium');
  pushTopic('Science', 'Chemistry', sci.Chemistry.high, 'high');
  pushTopic('Science', 'Chemistry', sci.Chemistry.medium, 'medium');
  pushTopic('Science', 'Biology', sci.Biology.high, 'high');
  pushTopic('Science', 'Biology', sci.Biology.medium, 'medium');

  // Humanities
  const hum = (TOPICS as any).Humanities;
  pushTopic('Humanities', 'History', hum.History.high, 'high');
  pushTopic('Humanities', 'History', hum.History.medium, 'medium');
  pushTopic('Humanities', 'Geography', hum.Geography.high, 'high');
  pushTopic('Humanities', 'Geography', hum.Geography.medium, 'medium');
  pushTopic('Humanities', 'Philosophy', hum.Philosophy.high, 'high');
  pushTopic('Humanities', 'Sociology', hum.Sociology.high, 'high');

  // Language
  const lang = (TOPICS as any).Language;
  pushTopic('Language', 'Portuguese', lang.Portuguese.high, 'high');
  pushTopic('Language', 'Portuguese', lang.Portuguese.medium, 'medium');
  pushTopic('Language', 'English', lang.English.high, 'high');
  pushTopic('Language', 'Literature', lang.Literature.high, 'high');
  pushTopic('Language', 'Literature', lang.Literature.medium, 'medium');

  return gems;
}

export function shouldLoadGems(currentGems: SubjectGem[]): boolean {
  const expectedCount =
    (TOPICS as any).Math.high.length + (TOPICS as any).Math.medium.length +
    (TOPICS as any).Science.Physics.high.length + (TOPICS as any).Science.Physics.medium.length +
    (TOPICS as any).Science.Chemistry.high.length + (TOPICS as any).Science.Chemistry.medium.length +
    (TOPICS as any).Science.Biology.high.length + (TOPICS as any).Science.Biology.medium.length +
    (TOPICS as any).Humanities.History.high.length + (TOPICS as any).Humanities.History.medium.length +
    (TOPICS as any).Humanities.Geography.high.length + (TOPICS as any).Humanities.Geography.medium.length +
    (TOPICS as any).Humanities.Philosophy.high.length + (TOPICS as any).Humanities.Sociology.high.length +
    (TOPICS as any).Language.Portuguese.high.length + (TOPICS as any).Language.Portuguese.medium.length +
    (TOPICS as any).Language.English.high.length +
    (TOPICS as any).Language.Literature.high.length + (TOPICS as any).Language.Literature.medium.length;

  if (currentGems.length !== expectedCount) return true;
  // Reload if any gem name contains the Unicode replacement character (sign of encoding corruption)
  return currentGems.some(g => /\uFFFD/.test(g.name));
}

