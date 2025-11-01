import React from 'react';
import { Shield, Heart, Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const PreventiveMeasures = ({ riskLevel, variants = [] }) => {
  const getPreventiveMeasures = (risk, variants) => {
    const measures = {
      high: {
        icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
        title: "High Risk - Immediate Action Required",
        color: "border-red-200 bg-red-50",
        measures: [
          "Consult a genetic counselor immediately",
          "Schedule regular screenings every 6 months",
          "Consider preventive surgery if recommended",
          "Lifestyle modifications: avoid smoking, limit alcohol",
          "Maintain healthy weight and exercise regularly",
          "Inform family members about genetic risk"
        ]
      },
      medium: {
        icon: <Shield className="h-6 w-6 text-yellow-500" />,
        title: "Medium Risk - Enhanced Monitoring",
        color: "border-yellow-200 bg-yellow-50",
        measures: [
          "Annual genetic counseling sessions",
          "Enhanced screening every 12 months",
          "Adopt Mediterranean diet",
          "Regular exercise (150 min/week)",
          "Stress management techniques",
          "Monitor family history updates"
        ]
      },
      low: {
        icon: <CheckCircle className="h-6 w-6 text-green-500" />,
        title: "Low Risk - Standard Prevention",
        color: "border-green-200 bg-green-50",
        measures: [
          "Standard screening as per age guidelines",
          "Maintain healthy lifestyle",
          "Regular check-ups with primary care",
          "Stay informed about family history",
          "Consider genetic counseling if family history changes"
        ]
      }
    };

    return measures[risk] || measures.low;
  };

  const getGeneSpecificMeasures = (variants) => {
    const geneMap = {
      'BRCA1': {
        measures: [
          "Breast MRI screening starting age 25-30",
          "Clinical breast exam every 6 months",
          "Consider prophylactic mastectomy (discuss with oncologist)",
          "Transvaginal ultrasound and CA-125 testing",
          "Consider prophylactic oophorectomy after age 35-40",
          "Avoid hormone replacement therapy"
        ],
        disease: "Breast/Ovarian Cancer",
        urgency: "high"
      },
      'BRCA2': {
        measures: [
          "Enhanced breast cancer screening (MRI + mammography)",
          "Prostate cancer screening for males starting age 40",
          "Pancreatic cancer surveillance if family history",
          "Melanoma screening annually",
          "Consider genetic counseling for family planning"
        ],
        disease: "Breast/Prostate/Pancreatic Cancer",
        urgency: "high"
      },
      'APOE': {
        measures: [
          "Cognitive assessment annually after age 50",
          "MIND diet (Mediterranean-DASH hybrid)",
          "Regular aerobic exercise (30 min, 5x/week)",
          "Mental stimulation activities (reading, puzzles)",
          "Social engagement and stress management",
          "Monitor cardiovascular health closely"
        ],
        disease: "Alzheimer's Disease",
        urgency: "medium"
      },
      'TP53': {
        measures: [
          "Comprehensive cancer screening protocol",
          "Avoid unnecessary radiation exposure",
          "Annual dermatological examination",
          "Breast MRI for females starting age 20",
          "Colonoscopy every 2-5 years starting age 25",
          "Consider whole-body MRI screening"
        ],
        disease: "Li-Fraumeni Syndrome",
        urgency: "high"
      },
      'MLH1': {
        measures: [
          "Colonoscopy every 1-2 years starting age 20-25",
          "Endometrial biopsy annually for females",
          "Upper endoscopy every 3-5 years",
          "Urinalysis annually",
          "Consider prophylactic hysterectomy after childbearing"
        ],
        disease: "Lynch Syndrome",
        urgency: "high"
      },
      'APC': {
        measures: [
          "Colonoscopy annually starting age 10-15",
          "Upper endoscopy every 1-3 years",
          "Thyroid examination annually",
          "Consider prophylactic colectomy",
          "Genetic counseling for family planning"
        ],
        disease: "Familial Adenomatous Polyposis",
        urgency: "high"
      }
    };

    const specificMeasures = [];
    const diseaseInfo = [];
    
    variants.forEach(variant => {
      if (variant.gene && geneMap[variant.gene]) {
        const geneData = geneMap[variant.gene];
        specificMeasures.push(...geneData.measures);
        diseaseInfo.push({
          gene: variant.gene,
          disease: geneData.disease,
          urgency: geneData.urgency
        });
      }
    });

    return {
      measures: [...new Set(specificMeasures)],
      diseases: diseaseInfo
    };
  };

  const preventiveData = getPreventiveMeasures(riskLevel, variants);
  const geneSpecific = getGeneSpecificMeasures(variants);

  return (
    <div className={`card ${preventiveData.color} border-2`}>
      <div className="flex items-center mb-4">
        {preventiveData.icon}
        <h2 className="text-xl font-semibold ml-3">{preventiveData.title}</h2>
      </div>

      <div className="space-y-6">
        {/* General Measures */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3 flex items-center">
            <Heart className="h-5 w-5 mr-2 text-gray-600" />
            General Preventive Measures
          </h3>
          <ul className="space-y-2">
            {preventiveData.measures.map((measure, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">{measure}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Gene-Specific Measures */}
        {geneSpecific.measures.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-gray-600" />
              Gene-Specific Recommendations
            </h3>
            
            {/* Disease Information */}
            {geneSpecific.diseases.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Associated Conditions:</h4>
                <div className="flex flex-wrap gap-2">
                  {geneSpecific.diseases.map((info, index) => (
                    <span key={index} className={`px-3 py-1 rounded-full text-xs font-medium ${
                      info.urgency === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {info.gene}: {info.disease}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <ul className="space-y-2">
              {geneSpecific.measures.map((measure, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{measure}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Emergency Contact */}
        {(riskLevel === 'high' || geneSpecific.diseases.some(d => d.urgency === 'high')) && (
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-900 mb-2">⚠️ Urgent Medical Consultation Required</h4>
            <p className="text-sm text-red-700 mb-2">
              Please consult with a healthcare professional immediately to discuss these results and develop a personalized prevention plan.
            </p>
            <div className="text-xs text-red-600">
              <p>• Schedule appointment with genetic counselor</p>
              <p>• Bring family medical history</p>
              <p>• Consider specialist referrals as recommended</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreventiveMeasures;