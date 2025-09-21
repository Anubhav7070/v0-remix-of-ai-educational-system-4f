"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Brain, TrendingUp, FileText, Lightbulb, BarChart3, CheckCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

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

interface AIAttendanceAnalysisProps {
  attendanceRecords: AttendanceRecord[]
  students: Student[]
}

export function AIAttendanceAnalysis({ attendanceRecords, students }: AIAttendanceAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string>("")
  const [insights, setInsights] = useState<string>("")
  const [predictions, setPredictions] = useState<string>("")
  const [report, setReport] = useState<string>("")
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("comprehensive")
  const [selectedTimeRange, setSelectedTimeRange] = useState("last_week")
  const [selectedSubject, setSelectedSubject] = useState("all")

  const analyzeAttendance = async (analysisType: string) => {
    try {
      setIsAnalyzing(true)
      console.log("[v0] Starting AI analysis:", analysisType)

      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "analyze_attendance",
          data: attendanceRecords,
          analysisType: selectedAnalysisType,
          timeRange: selectedTimeRange,
          subject: selectedSubject === "all" ? undefined : selectedSubject,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setAnalysisResult(result.analysis)
        toast({
          title: "Analysis Complete",
          description: `AI analysis completed for ${result.metadata.recordsAnalyzed} records`,
        })
      } else {
        toast({
          title: "Analysis Failed",
          description: result.error || "Failed to analyze attendance data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Analysis error:", error)
      toast({
        title: "Analysis Error",
        description: "Failed to analyze attendance data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateInsights = async () => {
    try {
      setIsAnalyzing(true)
      console.log("[v0] Generating AI insights")

      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate_insights",
          data: { students, attendance: attendanceRecords },
        }),
      })

      const result = await response.json()

      if (result.success) {
        setInsights(result.insights)
        toast({
          title: "Insights Generated",
          description: "AI insights have been generated successfully",
        })
      } else {
        toast({
          title: "Insights Failed",
          description: result.error || "Failed to generate insights",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Insights error:", error)
      toast({
        title: "Insights Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const predictTrends = async () => {
    try {
      setIsAnalyzing(true)
      console.log("[v0] Predicting attendance trends")

      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "predict_trends",
          data: attendanceRecords,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPredictions(result.predictions)
        toast({
          title: "Predictions Generated",
          description: "AI trend predictions have been generated",
        })
      } else {
        toast({
          title: "Predictions Failed",
          description: result.error || "Failed to predict trends",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Predictions error:", error)
      toast({
        title: "Predictions Error",
        description: "Failed to predict trends. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateReport = async () => {
    try {
      setIsAnalyzing(true)
      console.log("[v0] Generating comprehensive report")

      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate_report",
          data: { students, attendance: attendanceRecords },
          timeRange: selectedTimeRange,
          subject: selectedSubject === "all" ? undefined : selectedSubject,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setReport(result.report)
        toast({
          title: "Report Generated",
          description: "Comprehensive attendance report has been generated",
        })
      } else {
        toast({
          title: "Report Failed",
          description: result.error || "Failed to generate report",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Report error:", error)
      toast({
        title: "Report Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analysisTypes = [
    { value: "comprehensive", label: "Comprehensive Analysis" },
    { value: "performance", label: "Performance Analysis" },
    { value: "patterns", label: "Pattern Recognition" },
    { value: "risk_assessment", label: "Risk Assessment" },
  ]

  const timeRanges = [
    { value: "today", label: "Today" },
    { value: "last_week", label: "Last Week" },
    { value: "last_month", label: "Last Month" },
    { value: "last_quarter", label: "Last Quarter" },
    { value: "all_time", label: "All Time" },
  ]

  const subjects = [
    { value: "all", label: "All Subjects" },
    { value: "Mathematics", label: "Mathematics" },
    { value: "Physics", label: "Physics" },
    { value: "Chemistry", label: "Chemistry" },
    { value: "Biology", label: "Biology" },
    { value: "English", label: "English" },
    { value: "History", label: "History" },
    { value: "Geography", label: "Geography" },
    { value: "Computer Science", label: "Computer Science" },
  ]

  const getAnalysisStats = () => {
    const totalRecords = attendanceRecords.length
    const presentCount = attendanceRecords.filter((r) => r.status === "present").length
    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0
    const avgConfidence =
      totalRecords > 0 ? (attendanceRecords.reduce((sum, r) => sum + r.confidence, 0) / totalRecords) * 100 : 0

    return { totalRecords, presentCount, attendanceRate, avgConfidence }
  }

  const stats = getAnalysisStats()

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI-Powered Attendance Analysis
          </CardTitle>
          <CardDescription>
            Advanced AI analysis using Groq LLM to generate insights, predictions, and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Analysis Type</label>
              <Select value={selectedAnalysisType} onValueChange={setSelectedAnalysisType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {analysisTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject Filter</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.value} value={subject.value}>
                      {subject.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.totalRecords}</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.attendanceRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{students.length}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{stats.avgConfidence.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => analyzeAttendance("analyze")} disabled={isAnalyzing} className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {isAnalyzing ? "Analyzing..." : "Analyze Attendance"}
            </Button>
            <Button
              onClick={generateInsights}
              disabled={isAnalyzing}
              variant="outline"
              className="gap-2 bg-transparent"
            >
              <Lightbulb className="w-4 h-4" />
              Generate Insights
            </Button>
            <Button onClick={predictTrends} disabled={isAnalyzing} variant="outline" className="gap-2 bg-transparent">
              <TrendingUp className="w-4 h-4" />
              Predict Trends
            </Button>
            <Button onClick={generateReport} disabled={isAnalyzing} variant="outline" className="gap-2 bg-transparent">
              <FileText className="w-4 h-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Attendance Analysis Results
              </CardTitle>
              <CardDescription>AI-generated analysis of attendance patterns and performance</CardDescription>
            </CardHeader>
            <CardContent>
              {analysisResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <Badge variant="default">Analysis Complete</Badge>
                  </div>
                  <Textarea
                    value={analysisResult}
                    readOnly
                    className="min-h-96 font-mono text-sm"
                    placeholder="Analysis results will appear here..."
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Analysis Yet</p>
                  <p>Click "Analyze Attendance" to generate AI-powered insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                AI-Generated Insights
              </CardTitle>
              <CardDescription>Actionable insights and recommendations from attendance data</CardDescription>
            </CardHeader>
            <CardContent>
              {insights ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <Badge variant="default">Insights Generated</Badge>
                  </div>
                  <Textarea
                    value={insights}
                    readOnly
                    className="min-h-96 font-mono text-sm"
                    placeholder="AI insights will appear here..."
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Insights Yet</p>
                  <p>Click "Generate Insights" to get AI-powered recommendations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Attendance Trend Predictions
              </CardTitle>
              <CardDescription>AI predictions for future attendance patterns and risks</CardDescription>
            </CardHeader>
            <CardContent>
              {predictions ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <Badge variant="default">Predictions Generated</Badge>
                  </div>
                  <Textarea
                    value={predictions}
                    readOnly
                    className="min-h-96 font-mono text-sm"
                    placeholder="AI predictions will appear here..."
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Predictions Yet</p>
                  <p>Click "Predict Trends" to generate future attendance forecasts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Comprehensive Attendance Report
              </CardTitle>
              <CardDescription>Detailed AI-generated report with all analysis and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {report ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <Badge variant="default">Report Generated</Badge>
                  </div>
                  <Textarea
                    value={report}
                    readOnly
                    className="min-h-96 font-mono text-sm"
                    placeholder="Comprehensive report will appear here..."
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Report Yet</p>
                  <p>Click "Generate Report" to create a comprehensive attendance report</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
