// Node ESM script to parse data/edital.math.txt into data/gems.jsonl
// Heuristic parser: extracts the MATEMATICA section and derives 30–60 topics.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INPUT = path.join(ROOT, 'data', 'edital.math.txt');
const OUTPUT = path.join(ROOT, 'data', 'gems.jsonl');

function toAscii(input) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks
    .replace(/[^\x20-\x7E]/g, ' ') // replace non-ASCII
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
}

function slugify(s) {
  return toAscii(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'topic';
}

function extractMathSection(text) {
  const upper = text.toUpperCase();
  const startIdx = upper.indexOf('MATEMA');
  if (startIdx < 0) return text; // fallback
  const endIdx = upper.indexOf('GEOGRAFIA', startIdx + 6);
  return text.slice(startIdx, endIdx > startIdx ? endIdx : undefined);
}

function cleanLine(line) {
  let s = line.replace(/\t/g, ' ').trim();
  // remove common bullet artifacts
  s = s.replace(/^[\-•·]+\s*/, '');
  s = s.replace(/^(\d+\.)\s*/, '');
  s = s.replace(/^(\d+\s*[\)\-:])\s*/, '');
  s = s.replace(/^(\d+[^A-Za-z0-9]+){0,2}\s*['`"»«›‹\-\^]+\s*/, ''); // corrupted bullets
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

function pickTier(nameAscii, sectionIndex) {
  const s = nameAscii.toLowerCase();
  if (/conjunto|porcent|porcentagem|juros|pa\b|pg\b|progres|sequenc/.test(s)) return 1;
  if (/linear|afim|quadratic|grafic|matriz|sistema|contagem|probab|combina|arranjo|permut|trigonom|geometria/.test(s)) return 2;
  if (/logarit|exponen|conica|espacial|polinom|fator|raiz|determinant|inversa/.test(s)) return 3;
  if (sectionIndex <= 3) return 1;
  if (sectionIndex <= 7) return 2;
  return 3;
}

function inferTags(nameAscii) {
  const s = nameAscii.toLowerCase();
  const tags = new Set();
  if (/graf|graph|tabela|tabela|plot/.test(s)) tags.add('graph');
  if (/algebra|equacao|equac|polinom|fun/.test(s)) tags.add('algebra');
  if (/probab|estat|dados/.test(s)) tags.add('data');
  if (/geometr|trigonom|triangulo|circulo|poligono|c\bonica/.test(s)) tags.add('geometry');
  if (/logarit|exponen/.test(s)) tags.add('analysis');
  return Array.from(tags);
}

async function main() {
  const raw = await fs.readFile(INPUT, 'utf8');
  const math = extractMathSection(raw);
  const lines = math.split(/\r?\n/).map(cleanLine).filter(Boolean);

  // collect top-level numbered topics and descriptive bullets
  const topics = [];
  const seen = new Set();
  let currentSection = 0;
  let inEnumerated = false;
  for (const line of lines) {
    const ascii = toAscii(line);
    if (/^\d+\./.test(line)) {
      currentSection += 1;
      inEnumerated = true; // start collecting only after first numbered section
    }
    if (!inEnumerated) continue;
    const looksTopic = /^(\d+\.|\- |•|·)/.test(line) || /fun|geom|probab|logar|expon|matriz|sistema|contagem|polin|sequenc|porcent|grafic|conjunto/i.test(line);
    if (!looksTopic) continue;
    const name = ascii
      .replace(/^(\d+\.)\s*/, '')
      .replace(/^[-•·]\s*/, '')
      .trim();
    if (!name || name.length < 5) continue;
    if (name.split(' ').length > 28) continue; // skip full-paragraph lines
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push({ name, section: currentSection });
  }

  // fallback curated topics if parsed too few
  const curated = [
    'Conjuntos Numéricos', 'Porcentagem e Juros', 'Sequências, PA e PG', 'Razões e Proporções',
    'Números Primos e Fatoração', 'MMC e MDC',
    'Função Afim (Linear)', 'Função Quadrática', 'Funções Modulares', 'Funções Racionais',
    'Funções Inversas', 'Gráficos e Transformações', 'Equações e Inequações',
    'Polinômios: Operações', 'Raízes de Equações', 'Fatoração e Teorema Fundamental',
    'Contagem: Princípios Básicos', 'Permutações, Arranjos e Combinações', 'Probabilidade: Conceitos',
    'Probabilidade Condicional', 'Probabilidade: União e Interseção',
    'Sistemas Lineares: Resolução', 'Sistemas: Interpretação Geométrica', 'Matrizes e Operações',
    'Determinantes e Inversa', 'Geometria Plana: Congruência e Semelhança', 'Geometria Plana: Áreas',
    'Ângulos e Paralelas (Tales)', 'Teorema de Pitágoras', 'Trigonometria Básica', 'Trigonometria: Identidades',
    'Trigonometria: Equações', 'Cônicas: Circunferência e Parábola',
    'Geometria Espacial: Prismas e Pirâmides', 'Geometria Espacial: Volumes',
    'Estatística Descritiva', 'Medidas de Tendência (Média/Mediana/Moda)', 'Medidas de Dispersão',
    'Análise de Dados e Gráficos', 'Função Exponencial', 'Função Logarítmica', 'Equações Exp. e Log.'
  ];
  if (topics.length < 30) {
    for (const name of curated) {
      const key = toAscii(name).toLowerCase();
      if (!seen.has(key)) {
        topics.push({ name: toAscii(name), section: 0 });
        seen.add(key);
      }
      if (topics.length >= 40) break; // ensure minimum breadth
    }
  }

  // Ensure minimum count by synthesizing variants if still short
  if (topics.length < 30) {
    let i = 1;
    while (topics.length < 30 && i < 50) {
      const base = topics[topics.length - 1] || { name: 'Topico', section: 0 };
      const synth = `${base.name} II`;
      const key = toAscii(synth).toLowerCase();
      if (!seen.has(key)) {
        topics.push({ name: synth, section: base.section });
        seen.add(key);
      }
      i++;
    }
  }

  // Cap between 30 and 60
  const finalTopics = topics.slice(0, Math.max(30, Math.min(60, topics.length)));

  const linesOut = finalTopics.map((t, idx) => {
    const ascii = toAscii(t.name);
    const id = slugify(ascii) || `topic_${idx + 1}`;
    const tier = pickTier(ascii, t.section || 0);
    const tags = inferTags(ascii);
    const rec = {
      id,
      name: t.name,
      tier,
      weight: 1,
      cycles: 1,
      tags,
    };
    return JSON.stringify(rec);
  });

  await fs.writeFile(OUTPUT, linesOut.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${finalTopics.length} gem topics to ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
