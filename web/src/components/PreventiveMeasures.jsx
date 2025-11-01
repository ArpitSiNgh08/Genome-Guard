import React from 'react';
import { Shield, Heart, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

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
      'BRCA1': [
        "Breast MRI screening starting age 25",
        "Consider prophylactic mastectomy",
        "Ovarian cancer screening"
      ],
      'BRCA2': [
        "Enhanced breast cancer screening",
        "Prostate cancer screening for males",
        "Pancreatic cancer awareness"
      ],
      'APOE': [
        "Cognitive assessment annually",
        "Brain-healthy diet (MIND diet)",
        "Mental stimulation activities"
      ],
      'TP53': [
        "Comprehensive cancer screening",
        "Avoid radiation exposure",
        "Regular dermatological exams"
      ]
    };

    const specificMeasures = [];
    variants.forEach(variant => {
      if (variant.gene && geneMap[variant.gene]) {
        specificMeasures.push(...geneMap[variant.gene]);
      }
    });

    return [...new Set(specificMeasures)];
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
        {geneSpecific.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-gray-600" />
              Gene-Specific Recommendations
            </h3>
            <ul className="space-y-2">
              {geneSpecific.map((measure, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{measure}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Emergency Contact */}
        {riskLevel === 'high' && (
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-900 mb-2">⚠️ Important</h4>
            <p className="text-sm text-red-700">
              Please consult with a healthcare professional immediately to discuss these results and develop a personalized prevention plan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreventiveMeasures;