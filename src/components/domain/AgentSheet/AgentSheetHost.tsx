import { useCallback } from 'react'
import type { AgentContext, AgentToolCall } from '@hooks/useAgent'
import { useToolExecutor } from '@hooks/useToolExecutor'
import { AgentSheet } from './AgentSheet'

interface AgentSheetHostProps {
  open: boolean
  onClose: () => void
  context: AgentContext | null
  activeVehicleId: string | null
}

/**
 * Thin wrapper that owns the tool executor so the whole agent stack
 * (AgentSheet, useAgent, useToolExecutor, VAD) can be lazy-loaded from
 * AppShell — it only downloads when the user first opens the AI sheet,
 * keeping it out of the main bundle for everyone else.
 */
export function AgentSheetHost({ open, onClose, context, activeVehicleId }: AgentSheetHostProps) {
  const executeTool = useToolExecutor()
  const onToolCall = useCallback(
    (call: AgentToolCall): Promise<unknown> => executeTool(call, activeVehicleId ?? ''),
    [executeTool, activeVehicleId],
  )
  return <AgentSheet open={open} onClose={onClose} context={context} onToolCall={onToolCall} />
}
