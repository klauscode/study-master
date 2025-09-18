import fs from 'fs';
import path from 'path';

// Read the programa_provas.md file
const programaPath = path.join(process.cwd(), 'programa_provas.md');
const programaContent = fs.readFileSync(programaPath, 'utf8');

// Subject configurations for the simplified program
const SUBJECTS = {
  'Linguagens': {
    prefix: 'lang',
    category: 'Language'
  },
  'Matemática': {
    prefix: 'math',
    category: 'Math'
  },
  'Física': {
    prefix: 'phys',
    category: 'Science'
  },
  'Química': {
    prefix: 'chem',
    category: 'Science'
  },
  'Biologia': {
    prefix: 'bio',
    category: 'Science'
  },
  'Humanas': {
    prefix: 'hum',
    category: 'Humanities'
  }
};

// Helper function to clean and format topic names
function cleanTopicName(text) {
  return text
    .replace(/^\d+\.?\s*/, '') // Remove leading numbers
    .replace(/^[a-z]\)\s*/i, '') // Remove leading letters like "a) "
    .replace(/1ªF\/2ªF\s*[−-]\s*/g, '') // Remove phase indicators
    .replace(/2ªF\s*[−-]\s*/g, '') // Remove phase indicators
    .replace(/1ªF\s*[−-]\s*/g, '') // Remove phase indicators
    .replace(/\s*[−-]\s*$/, '') // Remove trailing dashes
    .replace(/[−-]\s*/g, '') // Remove em-dashes and regular dashes
    .replace(/;\s*$/, '') // Remove trailing semicolons
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^[^a-zA-Z]+/, '') // Remove leading non-letters
    .trim();
}

// Helper function to create gem ID
function createGemId(prefix, text, index) {
  const clean = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 40); // Limit length
  return `${prefix}_${clean}_${index}`;
}

// Helper function to assign tier based on complexity indicators
function assignTier(text) {
  // Tier 3 (hardest) - advanced topics
  if (text.match(/teorema|fundamental|multiplicidade|determinante|inversa|condicional|transformações|inequações|fatoração/i)) {
    return 3;
  }
  // Tier 2 (medium) - intermediate topics
  if (text.match(/função|geometria|sistemas|probabilidade|trigonometria|análise|equações/i)) {
    return 2;
  }
  // Tier 1 (easiest) - basic topics
  return 1;
}

// Helper function to assign tags based on simplified subjects
function assignTags(text, subject) {
  const tags = [];

  if (subject === 'Matemática') {
    if (text.match(/fundamentos/i)) tags.push('basics');
    if (text.match(/álgebra/i)) tags.push('algebra');
    if (text.match(/geometria/i)) tags.push('geometry');
    if (text.match(/analítica|trigonometria/i)) tags.push('advanced');
    if (text.match(/contagem|dados/i)) tags.push('statistics');
  }

  if (subject === 'Física') {
    if (text.match(/cinemática|dinâmica/i)) tags.push('mechanics');
    if (text.match(/energia|movimento/i)) tags.push('energy');
    if (text.match(/fluidos|gravitação/i)) tags.push('fluids');
    if (text.match(/termo/i)) tags.push('thermodynamics');
    if (text.match(/ondas|óptica/i)) tags.push('waves');
    if (text.match(/eletri|magnetismo/i)) tags.push('electromagnetism');
    if (text.match(/moderna/i)) tags.push('modern');
  }

  if (subject === 'Química') {
    if (text.match(/estrutura|matéria/i)) tags.push('structure');
    if (text.match(/mol|gases/i)) tags.push('stoichiometry');
    if (text.match(/soluções|coligativas/i)) tags.push('solutions');
    if (text.match(/termo/i)) tags.push('thermochemistry');
    if (text.match(/equilíbrios/i)) tags.push('equilibrium');
    if (text.match(/cinética|eletroquímica/i)) tags.push('kinetics');
    if (text.match(/orgânica/i)) tags.push('organic');
  }

  if (subject === 'Biologia') {
    if (text.match(/molecular|celulares/i)) tags.push('molecular');
    if (text.match(/metabolismo/i)) tags.push('metabolism');
    if (text.match(/genética/i)) tags.push('genetics');
    if (text.match(/evolução/i)) tags.push('evolution');
    if (text.match(/ecologia/i)) tags.push('ecology');
    if (text.match(/micro|proto/i)) tags.push('microorganisms');
    if (text.match(/botânica|algas/i)) tags.push('botany');
    if (text.match(/zoologia|animalia/i)) tags.push('zoology');
    if (text.match(/saúde|doenças/i)) tags.push('health');
  }

  if (subject === 'Linguagens') {
    if (text.match(/leitura|interpretação/i)) tags.push('reading');
    if (text.match(/gramática/i)) tags.push('grammar');
    if (text.match(/redação/i)) tags.push('writing');
    if (text.match(/inglês/i)) tags.push('english');
  }

  if (subject === 'Humanas') {
    if (text.match(/geografia/i)) tags.push('geography');
    if (text.match(/história/i)) tags.push('history');
    if (text.match(/filosofia/i)) tags.push('philosophy');
    if (text.match(/sociologia/i)) tags.push('sociology');
  }

  return tags;
}

// Extract topics for each subject from the simplified format
const allGems = [];
let gemIndex = 1;

// Parse the simplified markdown format
const lines = programaContent.split('\n');
let currentSubject = null;

for (const line of lines) {
  const trimmed = line.trim();

  // Skip empty lines
  if (!trimmed) continue;

  // Check if this is a subject header (## Subject)
  if (trimmed.startsWith('## ')) {
    currentSubject = trimmed.substring(3);
    console.log(`\nProcessing ${currentSubject}...`);
    continue;
  }

  // Check if this is a topic (- Topic)
  if (trimmed.startsWith('- ') && currentSubject && SUBJECTS[currentSubject]) {
    const topic = trimmed.substring(2); // Remove '- '
    const config = SUBJECTS[currentSubject];

    const gem = {
      id: createGemId(config.prefix, topic, gemIndex++),
      name: topic,
      tier: assignTier(topic),
      weight: 1,
      cycles: 1,
      tags: assignTags(topic, currentSubject),
      subject: currentSubject,
      category: config.category
    };

    allGems.push(gem);
  }
}

console.log(`\nGenerated ${allGems.length} gems total`);

// Group by subject for overview
const bySubject = {};
for (const gem of allGems) {
  if (!bySubject[gem.subject]) bySubject[gem.subject] = [];
  bySubject[gem.subject].push(gem);
}

console.log('\nBy subject:');
for (const [subject, gems] of Object.entries(bySubject)) {
  console.log(`${subject}: ${gems.length} gems`);
}

// Write to JSONL file
const outputPath = path.join(process.cwd(), 'data', 'gems_all.jsonl');
const jsonlContent = allGems.map(gem => {
  const { subject, ...gemWithoutSubject } = gem;
  return JSON.stringify(gemWithoutSubject);
}).join('\n');

fs.writeFileSync(outputPath, jsonlContent, 'utf8');
console.log(`\nWrote gems to ${outputPath}`);

// Also create a backup of current gems
const currentGemsPath = path.join(process.cwd(), 'data', 'gems.jsonl');
if (fs.existsSync(currentGemsPath)) {
  const backupPath = path.join(process.cwd(), 'data', 'gems_backup.jsonl');
  fs.copyFileSync(currentGemsPath, backupPath);
  console.log(`Backed up current gems to ${backupPath}`);
}

// Replace current gems
fs.writeFileSync(currentGemsPath, jsonlContent, 'utf8');
console.log(`Updated ${currentGemsPath} with all subjects`);