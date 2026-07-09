/**
 * student.service.js
 * All operations for creating and managing student accounts.
 *
 * Why secondaryAuth?
 *   createUserWithEmailAndPassword on the primary auth instance
 *   immediately signs in as the new user — logging the admin out.
 *   secondaryAuth is a separate Firebase app instance with its own
 *   auth state, so the admin session is never touched.
 *
 * selfRegisterStudent is the exception — it intentionally uses the
 *   primary auth so the student is signed in right after sign-up.
 *
 * Delete note:
 *   deleteStudent removes the Firestore profile only.
 *   The Firebase Auth account remains but the student cannot access
 *   the app — ProtectedRoute checks the Firestore role doc.
 */

import {
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  documentId,
} from "firebase/firestore";
import { db, auth, secondaryAuth } from "../firebase";

// ─── Admin: Create student ────────────────────────────────────────────────────
/**
 * Creates a Firebase Auth account + Firestore profile for a student.
 * Uses secondaryAuth so the admin session is never affected.
 *
 * @param {{ name, email, password, grade, batchId }} param
 * @returns {string} new student uid
 */
export async function createStudent({ name, email, password, grade, batchId }) {
  const cred = await createUserWithEmailAndPassword(
    secondaryAuth,
    email.trim().toLowerCase(),
    password
  );
  const uid = cred.user.uid;
  await signOut(secondaryAuth);

  try {
    await setDoc(doc(db, "users", uid), {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: "student",
      grade: String(grade),
      batchId: batchId || "",
      disabled: false, // ← explicit; Login checks this field
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Auth account exists but profile write failed — delete it to prevent
    // a ghost account that blocks re-registration with the same email.
    try {
      await cred.user.delete();
    } catch {
      /* best-effort */
    }
    throw err;
  }

  return uid;
}

// ─── Self-registration ────────────────────────────────────────────────────────
/**
 * Called from AuthContext.register() during the student sign-up flow.
 * Uses the PRIMARY auth instance so the student is signed in automatically
 * after account creation — no secondaryAuth needed here.
 *
 * Unlike createStudent (admin flow), there is no batchId at sign-up time;
 * an admin can assign one later via updateStudent.
 *
 * @param {{ name, email, password, grade }} param
 * @returns {string} new student uid
 */
export async function selfRegisterStudent({ name, email, password, grade }) {
  const cred = await createUserWithEmailAndPassword(
    auth, // ← primary auth; student gets signed in
    email.trim().toLowerCase(),
    password
  );
  const uid = cred.user.uid;

  try {
    await setDoc(doc(db, "users", uid), {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: "student",
      grade: String(grade),
      batchId: "", // admin assigns later
      disabled: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Profile write failed — delete the dangling Auth account so the
    // student can retry registration with the same email.
    try {
      await cred.user.delete();
    } catch {
      /* best-effort */
    }
    throw err;
  }

  return uid;
}

// ─── Read: all students ───────────────────────────────────────────────────────
/**
 * Fetches all users with role 'student', ordered by name.
 * @returns {Array}
 */
export async function getStudents() {
  const q = query(
    collection(db, "users"),
    where("role", "==", "student"),
    orderBy("name")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Read: single student ─────────────────────────────────────────────────────
/**
 * Fetches a single student profile by uid.
 * @param {string} uid
 * @returns {object|null}
 */
export async function getStudent(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateStudent(uid, data) {
  const normalized = {
    ...data,
    ...(data.grade !== undefined && { grade: String(data.grade) }),
  };
  await updateDoc(doc(db, "users", uid), normalized);
}

export async function resetStudentPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ─── Disable / Enable ────────────────────────────────────────────────────────
export async function deleteStudent(uid) {
  await updateDoc(doc(db, "users", uid), { disabled: true });
}

export async function enableStudent(uid) {
  await updateDoc(doc(db, "users", uid), { disabled: false });
}

// ─── Permanent (hard) delete ─────────────────────────────────────────────────
export async function permanentlyDeleteStudent(uid) {
  await deleteDoc(doc(db, "users", uid));
}

// ─── Password change (student-initiated) ─────────────────────────────────────
export async function changeStudentPassword(
  currentUser,
  currentPassword,
  newPassword
) {
  const credential = EmailAuthProvider.credential(
    currentUser.email,
    currentPassword
  );
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, newPassword);
}

// ─── Lookup by email ─────────────────────────────────────────────────────────
/** Used by bulk results import. */
export async function getStudentByEmail(email) {
  const q = query(
    collection(db, "users"),
    where("email", "==", email.trim().toLowerCase()),
    where("role", "==", "student")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// ─── Batch fetch by UID array ────────────────────────────────────────────────
/**
 * Batch-fetch student profiles by user ID array.
 * Uses Firestore `whereIn` in chunks of 30 (Firestore limit).
 * Returns a map { [uid]: studentData } for O(1) lookup.
 *
 * 1000 students = ~34 queries instead of 1000 individual reads.
 *
 * @param {string[]} ids  Array of user UIDs
 * @returns {Promise<Record<string, object>>}
 */
export async function getStudentsByIds(ids) {
  if (!ids || ids.length === 0) return {};

  const unique = [...new Set(ids)];
  const chunks = [];
  for (let i = 0; i < unique.length; i += 30) {
    chunks.push(unique.slice(i, i + 30));
  }

  const map = {};
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(
        collection(db, "users"),
        where(documentId(), "in", chunk)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        map[d.id] = { id: d.id, ...d.data() };
      });
    })
  );

  return map;
}
