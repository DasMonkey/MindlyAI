// Built-in AI Test Suite JavaScript
let sessions = {
  prompt: null,
  translator: null,
  summarizer: null,
  languageDetector: null
};

// Check Chrome version
function checkChromeVersion() {
  try {
    const version = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    const versionEl = document.getElementById('chromeVersion');
    if (versionEl) {
      versionEl.textContent = `Chrome ${version} ${parseInt(version) >= 138 ? '✅' : '⚠️ (Need 138+)'}`;
    }
  } catch (error) {
    console.error('Error checking Chrome version:', error);
  }
}

// Check all APIs
async function checkAllAPIs() {
  console.log('🔍 Starting API checks...');
  console.log('Environment check:', {
    hasAI: 'ai' in self,
    hasLanguageModel: 'LanguageModel' in self,
    hasTranslation: 'translation' in self,
    hasSummarization: 'summarization' in self,
    userAgent: navigator.userAgent
  });
  checkChromeVersion();
  
  try {
    await Promise.all([
      checkPromptAPI(),
      checkTranslatorAPI(),
      checkSummarizerAPI(),
      checkLanguageDetectorAPI(),
      checkWriterAPI(),
      checkRewriterAPI()
    ]);
    console.log('✅ All API checks completed');
  } catch (error) {
    console.error('❌ Error checking APIs:', error);
  }
}

// Update API card status
function updateAPICard(apiName, status, availability) {
  const card = document.getElementById(`${apiName}Card`);
  const statusEl = document.getElementById(`${apiName}Status`);
  const downloadBtn = document.getElementById(`${apiName}DownloadBtn`);

  card.className = 'api-card ' + status;
  statusEl.className = 'api-status ' + status;

  if (status === 'available') {
    statusEl.textContent = '✅ Available';
    if (downloadBtn) {
      downloadBtn.textContent = '✅ Ready - Test It';
      downloadBtn.className = 'success';
    }
    document.getElementById(`${apiName}Test`).style.display = 'block';
  } else if (status === 'downloadable') {
    statusEl.textContent = '📥 Downloadable';
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.textContent = '📥 Download Model';
    }
  } else {
    statusEl.textContent = '❌ Not Available';
    if (downloadBtn) downloadBtn.disabled = true;
  }
}

// Prompt API
async function checkPromptAPI() {
  console.log('Checking Prompt API...', 'LanguageModel' in self);
  if (!('LanguageModel' in self) && !('ai' in self && 'languageModel' in self.ai)) {
    console.log('❌ Prompt API not available');
    updateAPICard('prompt', 'unavailable');
    return;
  }

  try {
    const availability = await self.LanguageModel.availability();
    if (availability === 'readily' || availability === 'available') {
      updateAPICard('prompt', 'available');
      // Auto-create session if model is already available
      if (!sessions.prompt) {
        try {
          sessions.prompt = await self.LanguageModel.create();
          console.log('✅ Prompt session auto-created');
        } catch (error) {
          console.error('Failed to auto-create prompt session:', error);
        }
      }
    } else if (availability === 'after-download' || availability === 'downloadable') {
      updateAPICard('prompt', 'downloadable');
    } else {
      updateAPICard('prompt', 'unavailable');
    }
  } catch (error) {
    console.error('Prompt API check error:', error);
    updateAPICard('prompt', 'unavailable');
  }
}

async function downloadPromptAPI() {
  const btn = document.getElementById('promptDownloadBtn');
  const progress = document.getElementById('promptProgress');
  const progressFill = document.getElementById('promptProgressFill');
  const progressText = document.getElementById('promptProgressText');
  const message = document.getElementById('promptMessage');

  btn.disabled = true;
  progress.style.display = 'block';
  message.className = 'message info';
  message.textContent = '📥 Downloading Gemini Nano model...';
  message.style.display = 'block';

  try {
    sessions.prompt = await self.LanguageModel.create({
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const percent = Math.round(e.loaded * 100);
          progressFill.style.width = percent + '%';
          progressFill.textContent = percent + '%';
          progressText.textContent = `Downloading: ${percent}%`;
        });
      }
    });

    message.className = 'message success';
    message.textContent = '✅ Model downloaded successfully!';
    updateAPICard('prompt', 'available');
  } catch (error) {
    message.className = 'message error';
    message.textContent = '❌ Error: ' + error.message;
    btn.disabled = false;
  }
}

async function testPrompt() {
  const input = document.getElementById('promptInput').value;
  const output = document.getElementById('promptOutput');

  if (!sessions.prompt) {
    output.textContent = '❌ Please download the model first!';
    return;
  }

  output.textContent = '⏳ Generating...';

  try {
    const result = await sessions.prompt.prompt(input);
    output.textContent = result;
  } catch (error) {
    output.textContent = '❌ Error: ' + error.message;
  }
}

