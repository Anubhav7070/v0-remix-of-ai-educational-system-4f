import { type NextRequest, NextResponse } from "next/server"

interface StudentRecord {
  id: string
  name: string
  email: string
  rollNumber: string
  faceDescriptor: number[]
  registrationDate: string
  totalAttendance: number
  lastSeen: string
  photo?: string
}

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  rollNumber: string
  timestamp: string
  confidence: number
  subject: string
  status: "present" | "late" | "absent"
  method: "facial_recognition" | "manual"
  sessionId: string
}

// In-memory storage (in production, use a real database)
let studentDatabase: StudentRecord[] = []
let attendanceRecords: AttendanceRecord[] = []

export async function POST(request: NextRequest) {
  try {
    const { action, imageData, studentData, subject, sessionId, faceDescriptor } = await request.json()

    console.log("[v0] Face recognition API called with action:", action)

    switch (action) {
      case "detect_face":
        return await detectFace(imageData, subject, sessionId, faceDescriptor)
      case "register_student":
        return await registerStudent(studentData, imageData, faceDescriptor)
      case "get_attendance":
        return await getAttendanceRecords()
      case "get_students":
        return await getStudentDatabase()
      case "clear_data":
        return await clearAllData()
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Face recognition error:", error)
    return NextResponse.json(
      {
        error: "Face recognition failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function detectFace(imageData: string, subject = "General", sessionId: string, faceDescriptor?: number[]) {
  try {
    console.log("[v0] Starting face detection with face descriptor matching")
    console.log("[v0] Current student database size:", studentDatabase.length)

    if (!faceDescriptor || faceDescriptor.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No face descriptor provided for matching",
      })
    }

    // Find the best matching student based on face descriptor similarity
    let bestMatch: StudentRecord | null = null
    let bestSimilarity = 0
    const threshold = 0.4 // Minimum similarity threshold

    console.log("[v0] Comparing face descriptor against", studentDatabase.length, "registered students")

    for (const student of studentDatabase) {
      if (student.faceDescriptor && student.faceDescriptor.length > 0) {
        const similarity = calculateCosineSimilarity(faceDescriptor, student.faceDescriptor)
        console.log(`[v0] Similarity with ${student.name} (${student.rollNumber}): ${similarity.toFixed(3)}`)

        if (similarity > bestSimilarity && similarity > threshold) {
          bestSimilarity = similarity
          bestMatch = student
        }
      }
    }

    console.log("[v0] Best match:", bestMatch ? `${bestMatch.name} (${bestSimilarity.toFixed(3)})` : "None")

    if (!bestMatch) {
      return NextResponse.json({
        success: false,
        message: `No matching student found (threshold: ${threshold}). Please register first or try again.`,
        confidence: 0,
        debug: {
          studentsInDatabase: studentDatabase.length,
          threshold,
          bestSimilarity,
        },
      })
    }

    const confidence = Math.min(bestSimilarity * 100, 95) // Convert to percentage, cap at 95%

    // Check if student already marked present today for this subject
    const today = new Date().toDateString()
    const existingRecord = attendanceRecords.find(
      (record) =>
        record.studentId === bestMatch!.id &&
        new Date(record.timestamp).toDateString() === today &&
        record.subject === subject,
    )

    if (existingRecord) {
      return NextResponse.json({
        success: false,
        message: `${bestMatch.name} (${bestMatch.rollNumber}) already marked present for ${subject} today`,
        student: bestMatch,
        confidence,
        duplicate: true,
      })
    }

    // Create attendance record
    const attendanceRecord: AttendanceRecord = {
      id: `att_${Date.now()}`,
      studentId: bestMatch.id,
      studentName: bestMatch.name,
      rollNumber: bestMatch.rollNumber,
      timestamp: new Date().toISOString(),
      confidence,
      subject,
      status: confidence > 80 ? "present" : "late",
      method: "facial_recognition",
      sessionId: sessionId || `session_${Date.now()}`,
    }

    attendanceRecords.unshift(attendanceRecord)

    // Update student's last seen and attendance count
    const studentIndex = studentDatabase.findIndex((s) => s.id === bestMatch!.id)
    if (studentIndex !== -1) {
      studentDatabase[studentIndex].lastSeen = new Date().toISOString().split("T")[0]
      studentDatabase[studentIndex].totalAttendance += 1
    }

    console.log(`[v0] Attendance recorded for: ${bestMatch.name} with ${confidence.toFixed(1)}% confidence`)

    return NextResponse.json({
      success: true,
      message: `Attendance recorded for ${bestMatch.name} (${bestMatch.rollNumber})`,
      student: bestMatch,
      confidence,
      attendanceRecord,
      similarity: bestSimilarity,
    })
  } catch (error) {
    console.error("[v0] Face detection error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Face detection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function registerStudent(studentData: any, imageData: string, faceDescriptor?: number[]) {
  try {
    console.log("[v0] Registering new student:", studentData.name)

    if (!faceDescriptor || faceDescriptor.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Face descriptor is required for registration",
        },
        { status: 400 },
      )
    }

    // Check if student with same roll number already exists
    const existingStudent = studentDatabase.find((s) => s.rollNumber === studentData.rollNumber)
    if (existingStudent) {
      return NextResponse.json(
        {
          success: false,
          error: `Student with roll number ${studentData.rollNumber} already exists`,
        },
        { status: 400 },
      )
    }

    const newStudent: StudentRecord = {
      id: `STU_${Date.now()}`,
      name: studentData.name,
      email: studentData.email || `${studentData.name.toLowerCase().replace(/\s+/g, ".")}@school.edu`,
      rollNumber: studentData.rollNumber,
      faceDescriptor,
      registrationDate: new Date().toISOString().split("T")[0],
      totalAttendance: 0,
      lastSeen: "Never",
      photo: imageData,
    }

    studentDatabase.push(newStudent)

    console.log("[v0] Student registered successfully:", newStudent.id)

    return NextResponse.json({
      success: true,
      message: `Student ${studentData.name} (${studentData.rollNumber}) registered successfully`,
      student: newStudent,
    })
  } catch (error) {
    console.error("[v0] Student registration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Student registration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function getAttendanceRecords() {
  return NextResponse.json({
    success: true,
    records: attendanceRecords,
    totalRecords: attendanceRecords.length,
  })
}

async function getStudentDatabase() {
  return NextResponse.json({
    success: true,
    students: studentDatabase,
    totalStudents: studentDatabase.length,
  })
}

async function clearAllData() {
  studentDatabase = []
  attendanceRecords = []

  return NextResponse.json({
    success: true,
    message: "All data cleared successfully",
  })
}
