import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function POST(request: NextRequest) {
  try {
    const { modelResults, historicalData, predictionType } = await request.json()

    const limitedModelResults = Array.isArray(modelResults) ? modelResults.slice(0, 5) : modelResults
    const limitedHistoricalData = {
      attendance: Array.isArray(historicalData.attendance) ? historicalData.attendance.slice(0, 10) : [],
      performance: Array.isArray(historicalData.performance) ? historicalData.performance.slice(0, 10) : [],
      students: Array.isArray(historicalData.students) ? historicalData.students.slice(0, 5) : [],
    }

    const predictiveContext = `You are an AI predictive analyst for educational systems. Based on ML model results and historical data, provide structured predictive insights.

## 🔮 PREDICTIVE ANALYSIS - ${predictionType.toUpperCase().replace("_", " ")}

### Current Trends:
- [Analysis of current patterns in the data]
- [Key indicators and metrics]

### Future Projections:
- [Specific predictions with timeframes]
- [Expected outcomes based on current trajectory]

## 📊 RISK ASSESSMENT

### High Risk Indicators:
- [Students or patterns requiring immediate attention]

### Medium Risk Factors:
- [Areas to monitor closely]

### Success Predictors:
- [Positive indicators and trends]

## 🎯 RECOMMENDED INTERVENTIONS

### Immediate Actions (Next 2-4 weeks):
1. [Urgent interventions needed]
2. [Quick wins and immediate steps]

### Medium-term Strategies (1-3 months):
1. [Sustained intervention programs]
2. [System-level improvements]

## 📈 SUCCESS METRICS

### Key Performance Indicators:
- [Metrics to track progress]
- [Success benchmarks]

PREDICTION TYPE: ${predictionType}
STUDENT COUNT: ${limitedHistoricalData.students.length}
ATTENDANCE RECORDS: ${limitedHistoricalData.attendance.length}
PERFORMANCE RECORDS: ${limitedHistoricalData.performance.length}
MODEL RESULTS COUNT: ${Array.isArray(limitedModelResults) ? limitedModelResults.length : 1}

Please provide actionable predictions that help educators make proactive decisions.`

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"), // Switch to smaller, faster model
      prompt: predictiveContext,
      maxTokens: 800, // Reduce max tokens
      temperature: 0.5,
    })

    return NextResponse.json({
      predictions: text,
      predictionType,
      confidence: "Based on ML model analysis",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Predictive Analysis Error:", error)
    return NextResponse.json({ error: "Failed to generate predictive analysis" }, { status: 500 })
  }
}
