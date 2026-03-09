// scripts/add-user-to-project-firebase.js
// Checks if a project exists and adds a user to it (Firebase version)

const { adminDb } = require("./firebase-admin-init.js");

const projectsCol = adminDb.collection("projects");
const usersCol = adminDb.collection("users");

function membersCol(projectId) {
  return projectsCol.doc(projectId).collection("members");
}

function snapToDoc(snap) {
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function addUserToProject(projectId, userEmail) {
  try {
    console.log(`Checking if project ${projectId} exists...`);

    const projectSnap = await projectsCol.doc(projectId).get();
    const project = snapToDoc(projectSnap);

    if (!project) {
      console.log(`Project with ID ${projectId} does not exist.`);

      console.log("\nAvailable projects:");
      const allProjects = await projectsCol.get();
      allProjects.docs.forEach((doc) => {
        const data = doc.data();
        console.log(`- ${data.name} (${doc.id})`);
      });
      return;
    }

    console.log(`Found project: ${project.name} (${project.id})`);

    // Check if user exists
    console.log(`Looking for user with email: ${userEmail}`);
    const userSnap = await usersCol.where("email", "==", userEmail).limit(1).get();

    let user;
    if (userSnap.empty) {
      console.log(
        `User with email ${userEmail} does not exist. Creating user...`
      );
      const now = new Date();
      const docData = {
        email: userEmail,
        name: userEmail.split("@")[0],
        emailVerified: null,
        image: null,
        organizationId: null,
        createdAt: now,
        updatedAt: now,
        theme: "dark",
        adoUserId: null,
        maxHoursPerWeek: 40,
        licenseType: "FREE",
      };
      const ref = await usersCol.add(docData);
      user = { id: ref.id, ...docData };
      console.log(`User created: ${user.name} (${user.id})`);
    } else {
      const doc = userSnap.docs[0];
      user = { id: doc.id, ...doc.data() };
      console.log(`Found user: ${user.name} (${user.id})`);
    }

    // Check if already a member (doc ID = userId in members subcollection)
    const memberSnap = await membersCol(projectId).doc(user.id).get();

    if (memberSnap.exists) {
      const memberData = memberSnap.data();
      console.log(
        `User is already a member of this project with role: ${memberData.role}`
      );
      return;
    }

    // Add user to project with OWNER role
    const now = new Date();
    const memberId = `${user.id}_${projectId}`;
    await membersCol(projectId).doc(user.id).set({
      userId: user.id,
      projectId,
      role: "OWNER",
      memberId,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`User successfully added to project with role: OWNER`);
    console.log(`Now you should be able to access the project members API.`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Use the actual email associated with the session token
const projectId = process.argv[2] || "cm9s8ufq00000qbcw3fq4egle";
const userEmail = process.argv[3] || "horsensmlt@gmail.com";

addUserToProject(projectId, userEmail);
