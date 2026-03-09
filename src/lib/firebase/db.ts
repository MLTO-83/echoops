import { adminDb } from "./admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  UserDoc,
  OrganizationDoc,
  ADOConnectionDoc,
  ProgramTypeDoc,
  ProjectDoc,
  ProjectMemberDoc,
  ProjectMemberWeeklyHoursDoc,
  ADOSprintDoc,
  ADOWorkItemDoc,
  AIProviderSettingsDoc,
  AIAgentSettingsDoc,
  AIAgentJobDoc,
  StateDoc,
  ProjectProgramTypeDoc,
  ProjectWebhookConfigDoc,
  VerificationTokenDoc,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return null;
}

function docToData<T extends { id: string }>(
  snap: FirebaseFirestore.DocumentSnapshot
): T | null {
  if (!snap.exists) return null;
  const data = snap.data()!;
  // Convert Timestamps to Dates
  const converted: Record<string, unknown> = { id: snap.id };
  for (const [key, val] of Object.entries(data)) {
    if (val instanceof Timestamp) {
      converted[key] = val.toDate();
    } else {
      converted[key] = val;
    }
  }
  return converted as T;
}

function queryToData<T extends { id: string }>(
  snap: FirebaseFirestore.QuerySnapshot
): T[] {
  return snap.docs.map((doc) => docToData<T>(doc)!);
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) cleaned[k] = v;
  }
  return cleaned;
}

// ─── Collection References ────────────────────────────────────────────────

const usersCol = adminDb.collection("users");
const organizationsCol = adminDb.collection("organizations");
const projectsCol = adminDb.collection("projects");
const statesCol = adminDb.collection("states");
const programTypesCol = adminDb.collection("programTypes");
const adoConnectionsCol = adminDb.collection("adoConnections");
const aiProviderSettingsCol = adminDb.collection("aiProviderSettings");
const aiAgentSettingsCol = adminDb.collection("aiAgentSettings");
const aiAgentJobsCol = adminDb.collection("aiAgentJobs");
const verificationTokensCol = adminDb.collection("verificationTokens");

// Subcollection helpers
function membersCol(projectId: string) {
  return projectsCol.doc(projectId).collection("members");
}
function weeklyHoursCol(projectId: string, userId: string) {
  return membersCol(projectId).doc(userId).collection("weeklyHours");
}
function sprintsCol(projectId: string) {
  return projectsCol.doc(projectId).collection("sprints");
}
function workItemsCol(projectId: string, sprintId: string) {
  return sprintsCol(projectId).doc(sprintId).collection("workItems");
}
function projectProgramTypesCol(projectId: string) {
  return projectsCol.doc(projectId).collection("programTypes");
}
function webhookConfigCol(projectId: string) {
  return projectsCol.doc(projectId).collection("webhookConfig");
}

// ─── Users ────────────────────────────────────────────────────────────────

