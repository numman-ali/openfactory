// SPDX-License-Identifier: AGPL-3.0-only
// Types inferred from Zod schemas
export type { FeatureTreeItem } from "../schemas/feature.js";
export type { ArtifactFolderTreeItem } from "../schemas/artifact.js";
export type { CommentItem } from "../schemas/comment.js";

import { z } from "zod";
import type * as S from "../schemas/index.js";

export type ApiError = z.infer<typeof S.apiErrorSchema>;
export type Actor = z.infer<typeof S.actorSchema>;
export type UserRef = z.infer<typeof S.userRefSchema>;
export type UserRefWithAvatar = z.infer<typeof S.userRefWithAvatarSchema>;
export type SignupRequest = z.infer<typeof S.signupRequestSchema>;
export type SignupResponse = z.infer<typeof S.signupResponseSchema>;
export type SigninRequest = z.infer<typeof S.signinRequestSchema>;
export type SigninResponse = z.infer<typeof S.signinResponseSchema>;
export type ApiKey = z.infer<typeof S.apiKeySchema>;
export type ApiKeyScope = z.infer<typeof S.apiKeyScopeSchema>;
export type CreateApiKeyRequest = z.infer<typeof S.createApiKeyRequestSchema>;
export type CreateApiKeyResponse = z.infer<typeof S.createApiKeyResponseSchema>;
export type User = z.infer<typeof S.userSchema>;
export type SessionInfo = z.infer<typeof S.sessionInfoSchema>;
export type OrgRole = z.infer<typeof S.orgRoleSchema>;
export type Organization = z.infer<typeof S.organizationSchema>;
export type OrganizationListItem = z.infer<typeof S.organizationListItemSchema>;
export type OrganizationMember = z.infer<typeof S.organizationMemberSchema>;
export type UpdateOrganization = z.infer<typeof S.updateOrganizationSchema>;
export type InviteMember = z.infer<typeof S.inviteMemberSchema>;
export type Project = z.infer<typeof S.projectSchema>;
export type ProjectListItem = z.infer<typeof S.projectListItemSchema>;
export type ProjectDetail = z.infer<typeof S.projectDetailSchema>;
export type CreateProjectRequest = z.infer<typeof S.createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof S.updateProjectRequestSchema>;
export type Feature = z.infer<typeof S.featureSchema>;
export type CreateFeatureRequest = z.infer<typeof S.createFeatureRequestSchema>;
export type UpdateFeatureRequest = z.infer<typeof S.updateFeatureRequestSchema>;
export type DocumentType = z.infer<typeof S.documentTypeSchema>;
export type DocumentListItem = z.infer<typeof S.documentListItemSchema>;
export type DocumentDetail = z.infer<typeof S.documentDetailSchema>;
export type WorkOrderStatus = z.infer<typeof S.workOrderStatusSchema>;
export type PhaseListItem = z.infer<typeof S.phaseListItemSchema>;
export type WorkOrderListItem = z.infer<typeof S.workOrderListItemSchema>;
export type WorkOrderDetail = z.infer<typeof S.workOrderDetailSchema>;
export type CreateWorkOrderRequest = z.infer<typeof S.createWorkOrderRequestSchema>;
export type UpdateWorkOrderRequest = z.infer<typeof S.updateWorkOrderRequestSchema>;
export type FeedbackCategory = z.infer<typeof S.feedbackCategorySchema>;
export type FeedbackStatus = z.infer<typeof S.feedbackStatusSchema>;
export type FeedbackListItem = z.infer<typeof S.feedbackListItemSchema>;
export type FeedbackDetail = z.infer<typeof S.feedbackDetailSchema>;
export type GraphEntityType = z.infer<typeof S.graphEntityTypeSchema>;
export type GraphEdgeType = z.infer<typeof S.graphEdgeTypeSchema>;
export type DriftAlert = z.infer<typeof S.driftAlertSchema>;
export type ArtifactListItem = z.infer<typeof S.artifactListItemSchema>;
export type ArtifactDetail = z.infer<typeof S.artifactDetailSchema>;
export type TemplateListItem = z.infer<typeof S.templateListItemSchema>;
export type Activity = z.infer<typeof S.activitySchema>;

// Agent and knowledge graph types
export * from './agent.js';
export * from './graph.js';
