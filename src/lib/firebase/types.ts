export type LicenseType = "FREE" | "BASIC" | "AI_AGENT";

export interface UserDoc {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  theme: string;
  adoUserId: string | null;
  maxHoursPerWeek: number;
  licenseType: LicenseType;
}

export interface OrganizationDoc {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ADOConnectionDoc {
  id: string;
  organizationId: string;
  adoOrganizationUrl: string;
  pat: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgramTypeDoc {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDoc {
  id: string;
  name: string;
  adoProjectId: string | null;
  adoConnectionId: string | null;
  stateId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberDoc {
  id: string; // doc ID = userId
  userId: string;
  projectId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberWeeklyHoursDoc {
  id: string; // doc ID = `{year}_{weekNumber}`
  projectMemberId: string;
  year: number;
  weekNumber: number;
  hours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ADOSprintDoc {
  id: string;
  projectId: string;
  adoIterationId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ADOWorkItemDoc {
  id: string;
  adoSprintId: string;
  adoWorkItemId: string;
  title: string;
  type: string;
  state: string;
  assignedTo: string | null;
  description: string | null;
  acceptanceCriteria: string | null;
  storyPoints: number | null;
  priority: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIProviderSettingsDoc {
  id: string;
  organizationId: string;
  provider: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAgentSettingsDoc {
  id: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAgentJobDoc {
  id: string;
  projectId: string;
  prompt: string;
  repositoryName: string;
  status: string;
  pullRequestUrl: string | null;
  errorMessage: string | null;
  adoWorkItemId: string | null;
  adoWorkItemTitle: string | null;
  adoWorkItemType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StateDoc {
  id: string;
  name: string;
  description: string | null;
}

export interface ProjectProgramTypeDoc {
  projectId: string;
  programTypeId: string;
  createdAt: Date;
}

export interface ProjectWebhookConfigDoc {
  id: string;
  projectId: string;
  secret: string;
  active: boolean;
  agentInstructions: string | null;
  repositoryName: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationTokenDoc {
  identifier: string;
  token: string;
  expires: Date;
}

export interface AppSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    organizationId?: string | null;
    theme?: string | null;
    emailVerified?: Date | null;
  };
}
