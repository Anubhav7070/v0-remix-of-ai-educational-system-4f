import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  timestamp: string
  confidence: number
  subject: string
  status: "present" | "late" | "absent"
  method: "facial_recognition" | "manual"
}

interface Student {
  id: string
  name: string
  email: string
  grade: string
  section: string
  rollNumber: string
  totalAttendance: number
  lastSeen: string
  status: "active" | "inactive"
}

export async function POST(request: NextRequest) {
  try {
    const { action, data, analysisType, timeRange, subject } = await request.json()

    console.log("[v0] AI Analysis API called with action:", action)

    if (!process.env.GROQ_API_KEY) {
      console.error("[v0] GROQ_API_KEY is missing")
      return NextResponse.json({ error: "AI service not configured. GROQ_API_KEY is missing." }, { status: 500 })
    }

    switch (action) {
      case "analyze_attendance":
        return await analyzeAttendanceData(data, analysisType, timeRange, subject)
      case "generate_insights":
        return await generateAttendanceInsights(data)
      case "predict_trends":
        return await predictAttendanceTrends(data)
      case "generate_report":
        return await generateAttendanceReport(data, timeRange, subject)
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] AI Analysis error:", error)
    return NextResponse.json(
      {
        error: "AI analysis failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function analyzeAttendanceData(
  attendanceData: AttendanceRecord[],
  analysisType: string,
  timeRange: string,
  subject?: string,
) {
  try {
    console.log("[v0] Analyzing attendance data with Groq AI")

    const prompt = `
    You are an AI assistant specialized in educational data analysis. Analyze the following attendance data and provide insights.

    Analysis Type: ${analysisType}
    Time Range: ${timeRange}
    Subject: ${subject || "All subjects"}

    Attendance Data:
    ${JSON.stringify(attendanceData, null, 2)}

    Please provide a comprehensive analysis including:
    1. Overall attendance patterns and trends
    2. Individual student performance insights
    3. Subject-wise attendance comparison (if applicable)
    4. Identification of at-risk students
    5. Recommendations for improvement
    6. Statistical summary with key metrics

    Format your response as a structured analysis with clear sections and actionable insights.
    `

    const { text } = await generateText({
      model: groq("llama-3.1-70b-versatile"),
      prompt,
      maxTokens: 2000,
      temperature: 0.3,
    })

    console.log("[v0] AI analysis completed successfully")

    return NextResponse.json({
      success: true,
      analysis: text,
      metadata: {
        recordsAnalyzed: attendanceData.length,
        analysisType,
        timeRange,
        subject,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[v0] Attendance analysis error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze attendance data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function generateAttendanceInsights(data: { students: Student[]; attendance: AttendanceRecord[] }) {
  try {
    console.log("[v0] Generating attendance insights with AI")

    const prompt = `
    As an educational data analyst, generate actionable insights from this attendance and student data:

    Students: ${JSON.stringify(data.students, null, 2)}
    Attendance Records: ${JSON.stringify(data.attendance, null, 2)}

    Provide insights on:
    1. Top performing students (highest attendance rates)
    2. Students needing attention (low attendance or declining patterns)
    3. Subject-wise performance analysis
    4. Attendance patterns by time/day
    5. Face recognition system effectiveness
    6. Specific recommendations for teachers and administrators

    Format as actionable bullet points with specific data points and percentages.
    `

    const { text } = await generateText({
      model: groq("llama-3.1-70b-versatile"),
      prompt,
      maxTokens: 1500,
      temperature: 0.4,
    })

    return NextResponse.json({
      success: true,
      insights: text,
      metadata: {
        studentsAnalyzed: data.students.length,
        recordsAnalyzed: data.attendance.length,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[v0] Insights generation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate insights",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function predictAttendanceTrends(attendanceData: AttendanceRecord[]) {
  try {
    console.log("[v0] Predicting attendance trends with AI")

    const prompt = `
    Analyze the following attendance data and predict future trends:

    ${JSON.stringify(attendanceData, null, 2)}

    Based on this data, provide:
    1. Predicted attendance trends for the next month
    2. Students at risk of poor attendance
    3. Seasonal or weekly patterns identified
    4. Recommendations to improve attendance rates
    5. Early warning indicators for attendance issues
    6. Success factors for high-performing students

    Focus on predictive insights and preventive measures.
    `

    const { text } = await generateText({
      model: groq("llama-3.1-70b-versatile"),
      prompt,
      maxTokens: 1500,
      temperature: 0.3,
    })

    return NextResponse.json({
      success: true,
      predictions: text,
      metadata: {
        recordsAnalyzed: attendanceData.length,
        predictionDate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[v0] Trend prediction error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to predict trends",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function generateAttendanceReport(
  data: { students: Student[]; attendance: AttendanceRecord[] },
  timeRange: string,
  subject?: string,
) {
  try {
    console.log("[v0] Generating comprehensive attendance report")

    const prompt = `
    Generate a comprehensive attendance report for ${timeRange}${subject ? ` for ${subject}` : ""}:

    Student Data: ${JSON.stringify(data.students, null, 2)}
    Attendance Records: ${JSON.stringify(data.attendance, null, 2)}

    Create a detailed report including:
    1. Executive Summary with key statistics
    2. Overall attendance rate and trends
    3. Individual student performance breakdown
    4. Subject-wise analysis (if applicable)
    5. Face recognition system performance metrics
    6. Identified issues and concerns
    7. Recommendations for improvement
    8. Action items for teachers and administrators

    Format as a professional educational report with clear sections and data-driven insights.
    `

    const { text } = await generateText({
      model: groq("llama-3.1-70b-versatile"),
      prompt,
      maxTokens: 2500,
      temperature: 0.2,
    })

    return NextResponse.json({
      success: true,
      report: text,
      metadata: {
        reportType: "Comprehensive Attendance Report",
        timeRange,
        subject: subject || "All Subjects",
        studentsIncluded: data.students.length,
        recordsAnalyzed: data.attendance.length,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[v0] Report generation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
