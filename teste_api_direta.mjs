import fetch from 'node-fetch';

const API_KEY = 'AIzaSyDNBl0pIYoijn3BvDgLAfNCq44xp2D9ZPQ';

async function testarApiDireta() {
  console.log('🧪 Testando API do Google Gemini diretamente...');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Escreva um roteiro de 2 minutos sobre inteligência artificial no mercado de trabalho."
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        }
      })
    });

    console.log('📡 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro da API:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Resposta da API recebida!');
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const roteiro = data.candidates[0].content.parts[0].text;
      console.log('🎬 Roteiro gerado:');
      console.log('=' .repeat(50));
      console.log(roteiro);
      console.log('=' .repeat(50));
      console.log(`📊 Palavras: ${roteiro.split(' ').length}`);
    } else {
      console.log('⚠️ Estrutura de resposta inesperada:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
  }
}

testarApiDireta();
