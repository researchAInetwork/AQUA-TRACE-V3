import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisReport, GroundingSource, RiskLevel, ConfidenceLevel, TimeSensitivity } from "../types";

const MOCK_REPORTS: AnalysisReport[] = [
  {
    detectedOptics: ["Iridescent hydrocarbon sheen", "Surface film stratification", "Dark plume at discharge point"],
    nonDetectableOptics: ["Dissolved benzene/toluene", "Polycyclic Aromatic Hydrocarbons (PAHs)", "Heavy metals (Lead/Mercury)"],
    aquaImpactScore: 78,
    comparativeIntelligence: "AIS 78 — Higher impact than approximately 92% of comparable surface water observations.",
    timeSensitivity: TimeSensitivity.IMMEDIATE_VERIFICATION,
    plainLanguageSummary: "High-probability hydrocarbon discharge detected. Immediate intervention is required to prevent localized ecological collapse and contamination of downstream water intakes.",
    scoreBreakdown: {
      opticalSeverity: 32,
      visibleArea: 14,
      ecosystemSensitivity: 18,
      humanProximity: 14
    },
    scoreExplanation: "Iridescence and plume thickness suggest a fresh release of light refined oils (likely Diesel or Hydraulic fluid). The stratification indicates high spread potential across the water-air interface.",
    likelyPollutionCategory: "Petrochemical Discharge",
    environmentalImpactExplanation: "Oil films prevent atmospheric gas exchange, causing rapid hypoxia for benthic and pelagic organisms. Direct physical coating of avian species is a critical risk.",
    humanHealthImplications: "High VOC inhalation risk for responders. Potential groundwater leaching if shoreline is permeable.",
    environmentalRiskLevel: RiskLevel.HIGH,
    riskJustification: "The classification is driven by the presence of a continuous 'rainbow' and 'silver' sheen pattern which correlates with a spill thickness of 0.3μm to 5.0μm. The proximity to sensitive wetlands increases the risk of irreversible soil saturation.",
    actionIntelligence: {
      recommendedAction: "Escalate",
      notificationTargets: ["Coast Guard Sector Command", "Regional EPA Emergency Response", "Downstream Municipal Intakes"],
      followUpEvidence: [
        "Upstream forensic photo-documentation of storm drains within 2km.",
        "Shoreline oiling intensity mapping (SCAT method).",
        "Verification of 'rainbow' vs 'silver' sheen thickness using standard thickness charts."
      ],
      labValidationAdvisory: "Request EPA Method 1664 (Oil & Grease) and EPA Method 8260 (VOC/BTEX). Use amber glass jars for sampling; zero headspace.",
      remediationStrategy: [
        "Deploy 500ft of containment boom downstream to capture surface sheens.",
        "Utilize hydrophobic sorbent pads for immediate spot recovery.",
        "Implement air-sparging or surface agitation if oxygen levels drop below 4mg/L."
      ]
    },
    confidencePercentage: 92,
    confidenceLevel: ConfidenceLevel.HIGH,
    assessmentLimitations: ["Sub-surface plume mass cannot be quantified via optics", "Specific hydrocarbon molecular weight requires chromatography"],
    sourceMode: 'Demo'
  },
  {
    detectedOptics: ["Cyan-green surface accumulation", "High turbidity (Organic)", "Biological foaming"],
    nonDetectableOptics: ["Microcystins (Toxins)", "Dissolved Phosphorus", "Ammonia/Nitrate concentrations"],
    aquaImpactScore: 62,
    comparativeIntelligence: "AIS 62 — Higher impact than approximately 74% of comparable surface water observations.",
    timeSensitivity: TimeSensitivity.MONITOR_CLOSELY,
    plainLanguageSummary: "Dense algal accumulation consistent with a bloom event. While likely organic, potential toxin production requires immediate monitoring and contact advisory.",
    scoreBreakdown: {
      opticalSeverity: 22,
      visibleArea: 18,
      ecosystemSensitivity: 12,
      humanProximity: 10
    },
    scoreExplanation: "Dense cyanobacterial-like mats detected. Coloration suggests high chlorophyll-a and phycocyanin content, indicative of significant nutrient loading (eutrophication).",
    likelyPollutionCategory: "Harmful Algal Bloom (HAB)",
    environmentalImpactExplanation: "Nighttime respiratory demand by the bloom can cause lethal dissolved oxygen swings. Potential for neurotoxin and hepatotoxin release.",
    humanHealthImplications: "Dermal irritation (rashes) and respiratory distress from aerosolized toxins. Lethal to pets and local fauna if ingested.",
    environmentalRiskLevel: RiskLevel.MODERATE,
    riskJustification: "The visual appearance matches 'spilled paint' signatures typical of Cyanobacteria. Risk is set to Moderate pending toxicity results as visual density does not always correlate with toxin parts-per-billion.",
    actionIntelligence: {
      recommendedAction: "Monitor",
      notificationTargets: ["State Department of Health", "Local Parks and Recreation", "Environmental NGO Monitoring Network"],
      followUpEvidence: [
        "Daily Secchi disk depth readings to track bloom density.",
        "Visual check for dead fish or lethargic waterfowl on shorelines.",
        "Microscopic identification of dominant species (e.g., Microcystis vs Anabaena)."
      ],
      labValidationAdvisory: "Immediate ELISA testing for Microcystin and Anatoxin-a. Measure Chlorophyll-a and Total Phosphorus concentrations.",
      remediationStrategy: [
        "Post 'No Contact' and 'Pet Danger' advisory signage immediately.",
        "Coordinate with upstream agriculture to pause fertilizer applications during peak flow.",
        "Evaluate ultrasonic treatment or nutrient-binding agents (Phoslock) for small impoundments."
      ]
    },
    confidencePercentage: 85,
    confidenceLevel: ConfidenceLevel.HIGH,
    assessmentLimitations: ["Toxicity level is independent of visual density", "Specific species identification requires lab microscopy"],
    sourceMode: 'Demo'
  }
];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

