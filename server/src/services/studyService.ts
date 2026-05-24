import type {
  CreateStudyTopicInput,
  UpdateStudyTopicInput,
} from '@command-center/shared';
import { prisma } from '../db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { serializeStudyTopic } from '../utils/serialize.js';

export const listStudyTopics = async (filters?: { areaId?: string }) => {
  const topics = await prisma.studyTopic.findMany({
    where: filters?.areaId ? { areaId: filters.areaId } : undefined,
    orderBy: [{ confidence: 'asc' }, { subject: 'asc' }, { topic: 'asc' }],
  });
  return topics.map(serializeStudyTopic);
};

export const getStudyTopic = async (id: string) => {
  const t = await prisma.studyTopic.findUnique({ where: { id } });
  if (!t) throw new HttpError(404, 'STUDY_TOPIC_NOT_FOUND', 'Study topic not found');
  return serializeStudyTopic(t);
};

export const createStudyTopic = async (input: CreateStudyTopicInput) => {
  const t = await prisma.studyTopic.create({
    data: {
      subject: input.subject,
      topic: input.topic,
      confidence: input.confidence ?? 'medium',
      mockScore: input.mockScore ?? null,
      weakTopics: JSON.stringify(input.weakTopics ?? []),
      totalMinutes: input.totalMinutes ?? 0,
      areaId: input.areaId ?? null,
      trackId: input.trackId ?? null,
      goalId: input.goalId ?? null,
      notes: input.notes ?? null,
      lastStudiedAt: input.lastStudiedAt ? new Date(input.lastStudiedAt) : null,
      nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
    },
  });
  return serializeStudyTopic(t);
};

export const updateStudyTopic = async (id: string, input: UpdateStudyTopicInput) => {
  await getStudyTopic(id);
  const t = await prisma.studyTopic.update({
    where: { id },
    data: {
      ...(input.subject !== undefined && { subject: input.subject }),
      ...(input.topic !== undefined && { topic: input.topic }),
      ...(input.confidence !== undefined && { confidence: input.confidence }),
      ...(input.mockScore !== undefined && { mockScore: input.mockScore ?? null }),
      ...(input.weakTopics !== undefined && {
        weakTopics: JSON.stringify(input.weakTopics ?? []),
      }),
      ...(input.totalMinutes !== undefined && { totalMinutes: input.totalMinutes }),
      ...(input.areaId !== undefined && { areaId: input.areaId ?? null }),
      ...(input.trackId !== undefined && { trackId: input.trackId ?? null }),
      ...(input.goalId !== undefined && { goalId: input.goalId ?? null }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
      ...(input.lastStudiedAt !== undefined && {
        lastStudiedAt: input.lastStudiedAt ? new Date(input.lastStudiedAt) : null,
      }),
      ...(input.nextReviewAt !== undefined && {
        nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
      }),
    },
  });
  return serializeStudyTopic(t);
};

export const deleteStudyTopic = async (id: string) => {
  await getStudyTopic(id);
  await prisma.studyTopic.delete({ where: { id } });
};
