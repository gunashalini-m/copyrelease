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

function pack(topic, questions, theory) {
  return {
    ...topic,
    questions: questions.slice(0, 15),
    theory: theory.slice(0, 15),
  };
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
];

export function getTopic(id) {
  return TOPICS.find((topic) => topic.id === id) || TOPICS[0];
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
