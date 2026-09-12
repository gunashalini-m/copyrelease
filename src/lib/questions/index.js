import { TOPIC as incidentTopic, questions as incident } from './incident.js';
import { TOPIC as problemTopic, questions as problem } from './problem.js';
import { TOPIC as changeTopic, questions as change } from './change.js';
import { TOPIC as requestTopic, questions as request } from './request.js';
import { TOPIC as knowledgeTopic, questions as knowledge } from './knowledge.js';
import { TOPIC as cmdbTopic, questions as cmdb } from './cmdb.js';
import { TOPIC as assetTopic, questions as asset } from './asset.js';
import { TOPIC as slaTopic, questions as sla } from './sla.js';
import { TOPIC as mimTopic, questions as mim } from './major-incident.js';
import { TOPIC as integrationsTopic, questions as integrations } from './integrations.js';
import { TOPIC as aclTopic, questions as acl } from './acl.js';
import { theory as incidentTheory } from './theory-incident.js';
import { theory as problemTheory } from './theory-problem.js';
import { theory as changeTheory } from './theory-change.js';
import { theory as requestTheory } from './theory-request.js';
import { theory as knowledgeTheory } from './theory-knowledge.js';
import { theory as cmdbTheory } from './theory-cmdb.js';
import { theory as assetTheory } from './theory-asset.js';
import { theory as slaTheory } from './theory-sla.js';
import { theory as mimTheory } from './theory-major-incident.js';
import { theory as integrationsTheory } from './theory-integrations.js';
import { theory as aclTheory } from './theory-acl.js';

function pack(topic, questions, theory) {
  return { ...topic, questions, theory };
}

export const TOPICS = [
  pack(incidentTopic, incident, incidentTheory),
  pack(problemTopic, problem, problemTheory),
  pack(changeTopic, change, changeTheory),
  pack(requestTopic, request, requestTheory),
  pack(knowledgeTopic, knowledge, knowledgeTheory),
  pack(cmdbTopic, cmdb, cmdbTheory),
  pack(assetTopic, asset, assetTheory),
  pack(slaTopic, sla, slaTheory),
  pack(mimTopic, mim, mimTheory),
  pack(integrationsTopic, integrations, integrationsTheory),
  pack(aclTopic, acl, aclTheory),
];

function mixExam(id, title, blurb, topicIds) {
  const items = [];
  for (const tid of topicIds) {
    const topic = TOPICS.find((entry) => entry.id === tid);
    if (!topic) continue;
    for (const q of topic.questions) {
      items.push({ topicId: tid, questionId: q.id, mode: 'code' });
    }
    for (const q of topic.theory) {
      items.push({ topicId: tid, questionId: q.id, mode: 'theory' });
    }
  }
  return { id, title, blurb, items };
}

function allCodeExam(id, title, blurb) {
  const items = [];
  for (const topic of TOPICS) {
    for (const q of topic.questions) {
      items.push({ topicId: topic.id, questionId: q.id, mode: 'code' });
    }
  }
  return { id, title, blurb, items };
}

function allTheoryExam(id, title, blurb) {
  const items = [];
  for (const topic of TOPICS) {
    for (const q of topic.theory) {
      items.push({ topicId: topic.id, questionId: q.id, mode: 'theory' });
    }
  }
  return { id, title, blurb, items };
}

export const EXAMS = [
  mixExam(
    'exam-full',
    'Full mixed exam',
    'Every coding and theory item in the bank, including ACLs. Use this as a marathon sitting.',
    TOPICS.map((topic) => topic.id),
  ),
  mixExam(
    'exam-itsm',
    'ITSM process exam',
    'Incident, Problem, Change, Request, Knowledge, SLA, and Major Incident — code and theory.',
    ['incident', 'problem', 'change', 'request', 'knowledge', 'sla', 'major_incident'],
  ),
  allCodeExam(
    'exam-dev',
    'Developer coding exam',
    'All GlideRecord / REST / workflow coding labs across every topic, including ACLs.',
  ),
  mixExam(
    'exam-security',
    'ACL & security exam',
    'Access Control, GlideRecordSecure, roles, and Scripted REST 403 — coding plus theory.',
    ['acl'],
  ),
  mixExam(
    'exam-data',
    'CMDB, Asset & Integrations exam',
    'Configuration, hardware, REST, SOAP, MID, and transform maps — coding plus theory.',
    ['cmdb', 'asset', 'integrations'],
  ),
  allTheoryExam(
    'exam-theory',
    'Theory-only exam',
    'Every multiple-choice item in the lab. Pair with the developer coding exam for a split sitting.',
  ),
];

export function getTopic(id) {
  return TOPICS.find((topic) => topic.id === id) || TOPICS[0];
}

export function getExam(id) {
  return EXAMS.find((exam) => exam.id === id) || EXAMS[0];
}

export function activeQuestions(topic, mode) {
  return mode === 'theory' ? topic.theory : topic.questions;
}

export function getQuestion(topicId, questionId, mode = 'code') {
  const topic = getTopic(topicId);
  const list = activeQuestions(topic, mode);
  return list.find((item) => item.id === questionId) || list[0];
}

export function allQuestions() {
  return TOPICS.flatMap((topic) =>
    topic.questions.map((item) => ({ ...item, topicId: topic.id, topicTitle: topic.title })),
  );
}

export function allTheoryQuestions() {
  return TOPICS.flatMap((topic) =>
    topic.theory.map((item) => ({ ...item, topicId: topic.id, topicTitle: topic.title })),
  );
}
