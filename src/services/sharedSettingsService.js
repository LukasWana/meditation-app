import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const REGION = 'us-central1';

const getFunctionsClient = () => {
  const app = getApp();
  return getFunctions(app, REGION);
};

export const createSharedSettings = async ({ payload, scope, ttlHours = 24, oneTime = true }) => {
  const functions = getFunctionsClient();
  const fn = httpsCallable(functions, 'createSharedSettings');
  const res = await fn({ payload, scope, ttlHours, oneTime });
  return res?.data;
};

export const consumeSharedSettings = async (shareId) => {
  const functions = getFunctionsClient();
  const fn = httpsCallable(functions, 'consumeSharedSettings');
  const res = await fn({ shareId });
  return res?.data;
};
