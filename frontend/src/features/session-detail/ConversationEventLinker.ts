import type { SessionMessageViewModel } from './types'

const normalizeCallId = (value?: string): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const isToolMessage = (message: SessionMessageViewModel): boolean => {
  if (message.role === 'tool') return true
  return message.sourceType === 'tool_call' || message.sourceType === 'tool_result'
}

const addRelationship = (
  adjacency: Map<string, Set<string>>,
  fromId?: string,
  toId?: string,
): void => {
  if (!fromId || !toId || fromId === toId) {
    return
  }
  const fromSet = adjacency.get(fromId) ?? new Set<string>()
  fromSet.add(toId)
  adjacency.set(fromId, fromSet)
  const toSet = adjacency.get(toId) ?? new Set<string>()
  toSet.add(fromId)
  adjacency.set(toId, toSet)
}

export class ConversationEventLinker {
  private readonly adjacency = new Map<string, Set<string>>()

  constructor(private readonly messages: SessionMessageViewModel[]) {}

  build(): Record<string, string[]> {
    let lastUserId: string | undefined
    let lastAssistantId: string | undefined
    let pendingToolIds: string[] = []
    const callIdIndex = new Map<string, string[]>()

    this.messages.forEach((message) => {
      if (message.role === 'user') {
        if (lastAssistantId) {
          addRelationship(this.adjacency, message.id, lastAssistantId)
        }
        lastUserId = message.id
        pendingToolIds = []
        return
      }

      if (message.role === 'assistant') {
        if (lastUserId) {
          addRelationship(this.adjacency, message.id, lastUserId)
        }
        pendingToolIds.forEach((toolId) => {
          addRelationship(this.adjacency, message.id, toolId)
        })
        lastAssistantId = message.id
        pendingToolIds = []
        return
      }

      if (isToolMessage(message)) {
        pendingToolIds.push(message.id)
        if (lastUserId) {
          addRelationship(this.adjacency, message.id, lastUserId)
        }

        const callId = normalizeCallId(message.toolCall?.callId)
        if (callId) {
          const siblings = callIdIndex.get(callId)
          if (siblings) {
            siblings.forEach((siblingId) => addRelationship(this.adjacency, message.id, siblingId))
            siblings.push(message.id)
          } else {
            callIdIndex.set(callId, [ message.id ])
          }
        }
        return
      }

      // その他 (meta/system) はリンク計算から除外
    })

    const result: Record<string, string[]> = {}
    this.adjacency.forEach((related, id) => {
      result[id] = Array.from(related)
    })
    return result
  }
}