// Translator API
async function checkTranslatorAPI() {
  if (!('Translator' in self)) {
    updateAPICard('translator', 'unavailable');
    return;
  }

  try {
    const availability = await self.Translator.availability({
      sourceLanguage: 'en',
      targetLanguage: 'es'
    });

    if (availability === 'readily' || availability === 'available') {
      updateAPICard('translator', 'available');
      if (!sessions.translator) {
        try {
          sessions.translator = await self.Translator.create({
            sourceLanguage: 'en',
            targetLanguage: 'es'
          });
          console.log('✅ Translator session auto-created');
        } catch (error) {
          console.error('Failed to auto-create translator session:', error);
        }
      }
    } else if (availability === 'after-download' || availability === 'downloadable') {
      updateAPICard('translator', 'downloadable');
    } else {
      updateAPICard('translator', 'unavailable');
    }
  } catch (error) {
    console.error('Translator API check error:', error);
    updateAPICard('translator', 'unavailable');
  }
}

async function downloadTranslator() {
  const btn = document.getElementById('translatorDownloadBtn');
  const progress = document.getElementById('translatorProgress');
  const progressFill = document.getElementById('translatorProgressFill');
  const progressText = document.getElementById('translatorProgressText');
  const message = document.getElementById('translatorMessage');

  btn.disabled = true;
  progress.style.display = 'block';
  message.className = 'message info';
  message.textContent = '📥 Downloading translator model...';
  message.style.display = 'block';

  try {
    const sourceLang = document.getElementById('translatorSourceLang').value;
    const targetLang = document.getElementById('translatorTargetLang').value;

    sessions.translator = await self.Translator.create({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const percent = Math.round(e.loaded * 100);
          progressFill.style.width = percent + '%';
          progressFill.textContent = percent + '%';
          progressText.textContent = `Downloading: ${percent}%`;
        });
      }
    });

    message.className = 'message success';
    message.textContent = '✅ Translator model downloaded!';
    updateAPICard('translator', 'available');
  } catch (error) {
    message.className = 'message error';
    message.textContent = '❌ Error: ' + error.message;
    btn.disabled = false;
  }
}

async function testTranslation() {
  const input = document.getElementById('translatorInput').value;
  const output = document.getElementById('translatorOutput');
  const sourceLang = document.getElementById('translatorSourceLang').value;
  const targetLang = document.getElementById('translatorTargetLang').value;

  output.textContent = `⏳ Preparing ${sourceLang} → ${targetLang} translator...`;

  try {
    if (sessions.translator && sessions.translator.destroy) {
      sessions.translator.destroy();
    }

    sessions.translator = await self.Translator.create({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const percent = Math.round(e.loaded * 100);
          output.textContent = `📥 Downloading ${sourceLang} → ${targetLang} pack: ${percent}%`;
        });
      }
    });

    output.textContent = '⏳ Translating...';
    const result = await sessions.translator.translate(input);
    output.textContent = result;
  } catch (error) {
    output.textContent = '❌ Error: ' + error.message;
  }
}

// Summarizer API
async function checkSummarizerAPI() {
  if (!('Summarizer' in self)) {
    updateAPICard('summarizer', 'unavailable');
    return;
  }

  try {
    const availability = await self.Summarizer.availability();

    if (availability === 'readily' || availability === 'available') {
      updateAPICard('summarizer', 'available');
      if (!sessions.summarizer) {
        try {
          sessions.summarizer = await self.Summarizer.create({
            type: 'key-points',
            format: 'markdown',
            length: 'medium'
          });
          console.log('✅ Summarizer session auto-created');
        } catch (error) {
          console.error('Failed to auto-create summarizer session:', error);
        }
      }
    } else if (availability === 'after-download' || availability === 'downloadable') {
      updateAPICard('summarizer', 'downloadable');
    } else {
      updateAPICard('summarizer', 'unavailable');
    }
  } catch (error) {
    console.error('Summarizer API check error:', error);
    updateAPICard('summarizer', 'unavailable');
  }
}

async function downloadSummarizer() {
  const btn = document.getElementById('summarizerDownloadBtn');
  const progress = document.getElementById('summarizerProgress');
  const progressFill = document.getElementById('summarizerProgressFill');
  const progressText = document.getElementById('summarizerProgressText');
  const message = document.getElementById('summarizerMessage');

  btn.disabled = true;
  progress.style.display = 'block';
  message.className = 'message info';
  message.textContent = '📥 Downloading summarizer model...';
  message.style.display = 'block';

  try {
    sessions.summarizer = await self.Summarizer.create({
      type: 'key-points',
      format: 'markdown',
      length: 'medium',
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const percent = Math.round(e.loaded * 100);
          progressFill.style.width = percent + '%';
          progressFill.textContent = percent + '%';
          progressText.textContent = `Downloading: ${percent}%`;
        });
      }
    });

    message.className = 'message success';
    message.textContent = '✅ Summarizer model downloaded!';
    updateAPICard('summarizer', 'available');
  } catch (error) {
    message.className = 'message error';
    message.textContent = '❌ Error: ' + error.message;
    btn.disabled = false;
  }
}

