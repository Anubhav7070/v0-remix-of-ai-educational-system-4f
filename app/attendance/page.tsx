"use client" // Added client directive to prevent SSR document errors

import { Navigation } from "@/components/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, QrCode, Brain, BarChart3, Users } from "lucide-react"
import { AttendanceSystem } from "@/components/attendance-system"
import { QRScanner } from "@/components/qr-scanner"
import { FaceModelTrainer } from "@/components/face-model-trainer"
import { SubjectAttendanceCapture } from "@/components/subject-attendance-capture"
import { AttendanceAnalytics } from "@/components/attendance-analytics"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function AttendancePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">
            AI-Powered Attendance Management System
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Complete attendance solution with advanced AI face recognition, student registration, and AI-powered
            analytics
          </p>
        </div>

        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-12">
            <TabsTrigger value="attendance" className="gap-2 text-sm">
              <Camera className="w-4 h-4" />
              Attendance System
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-2 text-sm">
              <QrCode className="w-4 h-4" />
              QR Scanner
            </TabsTrigger>
            <TabsTrigger value="trainer" className="gap-2 text-sm">
              <Brain className="w-4 h-4" />
              Train Model
            </TabsTrigger>
            <TabsTrigger value="subject" className="gap-2 text-sm">
              <Users className="w-4 h-4" />
              Subject Capture
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 text-sm">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Enhanced Attendance Session Control
                </CardTitle>
                <CardDescription>
                  Start or stop AI-powered facial recognition attendance tracking with advanced face descriptor matching
                </CardDescription>
              </CardHeader>
              <AttendanceSystem />
            </Card>
          </TabsContent>

          <TabsContent value="qr">
            <QRScanner />
          </TabsContent>

          <TabsContent value="trainer">
            <FaceModelTrainer />
          </TabsContent>

          <TabsContent value="subject">
            <SubjectAttendanceCapture />
          </TabsContent>

          <TabsContent value="analytics">
            <AttendanceAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
