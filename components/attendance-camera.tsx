"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Upload, Scan, User, Clock, Zap, UserCheck, CheckCircle, XCircle } from "lucide-react"
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

interface AttendanceCameraProps {
  isScanning: boolean
  onFaceDetected: (studentData: { id: string; name: string; confidence: number; subject?: string }) => void
  recentRecords: AttendanceRecord[]
}

export function AttendanceCamera({ isScanning, onFaceDetected, recentRecords }: AttendanceCameraProps) {
  const [detectionStatus, setDetectionStatus] = useState<"idle" | "detecting" | "recognized" | "error">("idle")
  const [currentDetection, setCurrentDetection] = useState<{
    name: string
    confidence: number
    id: string
  } | null>(null)
  const [selectedSubject, setSelectedSubject] = useState("Mathematics")
  const [autoScanInterval, setAutoScanInterval] = useState(3000) // 3 seconds
  const [detectionSensitivity, setDetectionSensitivity] = useState(0.8) // 80% confidence threshold
  const [continuousMode, setContinuousMode] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize camera when scanning starts
  useEffect(() => {
    if (isScanning && videoRef.current) {
      startCamera()
    } else if (!isScanning && videoRef.current?.srcObject) {
      stopCamera()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isScanning])

  // Auto-capture faces when scanning
  useEffect(() => {
    if (!isScanning || !continuousMode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      if (detectionStatus === "idle") {
        captureAndAnalyze()
      }
    }, autoScanInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isScanning, continuousMode, autoScanInterval, detectionStatus])

  const startCamera = async () => {
    try {
      console.log("[v0] Starting camera for face detection")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        console.log("[v0] Camera stream started successfully")
      }
    } catch (error) {
      console.error("[v0] Camera access error:", error)
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
      console.log("[v0] Camera stream stopped")
    }
    setDetectionStatus("idle")
    setCurrentDetection(null)
  }

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || detectionStatus !== "idle") return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.videoWidth === 0) return

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0)

      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.8)

      await analyzeImage(imageData)
    } catch (error) {
      console.error("[v0] Capture error:", error)
    }
  }, [detectionStatus, selectedSubject, detectionSensitivity])

  const analyzeImage = async (imageData: string) => {
    try {
      setDetectionStatus("detecting")
      console.log("[v0] Analyzing image for face recognition")

      const response = await fetch("/api/face-recognition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "detect_face",
          imageData,
          subject: selectedSubject,
          sensitivity: detectionSensitivity,
        }),
      })

      const result = await response.json()
      console.log("[v0] Face recognition result:", result)

      if (result.success && result.confidence >= detectionSensitivity) {
        setCurrentDetection({
          name: result.student.name,
          confidence: result.confidence,
          id: result.student.id,
        })
        setDetectionStatus("recognized")

        // Call parent callback
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

        // Reset after 3 seconds
        setTimeout(() => {
          setDetectionStatus("idle")
          setCurrentDetection(null)
        }, 3000)
      } else {
        setDetectionStatus("error")
        if (result.message && !result.message.includes("already marked")) {
          console.log("[v0] Detection info:", result.message)
        }
        // Reset quickly for continuous scanning
        setTimeout(() => {
          setDetectionStatus("idle")
        }, 1000)
      }
    } catch (error) {
      console.error("[v0] Face analysis error:", error)
      setDetectionStatus("error")
      setTimeout(() => {
        setDetectionStatus("idle")
      }, 1000)
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

  const manualCapture = () => {
    if (detectionStatus === "idle") {
      captureAndAnalyze()
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
    "Physical Education",
    "General Assembly",
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Camera Feed */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Real-time Face Recognition Camera
            </CardTitle>
            <CardDescription>
              Advanced AI-powered facial recognition with Google Vision API for accurate attendance tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Controls */}
            <div className="mb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
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
                <div>
                  <Label htmlFor="sensitivity">Detection Sensitivity</Label>
                  <Select
                    value={detectionSensitivity.toString()}
                    onValueChange={(value) => setDetectionSensitivity(Number.parseFloat(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.6">Low (60%)</SelectItem>
                      <SelectItem value="0.7">Medium (70%)</SelectItem>
                      <SelectItem value="0.8">High (80%)</SelectItem>
                      <SelectItem value="0.9">Very High (90%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="continuousMode"
                    checked={continuousMode}
                    onChange={(e) => setContinuousMode(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="continuousMode">Continuous Scanning</Label>
                </div>
                {continuousMode && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="interval">Interval (ms):</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={autoScanInterval}
                      onChange={(e) => setAutoScanInterval(Number.parseInt(e.target.value) || 3000)}
                      min="1000"
                      max="10000"
                      step="500"
                      className="w-24"
                    />
                  </div>
                )}
              </div>
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
              {detectionStatus !== "idle" && isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="bg-black/80 text-white p-6 rounded-lg text-center backdrop-blur-sm">
                    {detectionStatus === "detecting" && (
                      <div className="space-y-3">
                        <Scan className="w-8 h-8 mx-auto animate-pulse text-primary" />
                        <p>Analyzing with Google Vision AI...</p>
                        <div className="w-32 h-1 bg-gray-600 rounded-full mx-auto">
                          <div className="h-1 bg-primary rounded-full animate-pulse w-3/4"></div>
                        </div>
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
                          <p className="text-xs text-gray-300">Subject: {selectedSubject}</p>
                        </div>
                      </div>
                    )}
                    {detectionStatus === "error" && (
                      <div className="space-y-3">
                        <XCircle className="w-8 h-8 mx-auto text-red-500" />
                        <p className="text-sm">No face detected or low confidence</p>
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

              {/* Status Indicator */}
              {isScanning && (
                <div className="absolute top-4 left-4">
                  <Badge variant="default" className="gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live • {selectedSubject}
                  </Badge>
                </div>
              )}

              {/* Detection Stats */}
              {isScanning && (
                <div className="absolute top-4 right-4 space-y-1">
                  <Badge variant="outline" className="bg-black/50 text-white border-white/20">
                    Sensitivity: {(detectionSensitivity * 100).toFixed(0)}%
                  </Badge>
                  {continuousMode && (
                    <Badge variant="outline" className="bg-black/50 text-white border-white/20">
                      Auto: {autoScanInterval}ms
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4 flex-wrap">
              {!continuousMode && (
                <Button onClick={manualCapture} disabled={!isScanning || detectionStatus !== "idle"} className="gap-2">
                  <Scan className="w-4 h-4" />
                  Manual Capture
                </Button>
              )}

              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Image
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4" />
                Google Vision AI • Real-time Detection
              </div>

              <Badge variant="secondary" className="gap-1">
                <UserCheck className="w-3 h-3" />
                {recentRecords.filter((r) => r.timestamp.toDateString() === new Date().toDateString()).length} Today
              </Badge>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Detections */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Live Detection Feed
            </CardTitle>
            <CardDescription>Real-time attendance records from facial recognition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentRecords.length > 0 ? (
                recentRecords.slice(0, 10).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{record.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.timestamp.toLocaleTimeString()} • {record.subject || "General"}
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
                  <p className="text-sm">Start scanning to see live results</p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {recentRecords.filter((r) => r.timestamp.toDateString() === new Date().toDateString()).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {recentRecords.length > 0
                      ? (
                          (recentRecords.reduce((sum, r) => sum + r.confidence, 0) / recentRecords.length) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Confidence</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
