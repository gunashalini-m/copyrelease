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

export const TOPICS = [
  { ...incidentTopic, questions: incident },
  { ...problemTopic, questions: problem },
  { ...changeTopic, questions: change },
  { ...requestTopic, questions: request },
  { ...knowledgeTopic, questions: knowledge },
  { ...cmdbTopic, questions: cmdb },
  { ...assetTopic, questions: asset },
  { ...slaTopic, questions: sla },
  { ...mimTopic, questions: mim },
  { ...integrationsTopic, questions: integrations },
];

export function getTopic(id) {
  return TOPICS.find((topic) => topic.id === id) || TOPICS[0];
}

export function getQuestion(topicId, questionId) {
  const topic = getTopic(topicId);
  return topic.questions.find((item) => item.id === questionId) || topic.questions[0];
}

export function allQuestions() {
  return TOPICS.flatMap((topic) => topic.questions.map((item) => ({ ...item, topicId: topic.id, topicTitle: topic.title })));
}
