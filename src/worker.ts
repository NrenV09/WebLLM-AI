import { WebWorkerMLCEngineHandler, prebuiltAppConfig } from '@mlc-ai/web-llm';
import { registerCustomModels } from './modelsConfig';

registerCustomModels(prebuiltAppConfig);

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};