async function getGeoLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return null;
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

export async function analyzeWaterImage(file: File, context: string, granularity: 'Standard' | 'Expert'): Promise<{ report: AnalysisReport; sources: GroundingSource[]; mode: 'Live' | 'Demo' }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = await fileToBase64(file);
    const mimeType = file.type;
    const location = await getGeoLocation();

    const isExpert = granularity === 'Expert';

    const prompt = `
      Act as a World-Class Environmental Systems Architect and Forensic Scientist. 
      Perform a production-grade environmental intelligence audit of this surface water sample.

      ANALYSIS MODE: ${granularity}
      ${isExpert ? 'FOCUS: Deep forensic reasoning, chemical pathway analysis, and high-granularity remediation tactics.' : 'FOCUS: Rapid field triage, clear summaries, and standard safety protocols.'}

      CONTEXTUAL GUIDANCE:
      ${context ? `Site Metadata: ${context}` : 'No metadata provided.'}
      Geolocation: ${location ? `Lat ${location.latitude}, Lng ${location.longitude}` : 'Unknown.'}

      CRITICAL REQUIREMENT:
      You must provide a detailed 'riskJustification' that explains EXACTLY why the Risk Level was chosen. 
      ${isExpert ? 'In Expert Mode, use technical terminology related to ecological toxicity and pollutant dispersion.' : 'In Standard Mode, keep it concise but evidence-based.'}

      YOUR ANALYSIS MUST INCLUDE ENHANCED DECISION INTELLIGENCE:
      1. **AQUA-IMPACT SCORE™ (AIS)**: Standardized 0–100 score.
      2. **Action Intelligence Panel Enhancements**:
         - **Follow-Up Evidence**: Provide 3+ highly specific field observations.
         - **Lab Validation Advisory**: Name specific EPA/International test methods.
         - **Remediation Strategy**: Provide 3+ immediate field solutions.
      3. **Plain Language Summary**: A clear sentence for non-experts.

      OUTPUT FORMAT: Strictly valid JSON.
      {
        "detectedOptics": ["string"],
        "nonDetectableOptics": ["string"],
        "aquaImpactScore": number,
        "comparativeIntelligence": "string",
        "timeSensitivity": "Non-Urgent" | "Monitor Closely" | "Time-Critical" | "Immediate Verification Recommended",
        "plainLanguageSummary": "string",
        "scoreBreakdown": { "opticalSeverity": number, "visibleArea": number, "ecosystemSensitivity": number, "humanProximity": number },
        "scoreExplanation": "string",
        "likelyPollutionCategory": "string",
        "environmentalImpactExplanation": "string",
        "humanHealthImplications": "string",
        "environmentalRiskLevel": "Low" | "Moderate" | "High" | "Critical",
        "riskJustification": "string",
        "actionIntelligence": {
          "recommendedAction": "Monitor" | "Escalate" | "Contain",
          "notificationTargets": ["string"],
          "followUpEvidence": ["string"],
          "labValidationAdvisory": "string",
          "remediationStrategy": ["string"]
        },
        "confidencePercentage": number,
        "confidenceLevel": "Low" | "Moderate" | "High",
        "assessmentLimitations": ["string"]
      }
    `;

    const config: any = {
      tools: [{ googleSearch: {} }, { googleMaps: {} }]
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: { latitude: location.latitude, longitude: location.longitude }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      },
      config: config
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Scientific synthesis failed.");
    const report: AnalysisReport = JSON.parse(jsonMatch[0]);
    report.sourceMode = 'Live';
    
    const sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const chunk of groundingChunks) {
      if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      else if (chunk.maps) sources.push({ title: chunk.maps.title, uri: chunk.maps.uri });
    }

    return { report, sources, mode: 'Live' };

  } catch (error: any) {
    console.warn("Live API inference unavailable. Fallback activated.", error);
    const index = file.name.length % MOCK_REPORTS.length;
    return { 
      report: MOCK_REPORTS[index], 
      sources: [
        { title: "Standard Environmental Risk Procedures", uri: "https://www.epa.gov/environmental-topics" }
      ],
      mode: 'Demo' 
    };
  }
}

export async function generateAudioReport(report: AnalysisReport): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      AQUA-TRACE Executive Briefing:
      Impact Score: ${report.aquaImpactScore}. Urgency: ${report.timeSensitivity}.
      Summary: ${report.plainLanguageSummary}.
      Action Required: ${report.actionIntelligence.recommendedAction}.
      Risk Rationale: ${report.riskJustification}.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio synthesis failed.");
    return base64Audio;
  } catch {
    throw new Error("Audio Briefing currently unavailable.");
  }
}