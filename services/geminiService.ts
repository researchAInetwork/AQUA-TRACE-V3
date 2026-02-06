
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisReport, GroundingSource, RiskLevel, ConfidenceLevel, TimeSensitivity } from "../types";

const SYSTEM_DISCLAIMER = "AQUA-TRACE provides probabilistic, optical-based environmental intelligence for prioritization and early warning. Outputs are non-prescriptive and must be validated through laboratory and field investigation before regulatory or remediation action.";

const MOCK_REPORTS: AnalysisReport[] = [
  {
    detectedOptics: ["Iridescent hydrocarbon sheen", "Surface film stratification", "Dark plume at discharge point"],
    nonDetectableOptics: ["Dissolved benzene/toluene", "Polycyclic Aromatic Hydrocarbons (PAHs)", "Heavy metals (Lead/Mercury)"],
    aquaImpactScore: 78,
    comparativeIntelligence: "AIS 78 indicates higher projected impact than approximately 92% of comparable surface-water observations in our reference dataset.",
    timeSensitivity: TimeSensitivity.IMMEDIATE_VERIFICATION,
    plainLanguageSummary: "This water body shows strong visual indicators consistent with a petroleum-based discharge. If confirmed, this event may pose a significant threat to aquatic ecosystems and downstream water quality.",
    scoreBreakdown: {
      opticalSeverity: 32,
      visibleArea: 14,
      ecosystemSensitivity: 18,
      humanProximity: 14
    },
    scoreExplanation: "Visual markers suggest a fresh release of light refined oils. The observed iridescence correlates with established optical thickness charts for hydrocarbon films.",
    likelyPollutionCategory: "Petrochemical Discharge (Inferred)",
    environmentalImpactExplanation: "Oil films may inhibit atmospheric gas exchange, potentially leading to localized hypoxia. Direct coating of waterfowl is a high-probability risk if left uncontained.",
    humanHealthImplications: "Potential inhalation risk of volatile compounds for nearby residents. Avoid direct contact pending chemical verification.",
    environmentalRiskLevel: RiskLevel.HIGH,
    riskJustification: "The classification is driven by the presence of a continuous 'rainbow' sheen pattern. High urgency is suggested due to proximity to sensitive wetlands.",
    actionIntelligence: {
      recommendedAction: "Escalate",
      notificationTargets: ["Coast Guard Sector Command", "Regional EPA Emergency Response", "Downstream Municipal Intakes"],
      followUpEvidence: [
        "Upstream forensic photo-documentation of storm drains within 2km.",
        "Shoreline oiling intensity mapping (SCAT method).",
        "Verification of sheen thickness using standard ASTM visual guides."
      ],
      labValidationAdvisory: "Evaluation via EPA Method 1664 (Oil & Grease) and EPA Method 8260 (VOC/BTEX) is suggested for definitive assessment.",
      remediationStrategy: [
        "Deployment of containment booms may be considered to capture surface sheens.",
        "Hydrophobic sorbent pads are suggested for spot recovery in low-flow areas.",
        "Continuous monitoring of dissolved oxygen is recommended."
      ]
    },
    confidencePercentage: 92,
    confidenceLevel: ConfidenceLevel.HIGH,
    confidenceFactors: ["High optical clarity", "Multiple point source triangulation", "Strong spectral iridescence"],
    assessmentLimitations: ["Sub-surface mass cannot be quantified via optics", "Molecular weight requires laboratory chromatography"],
    systemAdvisory: SYSTEM_DISCLAIMER,
    sourceMode: 'Demo'
  },
  {
    detectedOptics: ["Cyan-green surface accumulation", "High turbidity (Organic)", "Biological foaming"],
    nonDetectableOptics: ["Microcystins (Toxins)", "Dissolved Phosphorus", "Ammonia/Nitrate concentrations"],
    aquaImpactScore: 62,
    comparativeIntelligence: "AIS 62 indicates higher projected impact than approximately 74% of comparable surface-water observations.",
    timeSensitivity: TimeSensitivity.MONITOR_CLOSELY,
    plainLanguageSummary: "Dense algal accumulation consistent with a bloom event. While likely organic, potential toxin production may exist and requires monitoring.",
    scoreBreakdown: {
      opticalSeverity: 22,
      visibleArea: 18,
      ecosystemSensitivity: 12,
      humanProximity: 10
    },
    scoreExplanation: "Observed surface patterns are indicative of Cyanobacteria. Visual density suggests significant nutrient loading, though toxicity is not visually verifiable.",
    likelyPollutionCategory: "Harmful Algal Bloom (HAB) (Potential)",
    environmentalImpactExplanation: "Respiratory demand of the bloom may cause dissolved oxygen fluctuations. Some species in this category are capable of toxin production.",
    humanHealthImplications: "Possible dermal irritation. Direct contact should be avoided until toxin presence is evaluated.",
    environmentalRiskLevel: RiskLevel.MODERATE,
    riskJustification: "The visual appearance matches 'spilled paint' signatures typical of Cyanobacteria. Risk is set to Moderate pending toxicity results.",
    actionIntelligence: {
      recommendedAction: "Monitor",
      notificationTargets: ["State Department of Health", "Local Parks and Recreation", "Environmental NGO Monitoring Network"],
      followUpEvidence: [
        "Daily Secchi disk depth readings to track bloom density.",
        "Visual survey for stressed or lethargic wildlife.",
        "Microscopic identification of dominant species."
      ],
      labValidationAdvisory: "ELISA testing for Microcystin and Anatoxin-a is suggested to determine health risks.",
      remediationStrategy: [
        "Posting of advisory signage is suggested as a precautionary measure.",
        "Paused upstream nutrient applications may be evaluated.",
        "Ultrasonic treatment could be considered for enclosed impoundments."
      ]
    },
    confidencePercentage: 85,
    confidenceLevel: ConfidenceLevel.HIGH,
    confidenceFactors: ["Characteristic color profile", "Turbidity markers", "Regional seasonality correlation"],
    assessmentLimitations: ["Toxicity level is independent of visual density", "Specific species identification requires lab microscopy"],
    systemAdvisory: SYSTEM_DISCLAIMER,
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
      Perform a probabilistic environmental intelligence audit of this surface water sample.

      ANALYSIS MODE: ${granularity}
      ${isExpert ? 'FOCUS: Deep forensic reasoning and chemical pathway analysis.' : 'FOCUS: Rapid field triage and safety protocols.'}

      ENVIRONMENTAL CONTEXT:
      ${context ? `Site Metadata: ${context}` : 'No metadata provided.'}
      Geolocation: ${location ? `Lat ${location.latitude}, Lng ${location.longitude}` : 'Unknown.'}

      PROMPT PROTOCOL:
      - Use conditional language ("may indicate", "suggests", "possible").
      - Prioritize risk prioritization over definitive diagnosis.
      - Explicitly state that visual evidence requires laboratory confirmation.

      OUTPUT JSON STRUCTURE:
      {
        "detectedOptics": ["string"],
        "nonDetectableOptics": ["string"],
        "aquaImpactScore": number (0-100),
        "comparativeIntelligence": "AIS [Score] indicates higher projected impact than [X]% of comparable observations.",
        "timeSensitivity": "Non-Urgent" | "Monitor Closely" | "Time-Critical" | "Immediate Verification Recommended",
        "plainLanguageSummary": "1-2 sentence non-technical summary avoiding jargon and absolute certainty.",
        "scoreBreakdown": { "opticalSeverity": number, "visibleArea": number, "ecosystemSensitivity": number, "humanProximity": number },
        "scoreExplanation": "Technical rationale for scores.",
        "likelyPollutionCategory": "Inferred category with qualifiers like '(Potential)'.",
        "environmentalImpactExplanation": "Conditional ecological risks.",
        "humanHealthImplications": "Precautions for contact and inhalation.",
        "environmentalRiskLevel": "Low" | "Moderate" | "High" | "Critical",
        "riskJustification": "Clear evidence-based rationale for the risk level.",
        "actionIntelligence": {
          "recommendedAction": "Monitor" | "Escalate" | "Contain",
          "notificationTargets": ["string"],
          "followUpEvidence": ["string"],
          "labValidationAdvisory": "Suggested lab methods (EPA/ISO).",
          "remediationStrategy": ["Suggested field actions in conditional phrasing."]
        },
        "confidencePercentage": number,
        "confidenceLevel": "Low" | "Moderate" | "High",
        "confidenceFactors": ["Factors influencing this assessment (clarity, source visibility, context)."],
        "assessmentLimitations": ["Specific optical or contextual constraints."],
        "systemAdvisory": "${SYSTEM_DISCLAIMER}"
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
    report.systemAdvisory = SYSTEM_DISCLAIMER;
    
    const sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const chunk of groundingChunks) {
      if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      else if (chunk.maps) sources.push({ title: chunk.maps.title, uri: chunk.maps.uri });
    }

    return { report, sources, mode: 'Live' };

  } catch (error: any) {
    console.warn("Live API unavailable. Falling back to cached intelligence.", error);
    const index = Math.abs(file.name.length) % MOCK_REPORTS.length;
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
      AQUA-TRACE Impact Intelligence Briefing:
      AIS Score: ${report.aquaImpactScore}. Urgency: ${report.timeSensitivity}.
      Summary: ${report.plainLanguageSummary}.
      Risk Rationale: ${report.riskJustification}.
      Disclaimer: This briefing is based on optical triage and must be lab-verified.
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
