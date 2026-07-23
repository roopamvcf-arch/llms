import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  usersTable,
  coursesTable,
  modulesTable,
  lessonsTable,
  quizzesTable,
  questionsTable,
  optionsTable,
  badgesTable,
  platformSettingsTable
} from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data to avoid duplicates and stale URLs
  await db.execute(sql`
    TRUNCATE TABLE 
      "options", "questions", "quizzes", "quiz_attempts", 
      "progress", "enrollments", "lessons", "modules", "courses", 
      "badges", "user_badges", "certificates", "video_notes", 
      "notifications", "user_preferences", "audit_log", 
      "platform_settings", "sessions", "users"
    RESTART IDENTITY CASCADE;
  `);

  console.log("Database cleared.");

  // 1. Seed Users
  const [adminUser] = await db
    .insert(usersTable)
    .values({
      username: "admin",
      email: "admin@cyberlearn.local",
      passwordHash: "$2b$12$qbjiYdvW48uz1HFmF39uEuX4SrLjWi2H1vg0ViFJjJ8Nw4YtzFvcS", // admin123
      role: "ADMIN",
      totpEnabled: false,
      avatarColor: "#ef4444",
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  const [studentUser] = await db
    .insert(usersTable)
    .values({
      username: "student1",
      email: "student1@cyberlearn.local",
      passwordHash: "$2b$12$qbjiYdvW48uz1HFmF39uEuX4SrLjWi2H1vg0ViFJjJ8Nw4YtzFvcS", // admin123
      role: "STUDENT",
      totpEnabled: false,
      avatarColor: "#3b82f6",
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  console.log("Users seeded.");

  // 2. Seed Courses
  const [course1] = await db
    .insert(coursesTable)
    .values({
      title: "Introduction to Cybersecurity",
      description: "Learn the core foundations of cybersecurity, including the CIA Triad, network defense, security models, and common threat vectors.",
      thumbnailUrl: "/api/uploads/sample-thumbnail.png",
      category: "Foundations",
      difficulty: "BEGINNER",
      isPublished: true,
      createdById: adminUser?.id ?? 1,
    })
    .returning();

  const [course2] = await db
    .insert(coursesTable)
    .values({
      title: "OWASP Top 10 Web Vulnerabilities",
      description: "Master the most critical web application security risks defined by OWASP, complete with hands-on examples and mitigation strategies.",
      thumbnailUrl: "/api/uploads/sample-thumbnail.png",
      category: "Web Security",
      difficulty: "INTERMEDIATE",
      isPublished: true,
      createdById: adminUser?.id ?? 1,
    })
    .returning();

  console.log("Courses seeded.");

  // 3. Seed Modules
  const [mod1] = await db
    .insert(modulesTable)
    .values({
      courseId: course1.id,
      title: "Security Foundations",
      description: "Core tenets of security engineering and threat landscape basics.",
      orderIndex: 0,
    })
    .returning();

  const [mod2] = await db
    .insert(modulesTable)
    .values({
      courseId: course2.id,
      title: "Critical Web Vulnerabilities",
      description: "Deep dive into Injection, Broken Access Control, and XSS.",
      orderIndex: 0,
    })
    .returning();

  console.log("Modules seeded.");

  // 4. Seed Lessons
  const [lesson1] = await db
    .insert(lessonsTable)
    .values({
      moduleId: mod1.id,
      title: "What is Cybersecurity? (Intro Video)",
      type: "VIDEO",
      contentUrl: "/api/uploads/sample-lecture.mp4",
      durationSeconds: 10,
      orderIndex: 0,
    })
    .returning();

  const [lesson2] = await db
    .insert(lessonsTable)
    .values({
      moduleId: mod1.id,
      title: "The CIA Triad Concept Guide",
      type: "PDF",
      contentUrl: "/api/uploads/sample-guide.pdf",
      durationSeconds: 0,
      orderIndex: 1,
    })
    .returning();

  const [lesson3] = await db
    .insert(lessonsTable)
    .values({
      moduleId: mod1.id,
      title: "Security Foundations Assessment",
      type: "QUIZ",
      contentUrl: null,
      durationSeconds: 0,
      orderIndex: 2,
    })
    .returning();

  const [lesson4] = await db
    .insert(lessonsTable)
    .values({
      moduleId: mod2.id,
      title: "OWASP Top 10 Comprehensive Quiz",
      type: "QUIZ",
      contentUrl: null,
      durationSeconds: 0,
      orderIndex: 0,
    })
    .returning();

  // Seed 10 sample video lessons and 10 sample PDF lessons
  for (let i = 1; i <= 10; i++) {
    await db
      .insert(lessonsTable)
      .values({
        moduleId: mod1.id,
        title: `Sample Video Lecture ${i}`,
        type: "VIDEO",
        contentUrl: `/api/uploads/video-${i}.mp4`,
        durationSeconds: 120 + i * 30,
        orderIndex: i + 2,
      });

    await db
      .insert(lessonsTable)
      .values({
        moduleId: mod2.id,
        title: `Sample PDF Guide ${i}`,
        type: "PDF",
        contentUrl: `/api/uploads/pdf-${i}.pdf`,
        durationSeconds: 0,
        orderIndex: i + 1,
      });
  }

  console.log("Lessons seeded.");

  // 5. Seed Quizzes
  const [quiz1] = await db
    .insert(quizzesTable)
    .values({
      lessonId: lesson3.id,
      title: "Security Foundations Assessment",
      instructions: "Answer these questions to test your knowledge of basic security concepts. Minimum passing grade is 70%.",
      passPercent: 70,
      maxAttempts: 3,
      timeLimitSec: 600,
    })
    .returning();

  const [quiz2] = await db
    .insert(quizzesTable)
    .values({
      lessonId: lesson4.id,
      title: "OWASP Top 10 Comprehensive Quiz",
      instructions: "Validate your comprehension of the most common web application vulnerabilities. Minimum passing grade is 70%.",
      passPercent: 70,
      maxAttempts: 3,
      timeLimitSec: 900,
    })
    .returning();

  console.log("Quizzes seeded.");

  // 6. Seed Questions & Options
  // Quiz 1 Questions
  const [q1] = await db
    .insert(questionsTable)
    .values({
      quizId: quiz1.id,
      questionText: "What does the 'A' in the CIA triad stand for?",
      type: "MCQ",
      explanation: "The CIA Triad stands for Confidentiality, Integrity, and Availability. Therefore, 'A' stands for Availability.",
      orderIndex: 0,
      points: 1,
    })
    .returning();

  await db.insert(optionsTable).values([
    { questionId: q1.id, optionText: "Authentication", isCorrect: false },
    { questionId: q1.id, optionText: "Availability", isCorrect: true },
    { questionId: q1.id, optionText: "Authorization", isCorrect: false },
    { questionId: q1.id, optionText: "Association", isCorrect: false },
  ]);

  const [q2] = await db
    .insert(questionsTable)
    .values({
      quizId: quiz1.id,
      questionText: "Symmetric encryption uses two different keys for encryption and decryption.",
      type: "TRUEFALSE",
      explanation: "Symmetric encryption uses the same single key for both encryption and decryption. Asymmetric encryption uses public and private key pairs.",
      orderIndex: 1,
      points: 1,
    })
    .returning();

  await db.insert(optionsTable).values([
    { questionId: q2.id, optionText: "True", isCorrect: false },
    { questionId: q2.id, optionText: "False", isCorrect: true },
  ]);

  // Quiz 2 Questions
  const [q3] = await db
    .insert(questionsTable)
    .values({
      quizId: quiz2.id,
      questionText: "Which vulnerability occurs when untrusted user input is sent directly to an interpreter as part of a command or query?",
      type: "MCQ",
      explanation: "Injection vulnerabilities occur when hostile data is sent to an interpreter, leading to unauthorized command execution or data exposure.",
      orderIndex: 0,
      points: 1,
    })
    .returning();

  await db.insert(optionsTable).values([
    { questionId: q3.id, optionText: "Injection (e.g., SQLi, Command Injection)", isCorrect: true },
    { questionId: q3.id, optionText: "Cross-Site Scripting (XSS)", isCorrect: false },
    { questionId: q3.id, optionText: "Broken Object Level Authorization", isCorrect: false },
    { questionId: q3.id, optionText: "Security Misconfiguration", isCorrect: false },
  ]);

  console.log("Questions & Options seeded.");

  // 7. Seed Badges
  await db
    .insert(badgesTable)
    .values([
      {
        name: "Security Novice",
        description: "Earned by completing your very first course.",
        imageUrl: "/badges/novice.svg",
        criteriaType: "complete_course",
        criteriaValue: "1",
        colorHex: "#3b82f6",
      },
      {
        name: "Quiz Master",
        description: "Passed a course assessment on the first attempt.",
        imageUrl: "/badges/quizmaster.svg",
        criteriaType: "pass_quiz",
        criteriaValue: "1",
        colorHex: "#eab308",
      },
      {
        name: "Web Guardian",
        description: "Successfully completed the OWASP Top 10 vulnerabilities course.",
        imageUrl: "/badges/guardian.svg",
        criteriaType: "complete_course",
        criteriaValue: "2",
        colorHex: "#10b981",
      }
    ]);

  console.log("Badges seeded.");

  // 8. Seed Settings
  await db
    .insert(platformSettingsTable)
    .values([
      { key: "platformName", value: "CyberLearn LMS" },
      { key: "adminPanelEnabled", value: "true" },
      { key: "maintenanceMode", value: "false" },
    ])
    .onConflictDoNothing();

  console.log("Settings seeded.");

  // Verification check
  const allLessons = await db.select().from(lessonsTable);
  const videoCount = allLessons.filter(l => l.type === "VIDEO").length;
  const pdfCount = allLessons.filter(l => l.type === "PDF").length;
  console.log(`Verification Check: Found ${videoCount} video lessons and ${pdfCount} PDF lessons in DB.`);
  if (videoCount < 10 || pdfCount < 10) {
    throw new Error(`Verification failed! Expected at least 10 videos and 10 PDFs, got ${videoCount} videos and ${pdfCount} PDFs.`);
  }
  console.log("Verification check: PASSED!");

  console.log("Database seeded successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
