/**
 * Quick test of the LaTeX generator with a sample payload.
 * Run: npx ts-node --skip-project src/scripts/test-latex.ts
 */
import { generateLatexFromJSON } from '../lib/latex-generator';

const sample = {
  contact: {
    name: 'Mohammed Faadil',
    email: 'faadil004@gmail.com',
    phone: '+91 88129 35718',
    location: 'Chennai, India',
    linkedin: 'linkedin.com/in/mohammed-faadil-9600b924b',
    github: 'github.com/MohammedFaadil',
  },
  summary:
    'Final-year B.Tech Computer Science student with hands-on experience in scalable backend development using Django and FastAPI, AI system integration, REST API design, and secure system architecture. Proficient in Python, NLP, Deep Learning, Docker, and CI/CD pipelines with a focus on building production-ready, intelligent software systems.',
  experience: [
    {
      title: 'Backend Intern',
      company: 'Prudent AI',
      location: 'Chennai, India',
      start: 'Dec 2025',
      end: 'Present',
      bullets: [
        'Engineered scalable backend services using Django and FastAPI, supporting enterprise-grade AI-driven application workflows.',
        'Designed and optimized REST APIs to improve backend communication, reducing response latency and increasing system throughput.',
        'Implemented automated testing pipelines using Pytest, Unittest, and Mock frameworks to improve software reliability and reduce regression defects.',
        'Improved application stability through structured logging, validation mechanisms, and backend optimization techniques.',
        'Deployed automated CI/CD pipelines using Docker and GitHub Actions, enabling zero-downtime production releases.',
      ],
    },
  ],
  education: [
    {
      degree: 'B.Tech in Computer Science Engineering',
      institution: 'B.S. Abdur Rahman Crescent Institute of Science and Technology',
      location: 'Chennai, India',
      year: '2026',
      gpa: '8.7/10',
    },
  ],
  skills: {
    technical: ['Python', 'Django', 'FastAPI', 'REST APIs', 'NLP', 'Deep Learning', 'PostgreSQL', 'Docker'],
    tools: ['GitHub Actions', 'Pytest', 'Postman', 'Git', 'Linux', 'VS Code'],
    soft: ['System Design', 'API Architecture', 'Agile/Scrum', 'Technical Documentation'],
  },
  certifications: [],
};

const latex = generateLatexFromJSON(sample);
console.log(latex);

// Quick sanity checks
const checks = [
  { name: 'No \\{}textbullet\\{}',    pass: !latex.includes('{}textbullet') },
  { name: 'No [SUGGESTED',            pass: !latex.includes('[SUGGESTED') },
  { name: 'Has \\resumesection',      pass: latex.includes('\\resumesection') },
  { name: 'Has tabular for skills',   pass: latex.includes('\\begin{tabular}') },
  { name: 'No empty \\item',          pass: !latex.includes('\\item \n') },
  { name: 'Has name in header',       pass: latex.includes('Mohammed Faadil') },
  { name: 'Has Backend Intern',       pass: latex.includes('Backend Intern') },
];

console.log('\n\n=== VALIDATION RESULTS ===');
let allPass = true;
for (const c of checks) {
  const icon = c.pass ? '✓' : '✗';
  console.log(`${icon} ${c.name}`);
  if (!c.pass) allPass = false;
}
console.log(`\n${allPass ? '✅ All checks passed!' : '❌ Some checks failed.'}`);
