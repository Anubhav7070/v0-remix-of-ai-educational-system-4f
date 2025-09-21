"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Upload, Scan, User, Clock, Zap, UserPlus, CheckCircle, XCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { faceRecognitionService } from "@/lib/face-recognition-utils"

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  timestamp: string
  confidence: number
  subject: string
  status: "present" | "absent" | "late"
  method: "facial_recognition" | "manual"
}

interface EnhancedFaceRecognitionCameraProps {
  isScanning: boolean
  onFaceDetected: (studentData: { id: string; name: string; confidence: number; subject: string }) => void
  recentRecords: AttendanceRecord[]
}

export function EnhancedFaceRecognitionCamera({
  isScanning,
  onFaceDetected,
  recentRecords,
}: EnhancedFaceRecognitionCameraProps) {
  const [detectionStatus, setDetectionStatus] = useState<"idle" | "detecting" | "recognized" | "error">("idle")
  const [currentDetection, setCurrentDetection] = useState<{
    name: string
    confidence: number
    id: string
  } | null>(null)
  const [selectedSubject, setSelectedSubject] = useState("Mathematics")
  const [isRegistering, setIsRegistering] = useState(false)
  const [newStudentName, setNewStudentName] = useState("")
  const [newStudentEmail, setNewStudentEmail] = useState("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize camera
  useEffect(() => {
    if (isScanning && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        })
        .catch((err) => {
          console.error("[v0] Camera access error:", err)
          toast({
            title: "Camera Error",
            description: "Could not access camera. Please check permissions.",
            variant: "destructive",
          })
        })
    } else if (!isScanning && videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }, [isScanning])

  // Auto-capture faces when scanning
  useEffect(() => {
    if (!isScanning) return

    const interval = setInterval(() => {
      captureAndAnalyze()
    }, 3000) // Capture every 3 seconds

    return () => clearInterval(interval)
  }, [isScanning, selectedSubject])

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.videoWidth === 0) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0)

    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8)

    await analyzeImage(imageData)
  }, [selectedSubject])

  const analyzeImage = async (imageData: string) => {
    try {
      setDetectionStatus("detecting")
      console.log("[v0] Analyzing image for face recognition")

      let faceDescriptor: number[] | null = null

      if (faceRecognitionService) {
        try {
          // Create image element from base64 data
          const img = new Image()
          img.crossOrigin = "anonymous"

          await new Promise((resolve, reject) => {
            img.onload = async () => {
              try {
                const descriptor = await faceRecognitionService.extractFaceDescriptor(img)
                if (descriptor && descriptor.length > 0) {
                  faceDescriptor = Array.from(descriptor)
                  console.log("[v0] Face descriptor extracted: SUCCESS")
                } else {
                  console.log("[v0] Face descriptor extraction: NO FACE DETECTED")
                }
                resolve(true)
              } catch (error) {
                console.error("[v0] Face descriptor extraction error:", error)
                resolve(false) // Don't reject, just continue without descriptor
              }
            }
            img.onerror = () => {
              console.error("[v0] Image loading error")
              resolve(false)
            }
            img.src = imageData
          })
        } catch (error) {
          console.error("[v0] Image processing error:", error)
        }
      }

      if (!faceDescriptor || faceDescriptor.length === 0) {
        setDetectionStatus("error")
        setTimeout(() => {
          setDetectionStatus("idle")
        }, 1000)
        return
      }

      const response = await fetch("/api/face-recognition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "detect_face",
          imageData,
          subject: selectedSubject,
          faceDescriptor,
        }),
      })

      const result = await response.json()
      console.log("[v0] Face recognition result:", result.message || result.error)

      if (result.success) {
        setCurrentDetection({
          name: result.student.name,
          confidence: result.confidence,
          id: result.student.id,
        })
        setDetectionStatus("recognized")

        onFaceDetected({
          id: result.student.id,
          name: result.student.name,
          confidence: result.confidence,
          subject: selectedSubject,
        })

        toast({
          title: "Attendance Recorded",
          description: `${result.student.name} marked present for ${selectedSubject}`,
        })

        setTimeout(() => {
          setDetectionStatus("idle")
          setCurrentDetection(null)
        }, 3000)
      } else {
        setDetectionStatus("error")
        console.log("[v0] Detection failed:", result.message || result.error)
        setTimeout(() => {
          setDetectionStatus("idle")
        }, 1500)
      }
    } catch (error) {
      console.error("[v0] Face analysis error:", error)
      setDetectionStatus("error")
      setTimeout(() => {
        setDetectionStatus("idle")
      }, 1500)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target?.result as string
      analyzeImage(imageData)
    }
    reader.readAsDataURL(file)
  }

  const registerNewStudent = async () => {
    if (!newStudentName.trim()) {
      toast({
        title: "Registration Error",
        description: "Please enter student name",
        variant: "destructive",
      })
      return
    }

    try {
      // Capture current frame for registration
      if (!videoRef.current || !canvasRef.current) {
        toast({
          title: "Registration Error",
          description: "Camera not available",
          variant: "destructive",
        })
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      const imageData = canvas.toDataURL("image/jpeg", 0.8)

      let faceDescriptor: number[] | null = null

      if (faceRecognitionService) {
        try {
          const img = new Image()
          img.crossOrigin = "anonymous"

          await new Promise((resolve, reject) => {
            img.onload = async () => {
              try {
                const descriptor = await faceRecognitionService.extractFaceDescriptor(img)
                if (descriptor && descriptor.length > 0) {
                  faceDescriptor = Array.from(descriptor)
                  console.log("[v0] Face descriptor for registration: SUCCESS")
                }
                resolve(true)
              } catch (error) {
                console.error("[v0] Registration face descriptor error:", error)
                resolve(false)
              }
            }
            img.onerror = () => resolve(false)
            img.src = imageData
          })
        } catch (error) {
          console.error("[v0] Registration image processing error:", error)
        }
      }

      if (!faceDescriptor || faceDescriptor.length === 0) {
        toast({
          title: "Registration Error",
          description: "No face detected in the image. Please ensure your face is clearly visible.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/face-recognition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "register_student",
          studentData: {
            name: newStudentName,
            email: newStudentEmail,
            rollNumber: `STU${Date.now().toString().slice(-6)}`, // Generate roll number for registration
          },
          imageData,
          faceDescriptor,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Registration Successful",
          description: `${newStudentName} has been registered successfully`,
        })
        setNewStudentName("")
        setNewStudentEmail("")
        setIsRegistering(false)
      } else {
        toast({
          title: "Registration Failed",
          description: result.error || "Failed to register student",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Registration error:", error)
      toast({
        title: "Registration Error",
        description: "Failed to register student. Please try again.",
        variant: "destructive",
      })
    }
  }

  const subjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "History",
    "Geography",
    "Computer Science",
    "Art",
    "Music",
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Camera Feed */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Enhanced Face Recognition Camera
            </CardTitle>
            <CardDescription>
              AI-powered facial recognition with advanced face descriptor matching for accurate attendance tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Subject Selection */}
            <div className="mb-4 flex items-center gap-4">
              <Label htmlFor="subject">Subject:</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {/* Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${isScanning ? "block" : "hidden"}`}
              />

              {/* Hidden canvas for image capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Placeholder when not scanning */}
              {!isScanning && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Camera Inactive</p>
                    <p className="text-sm opacity-75">Start scanning to begin face recognition</p>
                  </div>
                </div>
              )}

              {/* Detection Overlay */}
              {detectionStatus !== "idle" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="bg-black/80 text-white p-6 rounded-lg text-center">
                    {detectionStatus === "detecting" && (
                      <div className="space-y-3">
                        <Scan className="w-8 h-8 mx-auto animate-pulse text-primary" />
                        <p>Analyzing face with AI...</p>
                      </div>
                    )}
                    {detectionStatus === "recognized" && currentDetection && (
                      <div className="space-y-3">
                        <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
                        <div>
                          <p className="font-semibold text-lg">{currentDetection.name}</p>
                          <p className="text-sm text-green-400">
                            Confidence: {(currentDetection.confidence * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-300">ID: {currentDetection.id}</p>
                        </div>
                      </div>
                    )}
                    {detectionStatus === "error" && (
                      <div className="space-y-3">
                        <XCircle className="w-8 h-8 mx-auto text-red-500" />
                        <p>Detection failed or no face found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Detection Frame */}
              {isScanning && (
                <div className="absolute inset-4 border-2 border-primary/50 rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary" />
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Image
              </Button>

              <Button onClick={() => setIsRegistering(!isRegistering)} variant="secondary" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Register New Student
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4" />
                Advanced AI Face Recognition
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            {/* Student Registration Form */}
            {isRegistering && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-3">Register New Student</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="studentName">Student Name *</Label>
                    <Input
                      id="studentName"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="Enter student full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="studentEmail">Email (Optional)</Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                      placeholder="student@school.edu"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={registerNewStudent} className="gap-2">
                      <UserPlus className="w-4 w-4" />
                      Register Student
                    </Button>
                    <Button onClick={() => setIsRegistering(false)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Detections */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Detections
            </CardTitle>
            <CardDescription>Latest attendance records from facial recognition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecords.length > 0 ? (
                recentRecords.slice(0, 8).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{record.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.timestamp).toLocaleTimeString()} - {record.subject}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          record.status === "present"
                            ? "default"
                            : record.status === "late"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {record.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{(record.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No detections yet</p>
                  <p className="text-sm">Start scanning to see results</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
