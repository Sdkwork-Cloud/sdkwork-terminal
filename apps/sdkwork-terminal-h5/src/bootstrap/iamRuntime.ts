export interface IamRuntime {
  baseUrl: string;
}

export function createIamRuntime(baseUrl: string): IamRuntime {
  // TODO: Initialize appbase IAM runtime
  // This should handle login, registration, session, refresh, logout
  return { baseUrl };
}
