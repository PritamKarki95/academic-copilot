import * as api from "./api";
import { DEMO_AGENT_RESULT, demoUploadResult } from "./demo-data";

export type AcademicService = Pick<typeof api, "uploadDocuments" | "runAgent" | "generateQuiz">;
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// Both data sources use the same interface; Demo never makes network requests.
const demoService: AcademicService = {
  async uploadDocuments() {
    await wait(1000);
    return demoUploadResult();
  },
  async runAgent() {
    await wait(3800);
    return DEMO_AGENT_RESULT;
  },
  async generateQuiz() {
    await wait(500);
    return DEMO_AGENT_RESULT.quiz!;
  },
};

export function academicService(demoMode: boolean): AcademicService {
  return demoMode ? demoService : api;
}
