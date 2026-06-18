export interface RuntimeNodeHttpErrorBody {
  code: string;
  message: string;
  traceId: string;
  retryable: boolean;
  details: Record<string, unknown>;
}
