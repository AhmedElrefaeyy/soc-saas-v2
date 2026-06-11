import { apiClient } from './client'

export interface Invitation {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
  is_valid: boolean
  invited_by_name?: string
}

export interface AcceptInvitePayload {
  token: string
  // New user flow
  full_name?: string
  password?: string
  // Existing user flow
  existing_email?: string
  existing_password?: string
}

export interface AcceptInviteResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  tenant_id: string
  message: string
}

export const invitationsApi = {
  send: (email: string, role: string) =>
    apiClient.post<{ data: Invitation }>('/invitations', { email, role }),

  list: () =>
    apiClient.get<{ data: Invitation[] }>('/invitations'),

  revoke: (id: string) =>
    apiClient.delete(`/invitations/${id}`),

  accept: (payload: AcceptInvitePayload) =>
    apiClient.post<{ data: AcceptInviteResponse }>('/invitations/accept', payload),
}