export const users = {
  async findById(id: string): Promise<UserDoc | null> {
    const snap = await usersCol.doc(id).get();
    return docToData<UserDoc>(snap);
  },

  async findByEmail(email: string): Promise<UserDoc | null> {
    const snap = await usersCol.where("email", "==", email).limit(1).get();
    if (snap.empty) return null;
    return docToData<UserDoc>(snap.docs[0]);
  },

  async findByAdoUserId(adoUserId: string): Promise<UserDoc | null> {
    const snap = await usersCol.where("adoUserId", "==", adoUserId).limit(1).get();
    if (snap.empty) return null;
    return docToData<UserDoc>(snap.docs[0]);
  },

  async findByEmailOrAdoUserId(email: string, adoUserId?: string): Promise<UserDoc | null> {
    // Try email first
    const byEmail = await users.findByEmail(email);
    if (byEmail) return byEmail;
    // Try ADO user ID
    if (adoUserId) {
      return users.findByAdoUserId(adoUserId);
    }
    return null;
  },

  async findMany(filter?: { organizationId?: string; hasProjectMembers?: boolean }): Promise<UserDoc[]> {
    let query: FirebaseFirestore.Query = usersCol;
    if (filter?.organizationId) {
      query = query.where("organizationId", "==", filter.organizationId);
    }
    const snap = await query.get();
    return queryToData<UserDoc>(snap);
  },

  async create(data: Partial<UserDoc> & { email?: string | null }, id?: string): Promise<UserDoc> {
    const now = new Date();
    const docData = stripUndefined({
      name: data.name || null,
      email: data.email || null,
      emailVerified: data.emailVerified || null,
      image: data.image || null,
      organizationId: data.organizationId || null,
      createdAt: now,
      updatedAt: now,
      theme: data.theme || "dark",
      adoUserId: data.adoUserId || null,
      maxHoursPerWeek: data.maxHoursPerWeek ?? 40,
      licenseType: data.licenseType || "FREE",
    });

    if (id) {
      await usersCol.doc(id).set(docData);
      return { id, ...docData } as UserDoc;
    }

    const ref = await usersCol.add(docData);
    return { id: ref.id, ...docData } as UserDoc;
  },

  async update(id: string, data: Partial<UserDoc>): Promise<UserDoc> {
    const updateData = stripUndefined({ ...data, updatedAt: new Date() });
    delete (updateData as Record<string, unknown>).id;
    await usersCol.doc(id).update(updateData);
    const updated = await users.findById(id);
    return updated!;
  },

  async delete(id: string): Promise<void> {
    await usersCol.doc(id).delete();
  },

  async count(filter?: Record<string, unknown>): Promise<number> {
    let query: FirebaseFirestore.Query = usersCol;
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        query = query.where(k, "==", v);
      }
    }
    const snap = await query.count().get();
    return snap.data().count;
  },
};

// ─── Organizations ────────────────────────────────────────────────────────

export const organizations = {
  async findById(id: string): Promise<OrganizationDoc | null> {
    const snap = await organizationsCol.doc(id).get();
    return docToData<OrganizationDoc>(snap);
  },

  async create(data: { name: string }): Promise<OrganizationDoc> {
    const now = new Date();
    const docData = { name: data.name, createdAt: now, updatedAt: now };
    const ref = await organizationsCol.add(docData);
    return { id: ref.id, ...docData };
  },

  async update(id: string, data: Partial<OrganizationDoc>): Promise<OrganizationDoc> {
    const updateData = stripUndefined({ ...data, updatedAt: new Date() });
    delete (updateData as Record<string, unknown>).id;
    await organizationsCol.doc(id).update(updateData);
    return (await organizations.findById(id))!;
  },

  async delete(id: string): Promise<void> {
    await organizationsCol.doc(id).delete();
  },
};

// ─── ADO Connections ──────────────────────────────────────────────────────

export const adoConnections = {
  async findById(id: string): Promise<ADOConnectionDoc | null> {
    const snap = await adoConnectionsCol.doc(id).get();
    return docToData<ADOConnectionDoc>(snap);
  },

  async findByOrganizationId(organizationId: string): Promise<ADOConnectionDoc | null> {
    // Doc ID = organizationId for 1:1 enforcement
    const snap = await adoConnectionsCol.doc(organizationId).get();
    return docToData<ADOConnectionDoc>(snap);
  },

  async upsert(organizationId: string, data: Partial<ADOConnectionDoc>): Promise<ADOConnectionDoc> {
    const now = new Date();
    const docData = stripUndefined({
      organizationId,
      adoOrganizationUrl: data.adoOrganizationUrl,
      pat: data.pat,
      updatedAt: now,
    });

    await adoConnectionsCol.doc(organizationId).set(
      { ...docData, createdAt: now },
      { merge: true }
    );

    return (await adoConnections.findByOrganizationId(organizationId))!;
  },

  async delete(organizationId: string): Promise<void> {
    await adoConnectionsCol.doc(organizationId).delete();
  },
};

