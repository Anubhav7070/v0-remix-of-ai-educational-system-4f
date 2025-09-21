"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Upload, UserPlus, Users, CheckCircle, XCircle, Trash2, Edit } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Student {
  id: string
  name: string
  email: string
  grade: string
  section: string
  rollNumber: string
  phoneNumber: string
  address: string
  registrationDate: string
  totalAttendance: number
  lastSeen: string
  status: "active" | "inactive"
}

export function StudentRegistrationSystem() {
  const [students, setStudents] = useState<Student[]>([])
  const [isRegistering, setIsRegistering] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [currentImageCount, setCurrentImageCount] = useState(0)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    grade: "",
    section: "",
    rollNumber: "",
    phoneNumber: "",
    address: "",
  })

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      grade: "",
      section: "",
      rollNumber: "",
      phoneNumber: "",
      address: "",
    })
    setCapturedImages([])
    setCurrentImageCount(0)
    setIsCapturing(false)
    setEditingStudent(null)
  }

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCapturing(true)
      }
    } catch (error) {
      console.error("[v0] Camera access error:", error)
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCapturing(false)
  }, [])

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.videoWidth === 0) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL("image/jpeg", 0.8)
    setCapturedImages((prev) => [...prev, imageData])
    setCurrentImageCount((prev) => prev + 1)

    toast({
      title: "Image Captured",
      description: `Captured image ${currentImageCount + 1}/10`,
    })

    // Auto-capture 10 images
    if (currentImageCount + 1 >= 10) {
      stopCamera()
      toast({
        title: "Capture Complete",
        description: "All 10 training images captured successfully!",
      })
    }
  }, [currentImageCount])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setCapturedImages((prev) => [...prev, imageData])
        setCurrentImageCount((prev) => prev + 1)
      }
      reader.readAsDataURL(file)
    })
  }

  const registerStudent = async () => {
    if (!formData.name.trim() || !formData.rollNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and Roll Number are required",
        variant: "destructive",
      })
      return
    }

    if (capturedImages.length === 0) {
      toast({
        title: "Images Required",
        description: "Please capture or upload at least one training image",
        variant: "destructive",
      })
      return
    }

    try {
      setIsRegistering(true)

      // Register student with face recognition API
      const response = await fetch("/api/face-recognition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "register_student",
          studentData: formData,
          imageData: capturedImages[0], // Use first image for registration
          trainingImages: capturedImages, // All images for training
        }),
      })

      const result = await response.json()

      if (result.success) {
        const newStudent: Student = {
          id: result.student.id,
          name: formData.name,
          email: formData.email || `${formData.name.toLowerCase().replace(" ", ".")}@school.edu`,
          grade: formData.grade,
          section: formData.section,
          rollNumber: formData.rollNumber,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          registrationDate: new Date().toISOString().split("T")[0],
          totalAttendance: 0,
          lastSeen: "Never",
          status: "active",
        }

        setStudents((prev) => [...prev, newStudent])
        resetForm()

        toast({
          title: "Registration Successful",
          description: `${formData.name} has been registered successfully with ${capturedImages.length} training images`,
        })
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
    } finally {
      setIsRegistering(false)
    }
  }

  const deleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId))
    toast({
      title: "Student Deleted",
      description: "Student has been removed from the system",
    })
  }

  const editStudent = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name,
      email: student.email,
      grade: student.grade,
      section: student.section,
      rollNumber: student.rollNumber,
      phoneNumber: student.phoneNumber,
      address: student.address,
    })
  }

  const updateStudent = () => {
    if (!editingStudent) return

    const updatedStudent = {
      ...editingStudent,
      ...formData,
      email: formData.email || `${formData.name.toLowerCase().replace(" ", ".")}@school.edu`,
    }

    setStudents((prev) => prev.map((s) => (s.id === editingStudent.id ? updatedStudent : s)))
    resetForm()

    toast({
      title: "Student Updated",
      description: `${formData.name} has been updated successfully`,
    })
  }

  const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  const sections = ["A", "B", "C", "D", "E"]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="register" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">Register Student</TabsTrigger>
          <TabsTrigger value="manage">Manage Students</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                {editingStudent ? "Edit Student" : "Register New Student"}
              </CardTitle>
              <CardDescription>
                {editingStudent
                  ? "Update student information and retrain face recognition"
                  : "Add a new student to the system with face recognition training"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Student Information Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter student full name"
                  />
                </div>
                <div>
                  <Label htmlFor="rollNumber">Roll Number *</Label>
                  <Input
                    id="rollNumber"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rollNumber: e.target.value }))}
                    placeholder="Enter roll number"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="student@school.edu"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, grade: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          Grade {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Select
                    value={formData.section}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, section: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section} value={section}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter student address"
                  rows={3}
                />
              </div>

              {/* Face Capture Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Face Recognition Training</h4>
                  <Badge variant="outline">{capturedImages.length}/10 Images</Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Camera Feed */}
                  <div>
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isCapturing ? "block" : "hidden"}`}
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {!isCapturing && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm text-muted-foreground">Camera not active</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {!isCapturing ? (
                        <Button onClick={startCamera} className="gap-2">
                          <Camera className="w-4 h-4" />
                          Start Camera
                        </Button>
                      ) : (
                        <>
                          <Button onClick={captureImage} className="gap-2">
                            <Camera className="w-4 h-4" />
                            Capture ({currentImageCount}/10)
                          </Button>
                          <Button onClick={stopCamera} variant="outline">
                            Stop Camera
                          </Button>
                        </>
                      )}
                      <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Upload Images
                      </Button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Captured Images Preview */}
                  <div>
                    <h5 className="font-medium mb-2">Captured Images</h5>
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {capturedImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`Capture ${index + 1}`}
                            className="w-full aspect-square object-cover rounded"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 w-6 h-6 p-0"
                            onClick={() => {
                              setCapturedImages((prev) => prev.filter((_, i) => i !== index))
                              setCurrentImageCount((prev) => prev - 1)
                            }}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {editingStudent ? (
                  <>
                    <Button onClick={updateStudent} disabled={isRegistering} className="gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Update Student
                    </Button>
                    <Button onClick={resetForm} variant="outline">
                      Cancel Edit
                    </Button>
                  </>
                ) : (
                  <Button onClick={registerStudent} disabled={isRegistering} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    {isRegistering ? "Registering..." : "Register Student"}
                  </Button>
                )}
                <Button onClick={resetForm} variant="outline">
                  Reset Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Student Database
              </CardTitle>
              <CardDescription>Manage registered students and their information</CardDescription>
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
                            <p>Registered: {student.registrationDate}</p>
                            <p>Total Attendance: {student.totalAttendance}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editStudent(student)} className="gap-1">
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteStudent(student.id)}
                            className="gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No students registered</p>
                    <p>Start by registering your first student</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
