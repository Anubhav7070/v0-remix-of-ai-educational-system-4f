"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Camera,
  CameraOff,
  User,
  Users,
  AlertTriangle,
  CheckCircle,
  Download,
  Settings,
  Shield,
  Eye,
  Zap,
} from "lucide-react"

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  timestamp: Date
  confidence: number
  status: "present" | "absent" | "late"
  method: "facial_recognition" | "manual"
}

interface DetectedFace {
  id: string
  studentMatch?: {
    studentId: string
    name: string
    confidence: number
  }
  timestamp: Date
  isProcessing: boolean
}

export function EnhancedFacialRecognition() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [attendanceMarked, setAttendanceMarked] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionId] = useState(`session_${Date.now()}`)

  const [confidenceThreshold, setConfidenceThreshold] = useState(75)
  const [enableAutoCapture, setEnableAutoCapture] = useState(true)
  const [captureInterval, setCaptureInterval] = useState(3000) // 3 seconds

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return

    setIsProcessing(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      setIsProcessing(false)
      return
    }

    // Capture current frame
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8)

    try {
      console.log("[v0] Sending image to Google Vision API for face recognition")

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData,
          sessionId,
        }),
      })

      const result = await response.json()

      if (result.success && result.record) {
        const newFace: DetectedFace = {
          id: `face_${Date.now()}`,
          studentMatch: {
            studentId: result.record.studentId,
            name: result.record.studentName,
            confidence: result.record.confidence,
          },
          timestamp: new Date(),
          isProcessing: false,
        }

        setDetectedFaces((prev) => [newFace, ...prev.slice(0, 9)]) // Keep last 10 detections
        setAttendanceMarked((prev) => new Set(prev).add(result.record.studentId))

        console.log("[v0] Face recognized:", result.record.studentName, "Confidence:", result.record.confidence)
      } else if (result.error) {
        console.log("[v0] Recognition failed:", result.error)

        // Add unknown face detection
        if (result.error !== "No faces detected in image") {
          const unknownFace: DetectedFace = {
            id: `face_${Date.now()}`,
            timestamp: new Date(),
            isProcessing: false,
          }
          setDetectedFaces((prev) => [unknownFace, ...prev.slice(0, 9)])
        }
      }
    } catch (error) {
      console.error("[v0] Face recognition API error:", error)
      setError("Failed to process face recognition")
    } finally {
      setIsProcessing(false)
    }
  }

  const startCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Camera not available in this environment")
      return
    }

    try {
      setError(null)
      setIsLoading(true)

      const constraints = {
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
          frameRate: { ideal: 30 },
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsLoading(false)
          })
        }
      }

      setStream(mediaStream)
      setIsActive(true)

      console.log("[v0] Camera started for Google Vision face recognition")
    } catch (err: any) {
      setIsLoading(false)
      setError(`Camera error: ${err.message || "Failed to access camera"}`)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsActive(false)
    setDetectedFaces([])
    setAttendanceMarked(new Set())
    setIsLoading(false)
    console.log("[v0] Camera stopped")
  }

  const exportResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      sessionId,
      detectedFaces: detectedFaces.map((face) => ({
        studentMatch: face.studentMatch,
        confidence: face.studentMatch?.confidence,
        timestamp: face.timestamp,
      })),
      attendanceMarked: Array.from(attendanceMarked),
      totalRecognized: detectedFaces.filter((f) => f.studentMatch).length,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `face-recognition-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isActive && enableAutoCapture && !isProcessing) {
      interval = setInterval(() => {
        captureAndRecognize()
      }, captureInterval)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isActive, enableAutoCapture, captureInterval, isProcessing])

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const stats = {
    totalDetections: detectedFaces.length,
    recognizedFaces: detectedFaces.filter((f) => f.studentMatch).length,
    attendanceMarked: attendanceMarked.size,
    recognitionRate:
      detectedFaces.length > 0 ? (detectedFaces.filter((f) => f.studentMatch).length / detectedFaces.length) * 100 : 0,
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Google Vision Face Recognition
          </CardTitle>
          <CardDescription>Real-time attendance tracking powered by Google Vision API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                onClick={isActive ? stopCamera : startCamera}
                variant={isActive ? "destructive" : "default"}
                className="gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : isActive ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    Stop Recognition
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Start Face Recognition
                  </>
                )}
              </Button>

              {isActive && (
                <>
                  <Button
                    onClick={captureAndRecognize}
                    variant="outline"
                    className="gap-2 bg-transparent"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Capture & Recognize
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowSettings(!showSettings)}
                    variant="outline"
                    className="gap-2 bg-transparent"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>

                  <Button
                    onClick={exportResults}
                    variant="outline"
                    className="gap-2 bg-transparent"
                    disabled={detectedFaces.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    Export Results
                  </Button>
                </>
              )}

              {isActive && (
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Google Vision Active
                  </Badge>

                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <Switch checked={enableAutoCapture} onCheckedChange={setEnableAutoCapture} />
                    <Label className="text-sm">Auto Capture</Label>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Recognition Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Confidence Threshold: {confidenceThreshold}%</Label>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="5"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Auto Capture Interval: {captureInterval / 1000}s</Label>
                      <input
                        type="range"
                        min="1000"
                        max="10000"
                        step="1000"
                        value={captureInterval}
                        onChange={(e) => setCaptureInterval(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Camera Feed */}
            <div className="relative bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-auto max-h-96 object-cover"
                style={{ display: isActive ? "block" : "none" }}
                muted
                playsInline
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white/90 p-4 rounded-lg flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Processing with Google Vision...</span>
                  </div>
                </div>
              )}

              {!isActive && !isLoading && (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Zap className="w-12 h-12 mx-auto" />
                    <p>Google Vision Face Recognition</p>
                    <p className="text-sm">Advanced AI-powered attendance tracking</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {isActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalDetections}</p>
                  <p className="text-sm text-muted-foreground">Total Detections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.recognizedFaces}</p>
                  <p className="text-sm text-muted-foreground">Recognized</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.attendanceMarked}</p>
                  <p className="text-sm text-muted-foreground">Attendance Marked</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.recognitionRate.toFixed(0)}%</p>
                  <p className="text-sm text-muted-foreground">Recognition Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detection Results */}
      {isActive && detectedFaces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Detections</CardTitle>
            <CardDescription>Latest face recognition results from Google Vision API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detectedFaces.map((face) => (
                <div key={face.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          face.studentMatch ? "bg-green-100 border-2 border-green-500" : "bg-orange-100"
                        }`}
                      >
                        <User className={`w-6 h-6 ${face.studentMatch ? "text-green-600" : "text-orange-600"}`} />
                      </div>
                      <div>
                        <p className="font-medium">{face.studentMatch ? face.studentMatch.name : "Unknown Person"}</p>
                        <p className="text-sm text-muted-foreground">
                          {face.timestamp.toLocaleTimeString()}
                          {face.studentMatch && ` • Confidence: ${(face.studentMatch.confidence * 100).toFixed(0)}%`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {face.studentMatch && attendanceMarked.has(face.studentMatch.studentId) && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Attendance Marked
                        </Badge>
                      )}

                      {face.studentMatch && (
                        <Badge variant="default">{(face.studentMatch.confidence * 100).toFixed(0)}% Match</Badge>
                      )}
                    </div>
                  </div>

                  {face.studentMatch && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm w-20">Confidence:</span>
                        <Progress value={face.studentMatch.confidence * 100} className="flex-1 h-2" />
                        <span className="text-sm w-12">{(face.studentMatch.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