// ─── States ───────────────────────────────────────────────────────────────

export const states = {
  async findById(id: string): Promise<StateDoc | null> {
    const snap = await statesCol.doc(id).get();
    return docToData<StateDoc>(snap);
  },

  async findByName(name: string): Promise<StateDoc | null> {
    const snap = await statesCol.where("name", "==", name).limit(1).get();
    if (snap.empty) return null;
    return docToData<StateDoc>(snap.docs[0]);
  },

  async findMany(): Promise<StateDoc[]> {
    const snap = await statesCol.orderBy("name").get();
    return queryToData<StateDoc>(snap);
  },

  async upsert(id: string, data: { name: string; description?: string | null }): Promise<StateDoc> {
    await statesCol.doc(id).set(
      { name: data.name, description: data.description || null },
      { merge: true }
    );
    return (await states.findById(id))!;
  },

  async count(): Promise<number> {
    const snap = await statesCol.count().get();
    return snap.data().count;
  },
};

// ─── Projects ─────────────────────────────────────────────────────────────

export const projects = {
  async findById(id: string): Promise<ProjectDoc | null> {
    const snap = await projectsCol.doc(id).get();
    return docToData<ProjectDoc>(snap);
  },

  async findByAdoProjectId(adoProjectId: string, adoConnectionId?: string): Promise<ProjectDoc | null> {
    let query = projectsCol.where("adoProjectId", "==", adoProjectId);
    if (adoConnectionId) {
      query = query.where("adoConnectionId", "==", adoConnectionId);
    }
    const snap = await query.limit(1).get();
    if (snap.empty) return null;
    return docToData<ProjectDoc>(snap.docs[0]);
  },

  async findMany(filter?: { adoConnectionId?: string; adoProjectIdNotNull?: boolean }): Promise<ProjectDoc[]> {
    let query: FirebaseFirestore.Query = projectsCol;
    if (filter?.adoConnectionId) {
      query = query.where("adoConnectionId", "==", filter.adoConnectionId);
    }
    if (filter?.adoProjectIdNotNull) {
      query = query.where("adoProjectId", "!=", null);
    }
    const snap = await query.get();
    return queryToData<ProjectDoc>(snap);
  },

  async create(data: Partial<ProjectDoc>): Promise<ProjectDoc> {
    const now = new Date();
    const docData = stripUndefined({
      name: data.name || "",
      adoProjectId: data.adoProjectId || null,
      adoConnectionId: data.adoConnectionId || null,
      stateId: data.stateId || "new",
      createdAt: now,
      updatedAt: now,
    });
    const ref = await projectsCol.add(docData);
    return { id: ref.id, ...docData } as ProjectDoc;
  },

  async update(id: string, data: Partial<ProjectDoc>): Promise<ProjectDoc> {
    const updateData = stripUndefined({ ...data, updatedAt: new Date() });
    delete (updateData as Record<string, unknown>).id;
    await projectsCol.doc(id).update(updateData);
    return (await projects.findById(id))!;
  },

  async delete(id: string): Promise<void> {
    await projectsCol.doc(id).delete();
  },
};

// ─── Project Members (subcollection) ──────────────────────────────────────

