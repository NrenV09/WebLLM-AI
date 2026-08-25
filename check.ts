import { prebuiltAppConfig } from '@mlc-ai/web-llm';
console.log(prebuiltAppConfig.model_list.map(m => m.model_id).filter(id => id.includes('14B')));