async function testSummarization() {
  const input = document.getElementById('summarizerInput').value;
  const output = document.getElementById('summarizerOutput');

  if (!sessions.summarizer) {
    output.textContent = '❌ Please download the summarizer model first!';
    return;
  }

  output.textContent = '⏳ Summarizing...';

  try {
    const result = await sessions.summarizer.summarize(input);
    output.textContent = result;
  } catch (error) {
    output.textContent = '❌ Error: ' + error.message;
  }
}

// Language Detector API
async function checkLanguageDetectorAPI() {
  if (!('LanguageDetector' in self)) {
    updateAPICard('languageDetector', 'unavailable');
    return;
  }

  try {
    const availability = await self.LanguageDetector.availability();

    if (availability === 'readily' || availability === 'available') {
      updateAPICard('languageDetector', 'available');
      if (!sessions.languageDetector) {
        try {
          sessions.languageDetector = await self.LanguageDetector.create();
          console.log('✅ Language Detector session auto-created');
        } catch (error) {
          console.error('Failed to auto-create language detector session:', error);
        }
      }
    } else if (availability === 'after-download' || availability === 'downloadable') {
      updateAPICard('languageDetector', 'downloadable');
    } else {
      updateAPICard('languageDetector', 'unavailable');
    }
  } catch (error) {
    console.error('Language Detector API check error:', error);
    updateAPICard('languageDetector', 'unavailable');
  }
}

async function downloadLanguageDetector() {
  const btn = document.getElementById('languageDetectorDownloadBtn');
  const progress = document.getElementById('languageDetectorProgress');
  const progressFill = document.getElementById('languageDetectorProgressFill');
  const progressText = document.getElementById('languageDetectorProgressText');
  const message = document.getElementById('languageDetectorMessage');

  btn.disabled = true;
  progress.style.display = 'block';
  message.className = 'message info';
  message.textContent = '📥 Downloading language detector model...';
  message.style.display = 'block';

  try {
    sessions.languageDetector = await self.LanguageDetector.create({
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const percent = Math.round(e.loaded * 100);
          progressFill.style.width = percent + '%';
          progressFill.textContent = percent + '%';
          progressText.textContent = `Downloading: ${percent}%`;
        });
      }
    });

    message.className = 'message success';
    message.textContent = '✅ Language detector model downloaded!';
    updateAPICard('languageDetector', 'available');
  } catch (error) {
    message.className = 'message error';
    message.textContent = '❌ Error: ' + error.message;
    btn.disabled = false;
  }
}

async function testLanguageDetection() {
  const input = document.getElementById('languageDetectorInput').value;
  const output = document.getElementById('languageDetectorOutput');

  if (!sessions.languageDetector) {
    output.textContent = '❌ Please download the language detector model first!';
    return;
  }

  output.textContent = '⏳ Detecting language...';

  try {
    const results = await sessions.languageDetector.detect(input);
    let resultText = 'Detected Languages:\n\n';
    for (const result of results.slice(0, 5)) {
      const confidence = (result.confidence * 100).toFixed(1);
      resultText += `${result.detectedLanguage}: ${confidence}%\n`;
    }
    output.textContent = resultText;
  } catch (error) {
    output.textContent = '❌ Error: ' + error.message;
  }
}

// Writer API (Origin Trial)
async function checkWriterAPI() {
  if (!('Writer' in self)) {
    updateAPICard('writer', 'unavailable');
    return;
  }

  try {
    const availability = await self.Writer.availability();
    if (availability === 'readily' || availability === 'available') {
      updateAPICard('writer', 'available');
    } else {
      updateAPICard('writer', 'downloadable');
    }
  } catch (error) {
    updateAPICard('writer', 'unavailable');
  }
}

// Rewriter API (Origin Trial)
async function checkRewriterAPI() {
  if (!('Rewriter' in self)) {
    updateAPICard('rewriter', 'unavailable');
    return;
  }

  try {
    const availability = await self.Rewriter.availability();
    if (availability === 'readily' || availability === 'available') {
      updateAPICard('rewriter', 'available');
    } else {
      updateAPICard('rewriter', 'downloadable');
    }
  } catch (error) {
    updateAPICard('rewriter', 'unavailable');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Refresh all button
  document.getElementById('refreshAllBtn')?.addEventListener('click', checkAllAPIs);
  
  // Download buttons
  document.getElementById('promptDownloadBtn')?.addEventListener('click', downloadPromptAPI);
  document.getElementById('translatorDownloadBtn')?.addEventListener('click', downloadTranslator);
  document.getElementById('summarizerDownloadBtn')?.addEventListener('click', downloadSummarizer);
  document.getElementById('languageDetectorDownloadBtn')?.addEventListener('click', downloadLanguageDetector);
  
  // Test buttons
  document.getElementById('testPromptBtn')?.addEventListener('click', testPrompt);
  document.getElementById('testTranslationBtn')?.addEventListener('click', testTranslation);
  document.getElementById('testSummarizationBtn')?.addEventListener('click', testSummarization);
  document.getElementById('testLanguageDetectionBtn')?.addEventListener('click', testLanguageDetection);
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setTimeout(checkAllAPIs, 100);
  });
} else {
  setupEventListeners();
  setTimeout(checkAllAPIs, 100);
}