export const projectMembers = {
  async findById(projectId: string, userId: string): Promise<ProjectMemberDoc | null> {
    const snap = await membersCol(projectId).doc(userId).get();
    return docToData<ProjectMemberDoc>(snap);
  },

  async findByMemberId(memberId: string): Promise<(ProjectMemberDoc & { projectId: string }) | null> {
    // memberId in Prisma was an auto-gen cuid. In Firestore, we use a composite
    // approach: search across all projects or use the memberId stored in the doc.
    // For backward compat, we store a `memberId` field.
    const snap = await adminDb.collectionGroup("members")
      .where("memberId", "==", memberId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = docToData<ProjectMemberDoc>(doc);
    if (!data) return null;
    // Extract projectId from the path: projects/{projectId}/members/{userId}
    const pathParts = doc.ref.path.split("/");
    return { ...data, projectId: pathParts[1] };
  },

  async findByUserAndProject(userId: string, projectId: string): Promise<ProjectMemberDoc | null> {
    const snap = await membersCol(projectId).doc(userId).get();
    return docToData<ProjectMemberDoc>(snap);
  },

  async findByProject(projectId: string): Promise<ProjectMemberDoc[]> {
    const snap = await membersCol(projectId).get();
    return queryToData<ProjectMemberDoc>(snap);
  },

  async findByUser(userId: string): Promise<(ProjectMemberDoc & { projectId: string })[]> {
    const snap = await adminDb.collectionGroup("members")
      .where("userId", "==", userId)
      .get();
    return snap.docs.map((doc) => {
      const data = docToData<ProjectMemberDoc>(doc)!;
      const pathParts = doc.ref.path.split("/");
      return { ...data, projectId: pathParts[1] };
    });
  },

  async create(data: { userId: string; projectId: string; role?: string; memberId?: string }): Promise<ProjectMemberDoc> {
    const now = new Date();
    const memberId = data.memberId || `${data.userId}_${data.projectId}`;
    const docData = {
      userId: data.userId,
      projectId: data.projectId,
      role: data.role || "MEMBER",
      memberId,
      createdAt: now,
      updatedAt: now,
    };
    await membersCol(data.projectId).doc(data.userId).set(docData);
    return { id: data.userId, ...docData };
  },

  async update(projectId: string, userId: string, data: Partial<ProjectMemberDoc>): Promise<ProjectMemberDoc> {
    const updateData = stripUndefined({ ...data, updatedAt: new Date() });
    delete (updateData as Record<string, unknown>).id;
    await membersCol(projectId).doc(userId).update(updateData);
    return (await projectMembers.findById(projectId, userId))!;
  },

  async delete(projectId: string, userId: string): Promise<void> {
    // Delete all weeklyHours subcollection docs first
    const whSnap = await weeklyHoursCol(projectId, userId).get();
    const batch = adminDb.batch();
    whSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(membersCol(projectId).doc(userId));
    await batch.commit();
  },

  async count(projectId: string): Promise<number> {
    const snap = await membersCol(projectId).count().get();
    return snap.data().count;
  },
};

// ─── Project Member Weekly Hours (subcollection) ──────────────────────────

export const projectMemberWeeklyHours = {
  async findOne(
    projectId: string,
    userId: string,
    year: number,
    weekNumber: number
  ): Promise<ProjectMemberWeeklyHoursDoc | null> {
    const docId = `${year}_${weekNumber}`;
    const snap = await weeklyHoursCol(projectId, userId).doc(docId).get();
    return docToData<ProjectMemberWeeklyHoursDoc>(snap);
  },

  async findByMember(
    projectId: string,
    userId: string,
    filter?: { year?: number }
  ): Promise<ProjectMemberWeeklyHoursDoc[]> {
    let query: FirebaseFirestore.Query = weeklyHoursCol(projectId, userId);
    if (filter?.year) {
      query = query.where("year", "==", filter.year);
    }
    const snap = await query.orderBy("year").orderBy("weekNumber").get();
    return queryToData<ProjectMemberWeeklyHoursDoc>(snap);
  },

  async upsert(
    projectId: string,
    userId: string,
    data: { year: number; weekNumber: number; hours: number; projectMemberId?: string }
  ): Promise<ProjectMemberWeeklyHoursDoc> {
    const docId = `${data.year}_${data.weekNumber}`;
    const now = new Date();
    const memberId = data.projectMemberId || `${userId}_${projectId}`;
    await weeklyHoursCol(projectId, userId).doc(docId).set(
      {
        projectMemberId: memberId,
        year: data.year,
        weekNumber: data.weekNumber,
        hours: data.hours,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
    return {
      id: docId,
      projectMemberId: memberId,
      year: data.year,
      weekNumber: data.weekNumber,
      hours: data.hours,
      createdAt: now,
      updatedAt: now,
    };
  },

  async delete(projectId: string, userId: string, year: number, weekNumber: number): Promise<void> {
    const docId = `${year}_${weekNumber}`;
    await weeklyHoursCol(projectId, userId).doc(docId).delete();
  },

  async deleteAll(projectId: string, userId: string): Promise<void> {
    const snap = await weeklyHoursCol(projectId, userId).get();
    const batch = adminDb.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  },
};

// ─── ADO Sprints (subcollection) ──────────────────────────────────────────

export const adoSprints = {
  async findById(projectId: string, sprintId: string): Promise<ADOSprintDoc | null> {
    const snap = await sprintsCol(projectId).doc(sprintId).get();
    return docToData<ADOSprintDoc>(snap);
  },

  async findByAdoIterationId(projectId: string, adoIterationId: string): Promise<ADOSprintDoc | null> {
    const snap = await sprintsCol(projectId)
      .where("adoIterationId", "==", adoIterationId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return docToData<ADOSprintDoc>(snap.docs[0]);
  },

  async findByProject(projectId: string): Promise<ADOSprintDoc[]> {
    const snap = await sprintsCol(projectId).get();
    return queryToData<ADOSprintDoc>(snap);
  },

  async upsert(projectId: string, adoIterationId: string, data: Partial<ADOSprintDoc>): Promise<ADOSprintDoc> {
    const now = new Date();
    // Use adoIterationId as doc ID
    await sprintsCol(projectId).doc(adoIterationId).set(
      stripUndefined({
        projectId,
        adoIterationId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        updatedAt: now,
        createdAt: now,
      }),
      { merge: true }
    );
    return (await adoSprints.findById(projectId, adoIterationId))!;
  },
};

// ─── ADO Work Items (subcollection) ───────────────────────────────────────

export const adoWorkItems = {
  async findByAdoWorkItemId(
    projectId: string,
    sprintId: string,
    adoWorkItemId: string
  ): Promise<ADOWorkItemDoc | null> {
    const snap = await workItemsCol(projectId, sprintId).doc(adoWorkItemId).get();
    return docToData<ADOWorkItemDoc>(snap);
  },

  async findBySprint(projectId: string, sprintId: string): Promise<ADOWorkItemDoc[]> {
    const snap = await workItemsCol(projectId, sprintId).get();
    return queryToData<ADOWorkItemDoc>(snap);
  },

  async upsert(
    projectId: string,
    sprintId: string,
    adoWorkItemId: string,
    data: Partial<ADOWorkItemDoc>
  ): Promise<ADOWorkItemDoc> {
    const now = new Date();
    await workItemsCol(projectId, sprintId).doc(adoWorkItemId).set(
      stripUndefined({
        adoSprintId: sprintId,
        adoWorkItemId,
        title: data.title,
        type: data.type,
        state: data.state,
        assignedTo: data.assignedTo || null,
        description: data.description || null,
        acceptanceCriteria: data.acceptanceCriteria || null,
        storyPoints: data.storyPoints || null,
        priority: data.priority || null,
        updatedAt: now,
        createdAt: now,
      }),
      { merge: true }
    );
    return (await adoWorkItems.findByAdoWorkItemId(projectId, sprintId, adoWorkItemId))!;
  },
};

// ─── AI Provider Settings ─────────────────────────────────────────────────

export const aiProviderSettings = {
  async findByOrgAndProvider(organizationId: string, provider: string): Promise<AIProviderSettingsDoc | null> {
    const docId = `${organizationId}_${provider}`;
    const snap = await aiProviderSettingsCol.doc(docId).get();
    return docToData<AIProviderSettingsDoc>(snap);
  },

  async findByOrganization(organizationId: string): Promise<AIProviderSettingsDoc[]> {
    const snap = await aiProviderSettingsCol
      .where("organizationId", "==", organizationId)
      .get();
    return queryToData<AIProviderSettingsDoc>(snap);
  },

  async upsert(
    organizationId: string,
    provider: string,
    data: Partial<AIProviderSettingsDoc>
  ): Promise<AIProviderSettingsDoc> {
    const docId = `${organizationId}_${provider}`;
    const now = new Date();
    await aiProviderSettingsCol.doc(docId).set(
      stripUndefined({
        organizationId,
        provider,
        apiKey: data.apiKey,
        model: data.model,
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens || null,
        updatedAt: now,
        createdAt: now,
      }),
      { merge: true }
    );
    return (await aiProviderSettings.findByOrgAndProvider(organizationId, provider))!;
  },

  async delete(organizationId: string, provider: string): Promise<void> {
    const docId = `${organizationId}_${provider}`;
    await aiProviderSettingsCol.doc(docId).delete();
  },
};

// ─── AI Agent Settings ────────────────────────────────────────────────────

export const aiAgentSettings = {
  async findByUser(userId: string): Promise<AIAgentSettingsDoc[]> {
    const snap = await aiAgentSettingsCol.where("userId", "==", userId).get();
    return queryToData<AIAgentSettingsDoc>(snap);
  },

  async findActive(): Promise<AIAgentSettingsDoc | null> {
    const snap = await aiAgentSettingsCol.where("isActive", "==", true).limit(1).get();
    if (snap.empty) return null;
    return docToData<AIAgentSettingsDoc>(snap.docs[0]);
  },

  async findAll(): Promise<AIAgentSettingsDoc[]> {
    const snap = await aiAgentSettingsCol.get();
    return queryToData<AIAgentSettingsDoc>(snap);
  },

  async upsert(userId: string, data: Partial<AIAgentSettingsDoc>): Promise<AIAgentSettingsDoc> {
    const now = new Date();
    // Find existing
    const existing = await aiAgentSettings.findByUser(userId);
    if (existing.length > 0) {
      const id = existing[0].id;
      await aiAgentSettingsCol.doc(id).update(
        stripUndefined({ ...data, updatedAt: now })
      );
      return (await aiAgentSettings.findByUser(userId))[0];
    }
    const docData = {
      userId,
      isActive: data.isActive ?? false,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await aiAgentSettingsCol.add(docData);
    return { id: ref.id, ...docData };
  },

  async deleteByUser(userId: string): Promise<void> {
    const snap = await aiAgentSettingsCol.where("userId", "==", userId).get();
    const batch = adminDb.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  },

  async deactivateAll(): Promise<void> {
    const snap = await aiAgentSettingsCol.where("isActive", "==", true).get();
    const batch = adminDb.batch();
    snap.docs.forEach((doc) => batch.update(doc.ref, { isActive: false, updatedAt: new Date() }));
    await batch.commit();
  },
};

// ─── AI Agent Jobs ────────────────────────────────────────────────────────

export const aiAgentJobs = {
  async findById(id: string): Promise<AIAgentJobDoc | null> {
    const snap = await aiAgentJobsCol.doc(id).get();
    return docToData<AIAgentJobDoc>(snap);
  },

  async findByProject(projectId: string): Promise<AIAgentJobDoc[]> {
    const snap = await aiAgentJobsCol
      .where("projectId", "==", projectId)
      .orderBy("createdAt", "desc")
      .get();
    return queryToData<AIAgentJobDoc>(snap);
  },

  async findPending(): Promise<AIAgentJobDoc[]> {
    const snap = await aiAgentJobsCol
      .where("status", "==", "PENDING")
      .orderBy("createdAt", "asc")
      .get();
    return queryToData<AIAgentJobDoc>(snap);
  },

  async create(data: Partial<AIAgentJobDoc>): Promise<AIAgentJobDoc> {
    const now = new Date();
    const docData = stripUndefined({
      projectId: data.projectId,
      prompt: data.prompt || "",
      repositoryName: data.repositoryName || "",
      status: data.status || "PENDING",
      pullRequestUrl: data.pullRequestUrl || null,
      errorMessage: data.errorMessage || null,
      adoWorkItemId: data.adoWorkItemId || null,
      adoWorkItemTitle: data.adoWorkItemTitle || null,
      adoWorkItemType: data.adoWorkItemType || null,
      createdAt: now,
      updatedAt: now,
    });
    const ref = await aiAgentJobsCol.add(docData);
    return { id: ref.id, ...docData } as AIAgentJobDoc;
  },

  async update(id: string, data: Partial<AIAgentJobDoc>): Promise<AIAgentJobDoc> {
    const updateData = stripUndefined({ ...data, updatedAt: new Date() });
    delete (updateData as Record<string, unknown>).id;
    await aiAgentJobsCol.doc(id).update(updateData);
    return (await aiAgentJobs.findById(id))!;
  },
};

// ─── Program Types ────────────────────────────────────────────────────────

export const programTypes = {
  async findById(id: string): Promise<ProgramTypeDoc | null> {
    const snap = await programTypesCol.doc(id).get();
    return docToData<ProgramTypeDoc>(snap);
  },

  async findByOrganization(organizationId: string): Promise<ProgramTypeDoc[]> {
    const snap = await programTypesCol
      .where("organizationId", "==", organizationId)
      .get();
    return queryToData<ProgramTypeDoc>(snap);
  },

  async findByOrgAndName(organizationId: string, name: string): Promise<ProgramTypeDoc | null> {
    const snap = await programTypesCol
      .where("organizationId", "==", organizationId)
      .where("name", "==", name)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return docToData<ProgramTypeDoc>(snap.docs[0]);
  },

  async create(data: { name: string; description?: string | null; organizationId: string }): Promise<ProgramTypeDoc> {
    const now = new Date();
    const docData = {
      name: data.name,
      description: data.description || null,
      organizationId: data.organizationId,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await programTypesCol.add(docData);
    return { id: ref.id, ...docData };
  },

  async update(id: string, data: Partial<ProgramTypeDoc>): Promise<ProgramTypeDoc> {
    const updateData = stripUndefined({ ...data, updatedAt: new Date() });
    delete (updateData as Record<string, unknown>).id;
    await programTypesCol.doc(id).update(updateData);
    return (await programTypes.findById(id))!;
  },

  async delete(id: string): Promise<void> {
    await programTypesCol.doc(id).delete();
  },
};

// ─── Project Program Types (subcollection) ────────────────────────────────

export const projectProgramTypes = {
  async findByProject(projectId: string): Promise<ProjectProgramTypeDoc[]> {
    const snap = await projectProgramTypesCol(projectId).get();
    return snap.docs.map((doc) => ({
      projectId,
      programTypeId: doc.id,
      createdAt: toDate(doc.data().createdAt) || new Date(),
    }));
  },

  async set(projectId: string, programTypeId: string): Promise<void> {
    await projectProgramTypesCol(projectId).doc(programTypeId).set({
      createdAt: new Date(),
    });
  },

  async delete(projectId: string, programTypeId: string): Promise<void> {
    await projectProgramTypesCol(projectId).doc(programTypeId).delete();
  },

  async deleteAll(projectId: string): Promise<void> {
    const snap = await projectProgramTypesCol(projectId).get();
    const batch = adminDb.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  },
};

// ─── Project Webhook Config (subcollection) ───────────────────────────────

export const projectWebhookConfig = {
  async findByProject(projectId: string): Promise<ProjectWebhookConfigDoc | null> {
    const snap = await webhookConfigCol(projectId).doc("config").get();
    if (!snap.exists) return null;
    const data = docToData<ProjectWebhookConfigDoc>(snap);
    return data ? { ...data, projectId } : null;
  },

  async upsert(projectId: string, data: Partial<ProjectWebhookConfigDoc>): Promise<ProjectWebhookConfigDoc> {
    const now = new Date();
    await webhookConfigCol(projectId).doc("config").set(
      stripUndefined({
        projectId,
        secret: data.secret,
        active: data.active ?? false,
        agentInstructions: data.agentInstructions || null,
        repositoryName: data.repositoryName || null,
        description: data.description || null,
        updatedAt: now,
        createdAt: now,
      }),
      { merge: true }
    );
    return (await projectWebhookConfig.findByProject(projectId))!;
  },

  async delete(projectId: string): Promise<void> {
    await webhookConfigCol(projectId).doc("config").delete();
  },
};

// ─── Verification Tokens ──────────────────────────────────────────────────

export const verificationTokens = {
  async findByToken(token: string): Promise<VerificationTokenDoc | null> {
    const snap = await verificationTokensCol.where("token", "==", token).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data();
    return {
      identifier: data.identifier,
      token: data.token,
      expires: toDate(data.expires) || new Date(),
    };
  },

  async create(data: VerificationTokenDoc): Promise<VerificationTokenDoc> {
    await verificationTokensCol.add({
      identifier: data.identifier,
      token: data.token,
      expires: data.expires,
    });
    return data;
  },

  async deleteByToken(token: string): Promise<void> {
    const snap = await verificationTokensCol.where("token", "==", token).get();
    const batch = adminDb.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  },
};

// ─── Transaction Helpers ──────────────────────────────────────────────────

export async function runTransaction<T>(
  fn: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> {
  return adminDb.runTransaction(fn);
}

export async function createProjectMemberWithWeeklyHours(data: {
  userId: string;
  projectId: string;
  role?: string;
  weeklyHours: { year: number; weekNumber: number; hours: number }[];
}): Promise<ProjectMemberDoc & { weeklyHours: ProjectMemberWeeklyHoursDoc[] }> {
  const now = new Date();
  const memberId = `${data.userId}_${data.projectId}`;

  const memberRef = membersCol(data.projectId).doc(data.userId);
  const memberData = {
    userId: data.userId,
    projectId: data.projectId,
    role: data.role || "MEMBER",
    memberId,
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb.batch();
  batch.set(memberRef, memberData);

  const whDocs: ProjectMemberWeeklyHoursDoc[] = [];
  for (const wh of data.weeklyHours) {
    const docId = `${wh.year}_${wh.weekNumber}`;
    const whRef = weeklyHoursCol(data.projectId, data.userId).doc(docId);
    const whData = {
      projectMemberId: memberId,
      year: wh.year,
      weekNumber: wh.weekNumber,
      hours: wh.hours,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(whRef, whData);
    whDocs.push({ id: docId, ...whData });
  }

  await batch.commit();
  return { id: data.userId, ...memberData, weeklyHours: whDocs };
}

export async function updateProjectMemberWithWeeklyHours(
  projectId: string,
  userId: string,
  data: {
    role?: string;
    weeklyHours?: { year: number; weekNumber: number; hours: number }[];
  }
): Promise<ProjectMemberDoc | null> {
  const now = new Date();
  const memberId = `${userId}_${projectId}`;
  const batch = adminDb.batch();

  if (data.role) {
    batch.update(membersCol(projectId).doc(userId), { role: data.role, updatedAt: now });
  }

  if (data.weeklyHours) {
    for (const wh of data.weeklyHours) {
      const docId = `${wh.year}_${wh.weekNumber}`;
      batch.set(
        weeklyHoursCol(projectId, userId).doc(docId),
        {
          projectMemberId: memberId,
          year: wh.year,
          weekNumber: wh.weekNumber,
          hours: wh.hours,
          updatedAt: now,
          createdAt: now,
        },
        { merge: true }
      );
    }
  }

  await batch.commit();
  return projectMembers.findById(projectId, userId);
}

export async function deleteProjectMemberWithWeeklyHours(
  projectId: string,
  userId: string
): Promise<void> {
  await projectMembers.delete(projectId, userId);
}

// ─── Exports ──────────────────────────────────────────────────────────────

export { adminDb };
