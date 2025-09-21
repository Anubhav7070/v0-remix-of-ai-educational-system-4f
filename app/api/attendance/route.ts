import { type NextRequest, NextResponse } from "next/server"

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  timestamp: Date
  confidence: number
  status: "present" | "absent" | "late"
  method: "facial_recognition" | "manual"
}

interface FaceRecognitionRequest {
  imageData: string
  sessionId: string
}

// In-memory attendance storage (in production, use a database)
const attendanceRecords: AttendanceRecord[] = []

// Student database with face encodings (in production, use a database)
const studentDatabase = new Map<
  string,
  {
    id: string
    name: string
    rollNumber: string
    faceEncoding: number[]
  }
>()

// Google Vision API configuration
const GOOGLE_VISION_API_KEY = "AIzaSyCvUuHMZLofTLvvnMSLpl-_k6s0KoCsgUw"
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`

export async function POST(request: NextRequest) {
  try {
    const body: FaceRecognitionRequest = await request.json()
    const { imageData, sessionId } = body

    if (!imageData) {
      return NextResponse.json({ success: false, error: "No image data provided" }, { status: 400 })
    }

    console.log("[v0] Processing face recognition request for session:", sessionId)

    // Extract base64 image data (remove data:image/jpeg;base64, prefix if present)
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, "")

    // Call Google Vision API for face detection
    const visionResponse = await fetch(VISION_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: "FACE_DETECTION",
                maxResults: 10,
              },
            ],
          },
        ],
      }),
    })

    if (!visionResponse.ok) {
      console.error("[v0] Google Vision API error:", await visionResponse.text())
      return NextResponse.json({ success: false, error: "Face detection failed" }, { status: 500 })
    }

    const visionData = await visionResponse.json()
    const faces = visionData.responses[0]?.faceAnnotations || []

    if (faces.length === 0) {
      return NextResponse.json({ success: false, error: "No faces detected in image" }, { status: 400 })
    }

    console.log("[v0] Detected", faces.length, "face(s) in image")

    // For now, simulate student recognition based on face detection
    // In a real implementation, you would compare face encodings with stored student data
    const recognizedStudent = await simulateStudentRecognition(faces[0])

    if (!recognizedStudent) {
      return NextResponse.json({ success: false, error: "Face not recognized" }, { status: 404 })
    }

    // Check if student already marked present today
    const today = new Date().toDateString()
    const alreadyPresent = attendanceRecords.find(
      (record) => record.studentId === recognizedStudent.id && record.timestamp.toDateString() === today,
    )

    if (alreadyPresent) {
      return NextResponse.json(
        {
          success: false,
          error: `${recognizedStudent.name} already marked present today`,
          record: alreadyPresent,
        },
        { status: 409 },
      )
    }

    // Create attendance record
    const newRecord: AttendanceRecord = {
      id: `record_${Date.now()}`,
      studentId: recognizedStudent.id,
      studentName: recognizedStudent.name,
      timestamp: new Date(),
      confidence: recognizedStudent.confidence,
      status: "present",
      method: "facial_recognition",
    }

    attendanceRecords.unshift(newRecord)

    console.log("[v0] Attendance recorded for:", recognizedStudent.name, "Confidence:", recognizedStudent.confidence)

    return NextResponse.json({
      success: true,
      record: newRecord,
      message: `${recognizedStudent.name} marked present successfully`,
    })
  } catch (error) {
    console.error("[v0] Face recognition error:", error)
    return NextResponse.json({ success: false, error: "Face recognition failed" }, { status: 500 })
  }
}

async function simulateStudentRecognition(faceData: any): Promise<{
  id: string
  name: string
  confidence: number
} | null> {
  // In a real implementation, you would:
  // 1. Extract face encoding from the detected face
  // 2. Compare with stored student face encodings
  // 3. Return the best match above a confidence threshold

  // For demo purposes, simulate recognition with mock students
  const mockStudents = [
    { id: "STU001", name: "Alice Johnson" },
    { id: "STU002", name: "Bob Smith" },
    { id: "STU003", name: "Carol Davis" },
    { id: "STU004", name: "David Wilson" },
    { id: "STU005", name: "Emma Brown" },
    { id: "STU006", name: "Frank Miller" },
    { id: "STU007", name: "Grace Taylor" },
    { id: "STU008", name: "Henry Davis" },
  ]

  // Use face detection confidence as a base for recognition confidence
  const detectionConfidence = faceData.detectionConfidence || 0.8
  const recognitionConfidence = Math.min(0.95, detectionConfidence + Math.random() * 0.1)

  // Only recognize if confidence is above threshold
  if (recognitionConfidence < 0.75) {
    return null
  }

  const randomStudent = mockStudents[Math.floor(Math.random() * mockStudents.length)]

  return {
    id: randomStudent.id,
    name: randomStudent.name,
    confidence: recognitionConfidence,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const studentId = searchParams.get("studentId")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let filteredRecords = [...attendanceRecords]

    if (date) {
      const targetDate = new Date(date)
      filteredRecords = filteredRecords.filter(
        (record) => record.timestamp.toDateString() === targetDate.toDateString(),
      )
    }

    if (studentId) {
      filteredRecords = filteredRecords.filter((record) => record.studentId === studentId)
    }

    const paginatedRecords = filteredRecords.slice(0, limit)

    return NextResponse.json({
      success: true,
      records: paginatedRecords,
      total: filteredRecords.length,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch attendance records" }, { status: 500 })
  }
}
