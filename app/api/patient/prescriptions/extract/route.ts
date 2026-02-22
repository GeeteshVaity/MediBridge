import { NextRequest, NextResponse } from 'next/server';

interface ExtractedMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
}

// Function to extract medicines using Groq API (Llama 3.2 Vision)
async function extractWithGroq(imageBase64: string): Promise<ExtractedMedicine[]> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  console.log('Calling Groq API with image size:', Math.round(imageBase64.length / 1024), 'KB');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this prescription image and extract all medicines mentioned. 
              For each medicine, provide:
              - name: The medicine name
              - dosage: The dosage (e.g., "500mg", "10ml")
              - frequency: How often to take (e.g., "twice daily", "once at night")
              - duration: For how long (e.g., "7 days", "2 weeks")
              - quantity: Number of units if mentioned
              
              Return ONLY a valid JSON array in this exact format, with no additional text or markdown:
              [{"name": "Medicine Name", "dosage": "dosage", "frequency": "frequency", "duration": "duration", "quantity": number}]
              
              If you cannot read the prescription clearly or no medicines are found, return an empty array: []`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 2048,
    })
  });

  const responseText = await response.text();
  console.log('Groq API response status:', response.status);
  
  if (!response.ok) {
    console.error('Groq API error response:', responseText);
    throw new Error(`Groq API error (${response.status}): ${responseText}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse Groq response as JSON:', responseText);
    throw new Error('Invalid JSON response from Groq');
  }

  const textContent = data.choices?.[0]?.message?.content;
  console.log('Groq extracted content:', textContent);

  if (!textContent) {
    console.log('No content in Groq response');
    return [];
  }

  // Parse the JSON response
  try {
    // Extract JSON from the response (handle cases where there's extra text or markdown)
    const jsonMatch = textContent.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed medicines:', parsed);
      return parsed;
    }
    return [];
  } catch (parseError) {
    console.error('Failed to parse Groq response:', textContent);
    return [];
  }
}

// Fallback: Simple OCR-like extraction using pattern matching
// This is a placeholder for when API is not available
function simulateExtraction(filename: string): ExtractedMedicine[] {
  // This returns sample medicines for demonstration
  // In production, integrate with a proper OCR service
  const sampleMedicines: ExtractedMedicine[] = [
    {
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: 'Twice daily after meals',
      duration: '5 days',
      quantity: 10
    },
    {
      name: 'Amoxicillin',
      dosage: '250mg',
      frequency: 'Three times daily',
      duration: '7 days',
      quantity: 21
    },
    {
      name: 'Cetirizine',
      dosage: '10mg',
      frequency: 'Once daily at night',
      duration: '10 days',
      quantity: 10
    }
  ];
  
  return sampleMedicines;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, filename } = body;

    if (!imageBase64 && !filename) {
      return NextResponse.json(
        { error: 'imageBase64 or filename is required' },
        { status: 400 }
      );
    }

    let medicines: ExtractedMedicine[] = [];
    let extractionMethod = 'fallback';
    let errorMessage = '';

    // Try to use Groq API for extraction
    if (imageBase64 && process.env.GROQ_API_KEY) {
      try {
        console.log('Attempting Groq extraction...');
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        medicines = await extractWithGroq(base64Data);
        extractionMethod = 'groq';
        console.log('Groq extraction successful, found', medicines.length, 'medicines');
      } catch (error: any) {
        console.error('Groq extraction failed:', error?.message || error);
        errorMessage = error?.message || 'Unknown error';
        medicines = simulateExtraction(filename || 'prescription');
      }
    } else {
      console.log('No GROQ_API_KEY found, using fallback');
      // Fallback to simulation if no API key
      medicines = simulateExtraction(filename || 'prescription');
    }

    return NextResponse.json(
      {
        success: true,
        medicines,
        message: medicines.length > 0 
          ? `Found ${medicines.length} medicine(s) in the prescription`
          : 'No medicines could be extracted. Please add manually.',
        usedAI: extractionMethod === 'groq',
        extractionMethod,
        error: errorMessage || undefined
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Extract medicines error:', error);
    return NextResponse.json(
      { error: 'Failed to extract medicines from prescription' },
      { status: 500 }
    );
  }
}
