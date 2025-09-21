"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Users, CheckCircle, XCircle, Clock, Scan, UserCheck, AlertTriangle, Brain } from "lucide-react"
import { EnhancedFaceRecognitionCamera } from "@/components/enhanced-face-recognition-camera"
import { AttendanceHistory } from "@/components/attendance-history"
import { StudentRegistrationSystem } from "@/components/student-registration-system"
import { AIAttendanceAnalysis } from "@/components/ai-attendance-analysis"
import { toast } from "@/hooks/use-toast"

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  timestamp: Date
  confidence: number
  status: "present" | "absent" | "late"
  method: "facial_recognition" | "manual"
  subject?: string
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

export function AttendanceSystem() {
  const [isScanning, setIsScanning] = useState(false)
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    loadAttendanceData()
    loadStudentData()
  }, [])

  const loadAttendanceData = async () => {
    try {
      const response = await fetch("/api/face-recognition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_attendance",
        }),
      })

      const result = await response.json()
      if (result.success && result.records.length > 0) {
        const formattedRecords = result.records.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp),
        }))
        setAttendanceRecords(formattedRecords)
      }
    } catch (error) {
      console.error("[v0] Failed to load attendance data:", error)
    }
  }

  const loadStudentData = async () => {
    try {
      const response = await fetch("/api/face-recognition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_students",
        }),
      })

      const result = await response.json()
      if (result.success && result.students.length > 0) {
        setStudents(result.students)
      }
    } catch (error) {
      console.error("[v0] Failed to load student data:", error)
    }
  }

  const startSession = () => {
    const sessionId = `session_${Date.now()}`
    setCurrentSession(sessionId)
    setIsScanning(true)
    console.log("[v0] Started attendance session:", sessionId)

    toast({
      title: "Session Started",
      description: `Attendance session ${sessionId.slice(-6)} is now active`,
    })
  }

  const stopSession = () => {
    setIsScanning(false)
    const sessionId = currentSession
    setCurrentSession(null)
    console.log("[v0] Stopped attendance session:", sessionId)

    toast({
      title: "Session Ended",
      description: "Attendance session has been stopped",
    })
  }

  const handleFaceDetected = useCallback(
    (studentData: { id: string; name: string; confidence: number; subject?: string }) => {
      const newRecord: AttendanceRecord = {
        id: `record_${Date.now()}`,
        studentId: studentData.id,
        studentName: studentData.name,
        timestamp: new Date(),
        confidence: studentData.confidence,
        status: "present",
        method: "facial_recognition",
        subject: studentData.subject || "General",
      }

      setAttendanceRecords((prev) => [newRecord, ...prev])

      // Update student's last seen and total attendance
      setStudents((prev) =>
        prev.map((student) =>
          student.id === studentData.id
            ? {
                ...student,
                lastSeen: new Date().toISOString().split("T")[0],
                totalAttendance: student.totalAttendance + 1,
              }
            : student,
        ),
      )

      console.log("[v0] Face detected and attendance recorded:", studentData.name)
    },
    [],
  )

  const todayRecords = attendanceRecords.filter(
    (record) => record.timestamp.toDateString() === new Date().toDateString(),
  )

  const presentCount = todayRecords.filter((r) => r.status === "present").length
  const lateCount = todayRecords.filter((r) => r.status === "late").length
  const totalStudents = students.length || 25 // Use actual student count or fallback

  const getEnhancedStats = () => {
    const totalRecords = attendanceRecords.length
    const avgConfidence =
      totalRecords > 0 ? (attendanceRecords.reduce((sum, r) => sum + r.confidence, 0) / totalRecords) * 100 : 0

    const subjectStats = attendanceRecords.reduce(
      (acc, record) => {
        const subject = record.subject || "General"
        acc[subject] = (acc[subject] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const topSubject = Object.entries(subjectStats).sort(([, a], [, b]) => b - a)[0]

    return {
      totalRecords,
      avgConfidence,
      topSubject: topSubject ? topSubject[0] : "None",
      uniqueStudents: new Set(attendanceRecords.map((r) => r.studentId)).size,
    }
  }

  const enhancedStats = getEnhancedStats()

  return (
    <div className="space-y-6">
      {/* Session Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Enhanced Attendance Session Control
          </CardTitle>
          <CardDescription>
            Start or stop AI-powered facial recognition attendance tracking with Google Vision API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            {!isScanning ? (
              <Button onClick={startSession} className="gap-2">
                <Scan className="w-4 h-4" />
                Start AI Attendance Session
              </Button>
            ) : (
              <Button onClick={stopSession} variant="destructive" className="gap-2">
                <XCircle className="w-4 h-4" />
                Stop Session
              </Button>
            )}
            {currentSession && (
              <Badge variant="default" className="gap-1">
                <Clock className="w-3 h-3" />
                Session: {currentSession.slice(-6)}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              {todayRecords.length}/{totalStudents} Recorded Today
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Brain className="w-3 h-3" />
              AI-Powered Recognition
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Present Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{presentCount}</div>
            <Progress value={(presentCount / totalStudents) * 100} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {((presentCount / totalStudents) * 100).toFixed(1)}% attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Late Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{lateCount}</div>
            <Progress value={(lateCount / totalStudents) * 100} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {((lateCount / totalStudents) * 100).toFixed(1)}% late rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Absent Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{totalStudents - todayRecords.length}</div>
            <Progress value={((totalStudents - todayRecords.length) / totalStudents) * 100} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {(((totalStudents - todayRecords.length) / totalStudents) * 100).toFixed(1)}% absent rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{enhancedStats.avgConfidence.toFixed(1)}%</div>
            <Progress value={enhancedStats.avgConfidence} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">Average recognition confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{enhancedStats.totalRecords}</p>
              </div>
              <UserCheck className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Students</p>
                <p className="text-2xl font-bold">{enhancedStats.uniqueStudents}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Subject</p>
                <p className="text-2xl font-bold">{enhancedStats.topSubject}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Tabs defaultValue="camera" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="camera">Live Camera</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
          <TabsTrigger value="students">Student Management</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="register">Register Students</TabsTrigger>
        </TabsList>

        <TabsContent value="camera">
          <EnhancedFaceRecognitionCamera
            isScanning={isScanning}
            onFaceDetected={handleFaceDetected}
            recentRecords={todayRecords.slice(0, 10)}
          />
        </TabsContent>

        <TabsContent value="history">
          <AttendanceHistory records={attendanceRecords} />
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Student Database Management
              </CardTitle>
              <CardDescription>Latest attendance records from facial recognition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {students.length > 0 ? (
                  <div className="grid gap-4">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <h4 className="font-semibold">{student.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {student.rollNumber} • Grade {student.grade}-{student.section}
                              </p>
                            </div>
                            <Badge variant={student.status === "active" ? "default" : "secondary"}>
                              {student.status}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <p>Email: {student.email}</p>
                            <p>Total Attendance: {student.totalAttendance}</p>
                            <p>Last Seen: {student.lastSeen}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No students registered</p>
                    <p>Use the "Register Students" tab to add students to the system</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <AIAttendanceAnalysis
            attendanceRecords={attendanceRecords.map((record) => ({
              ...record,
              timestamp: record.timestamp.toISOString(),
              subject: record.subject || "General",
            }))}
            students={students}
          />
        </TabsContent>

        <TabsContent value="register">
          <StudentRegistrationSystem />
        </TabsContent>
      </Tabs>
    </div>
  )
}
