export type SessionSort =
  | 'created_at'
  | '-created_at'
  | 'message_count'
  | '-message_count'
  | 'duration_seconds'
  | '-duration_seconds'

export type SessionSpeakerRole = 'user' | 'assistant' | 'tool' | 'system'

export type SessionVariant = 'original' | 'sanitized'

export interface ApiEnvelope<TData, TMeta> {
  data: TData
  meta: TMeta
  errors: ApiErrorObject[]
}

export interface ApiErrorObject {
  code: string
  status: string
  title: string
  detail: string
  meta?: unknown
}

export interface SessionSummaryAttributes {
  session_id: string
  title: string
  relative_path: string
  created_at: string | null
  completed_at: string | null
  duration_seconds: number
  message_count: number
  tool_call_count: number
  tool_result_count: number
  reasoning_count: number
  meta_event_count: number
  has_sanitized_variant: boolean
  speaker_roles: SessionSpeakerRole[]
}

export interface SessionSummary {
  id: string
  type: 'session'
  attributes: SessionSummaryAttributes
  links?: {
    self?: string
  }
}

export interface SessionsIndexMeta {
  page: number
  per_page: number
  total_pages: number
  total_count: number
  filters: {
    speaker?: SessionSpeakerRole[]
    start_date?: string | null
    end_date?: string | null
    q?: string | null
  }
  updated_at?: string
}

export type SessionsIndexResponse = ApiEnvelope<SessionSummary[], SessionsIndexMeta>

export interface SessionMessageSegment {
  channel: 'input' | 'output' | 'meta'
  type: 'text'
  format?: string | null
  text: string
}

export interface SessionToolCall {
  call_id?: string
  name?: string
  arguments?: string
  arguments_json?: unknown
  status?: string | null
}

export interface SessionToolResult {
  call_id?: string
  output?: string
  output_json?: unknown
}

export interface SessionMessage {
  id: string
  timestamp?: string | null
  source_type: 'message' | 'tool_call' | 'tool_result' | 'meta' | 'session'
  role: SessionSpeakerRole | 'meta'
  segments: SessionMessageSegment[]
  tool_call?: SessionToolCall
  tool_result?: SessionToolResult
  raw?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface SessionDetailAttributes extends SessionSummaryAttributes {
  checksum_sha256?: string
  signature?: string
  messages: SessionMessage[]
}

export interface SessionDetailResource {
  id: string
  type: 'session'
  attributes: SessionDetailAttributes
  links?: {
    self?: string
  }
}

export interface SessionDetailMeta {
  session: {
    relative_path: string
    signature?: string
    raw_session_meta?: Record<string, unknown> | null
  }
  links: {
    download: string
  }
}

export type SessionDetailResponse = ApiEnvelope<SessionDetailResource, SessionDetailMeta>

export interface JobAttributes {
  status: string
  queue?: string
  enqueued_at?: string
  updated_at?: string
  completed_at?: string | null
  error_message?: string | null
}

export interface JobResource {
  id: string
  type: 'job'
  attributes: JobAttributes
}

export interface JobMeta {
  job: {
    id?: string
    status?: string
    queue?: string
    enqueued_at?: string
    updated_at?: string
    completed_at?: string | null
  }
}

export type JobResponse = ApiEnvelope<JobResource, JobMeta>

export interface SessionListParams {
  page?: number
  perPage?: number
  sort?: SessionSort
  speakerRoles?: SessionSpeakerRole[]
  startDate?: string
  endDate?: string
  query?: string
}

export interface SessionDetailParams {
  id: string
  variant?: SessionVariant
}
