// YouTube Video Summary Feature
// Injects a summary panel above the suggested videos sidebar

class YouTubeSummary {
  constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log(`🆕 YouTubeSummary instance created: ${this.instanceId}`);
    this.videoId = null;
    this.transcript = null;
    this.summaryPanel = null;
    this.apiKey = null;
    this.currentSummary = null;
    this.init();
  }

  async init() {
    // Only run on YouTube watch pages
    if (!this.isYouTubeWatchPage()) return;

    // Check AI provider settings - buttons should show regardless of provider
    const providerSettings = await this.getProviderSettings();
    this.preferredProvider = providerSettings.preferredProvider || 'builtin';
    this.apiKey = providerSettings.apiKey; // For cloud API fallback

    console.log('YouTube Summary: Using provider:', this.preferredProvider);

    // Extract video ID
    this.videoId = this.getVideoId();
    if (!this.videoId) return;

    // Wait for YouTube's secondary sidebar to load
    this.waitForElement('#secondary', (secondaryDiv) => {
      this.injectSummaryPanel(secondaryDiv);
    });

    // Handle YouTube's SPA navigation
    this.setupNavigationListener();
  }

  isYouTubeWatchPage() {
    return window.location.hostname.includes('youtube.com') &&
      window.location.pathname === '/watch';
  }

  getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        resolve(result.geminiApiKey);
      });
    });
  }

  async getProviderSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['preferredProvider', 'geminiApiKey'], (result) => {
        resolve({
          preferredProvider: result.preferredProvider || 'builtin',
          apiKey: result.geminiApiKey
        });
      });
    });
  }

  waitForElement(selector, callback) {
    const element = document.querySelector(selector);
    if (element) {
      callback(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        callback(element);
        obs.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  injectSummaryPanel(secondaryDiv) {
    // Remove ALL existing panels (in case of duplicate instances)
    const existingPanels = document.querySelectorAll('#yt-ai-summary-panel');
    existingPanels.forEach(panel => panel.remove());

    // Also remove this instance's panel reference
    if (this.summaryPanel) {
      this.summaryPanel.remove();
    }

    // Create summary panel
    this.summaryPanel = document.createElement('div');
    this.summaryPanel.id = 'yt-ai-summary-panel';
    this.summaryPanel.innerHTML = `
      <div class="yt-summary-header">
        <div class="yt-summary-title">
          <img src="${chrome.runtime.getURL('icons/Mentelo-logo-wh.png')}" class="yt-summary-icon" alt="Mentelo">
          <span>Mentelo</span>
        </div>
        <button class="yt-summary-collapse" title="Collapse">−</button>
      </div>
      
      <div class="yt-summary-content">
        <div class="yt-summary-buttons">
          <button class="yt-summary-btn" data-action="tldr">
            <span class="yt-btn-icon">⚡</span>
            <span class="yt-btn-text">TLDR</span>
          </button>
          <button class="yt-summary-btn" data-action="detailed">
            <span class="yt-btn-icon">📝</span>
            <span class="yt-btn-text">Detailed</span>
          </button>
          <button class="yt-summary-btn" data-action="concepts">
            <span class="yt-btn-icon">📚</span>
            <span class="yt-btn-text">Concepts</span>
          </button>
          <button class="yt-summary-btn" data-action="chapters">
            <span class="yt-btn-icon">⏱️</span>
            <span class="yt-btn-text">Chapters</span>
          </button>
          <button class="yt-summary-btn" data-action="takeaways">
            <span class="yt-btn-icon">💡</span>
            <span class="yt-btn-text">Takeaways</span>
          </button>
          <button class="yt-summary-btn" data-action="notes">
            <span class="yt-btn-icon">📋</span>
            <span class="yt-btn-text">Notes</span>
          </button>
        </div>

        <div class="yt-summary-result" style="display: none;">
          <div class="yt-result-header">
            <span class="yt-result-title"></span>
            <div class="yt-result-actions">
              <button class="yt-result-btn" data-action="copy" title="Copy to clipboard">
                📋
              </button>
              <button class="yt-result-btn" data-action="close" title="Close">
                ✕
              </button>
            </div>
          </div>
          <div class="yt-result-content"></div>
        </div>

        <div class="yt-summary-loading" style="display: none;">
          <div class="yt-loading-spinner"></div>
          <span class="yt-loading-text">Analyzing video...</span>
        </div>

        <div class="yt-summary-error" style="display: none;">
          <span class="yt-error-icon">⚠️</span>
          <span class="yt-error-text"></span>
        </div>
      </div>
    `;

    // Insert at the top of secondary sidebar
    secondaryDiv.insertBefore(this.summaryPanel, secondaryDiv.firstChild);

    // Restore collapsed state
    const isCollapsed = localStorage.getItem('yt-summary-collapsed') === 'true';
    if (isCollapsed) {
      const content = this.summaryPanel.querySelector('.yt-summary-content');
      const collapseBtn = this.summaryPanel.querySelector('.yt-summary-collapse');
      content.style.display = 'none';
      collapseBtn.textContent = '+';
    }

    // Add event listeners
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Collapse/expand - entire header is clickable
    const header = this.summaryPanel.querySelector('.yt-summary-header');
    const collapseBtn = this.summaryPanel.querySelector('.yt-summary-collapse');
    const content = this.summaryPanel.querySelector('.yt-summary-content');

    const toggleCollapse = (e) => {
      // Prevent double-triggering if clicking the button directly
      e.stopPropagation();

      const isCollapsed = content.style.display === 'none';

      if (isCollapsed) {
        // Expanding
        content.style.display = 'block';
        content.style.maxHeight = '0px';
        content.style.opacity = '0';

        // Force reflow to ensure the initial state is applied
        content.offsetHeight;

        // Trigger animation
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';

        collapseBtn.textContent = '−';
        localStorage.setItem('yt-summary-collapsed', 'false');
      } else {
        // Collapsing - set explicit height first
        const currentHeight = content.scrollHeight;
        content.style.maxHeight = currentHeight + 'px';

        // Force reflow to ensure the height is set before transition
        content.offsetHeight;

        // Now trigger the collapse animation
        content.style.maxHeight = '0px';
        content.style.opacity = '0';

        // Hide after animation completes
        setTimeout(() => {
          content.style.display = 'none';
        }, 300);

        collapseBtn.textContent = '+';
        localStorage.setItem('yt-summary-collapsed', 'true');
      }
    };

    // Make entire header clickable
    header.addEventListener('click', toggleCollapse);

    // Summary action buttons - use event delegation to avoid duplicate listeners
    const buttonsContainer = this.summaryPanel.querySelector('.yt-summary-buttons');
    if (buttonsContainer) {
      buttonsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.yt-summary-btn');
        if (btn) {
          const action = btn.dataset.action;
          this.handleSummaryAction(action);
        }
      });
    }

    // Result action buttons
    this.summaryPanel.querySelector('[data-action="copy"]').addEventListener('click', () => {
      this.copyToClipboard();
    });

    this.summaryPanel.querySelector('[data-action="close"]').addEventListener('click', () => {
      this.hideResult();
    });
  }

  async handleSummaryAction(action) {
    console.log(`🎯 Instance ${this.instanceId} handling action: ${action}`);

    // Hide previous results and errors
    this.hideResult();
    this.hideError();

    // Show loading
    this.showLoading();

    try {
      // Extract transcript if not already done
      if (!this.transcript) {
        console.log('📝 Attempting to extract transcript...');
        this.transcript = await this.extractTranscript();
      }

      if (!this.transcript) {
        console.error('❌ No transcript available');
        throw new Error('No captions available for this video.\n\nTip: If captions exist, try opening the Transcript panel manually first, then click the button again.');
      }

      console.log('✅ Transcript available, length:', this.transcript.length);

      // Generate summary based on action
      console.log('🤖 Generating summary for action:', action);
      const summary = await this.generateSummary(action);

      if (!summary) {
        throw new Error('Failed to generate summary');
      }

      console.log('✅ Summary generated successfully');

      // Display result
      this.showResult(action, summary);

    } catch (error) {
      console.error('❌ YouTube Summary Error:', error);
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  async extractTranscript() {
    try {
      console.log('🎬 Starting transcript extraction...');

      // SIMPLE METHOD: Just use the transcript panel
      // This is the most reliable method that actually works
      const panelTranscript = await this.extractFromTranscriptPanel();
      if (panelTranscript) {
        console.log('✅ Transcript extracted successfully');
        window.youtubeTranscript = panelTranscript;
        return panelTranscript;
      }

      console.log('❌ No transcript available');
      return null;
    } catch (error) {
      console.error('❌ Transcript extraction error:', error);
      return null;
    }
  }

  async extractFromYTInitialData() {
    try {
      console.log('🔍 Searching for ytInitialPlayerResponse...');

      // Look for ytInitialPlayerResponse in page scripts
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent;
        if (content.includes('ytInitialPlayerResponse')) {
          // Try multiple regex patterns for different YouTube structures
          const patterns = [
            /var ytInitialPlayerResponse = (\{.+?\});/,
            /ytInitialPlayerResponse\s*=\s*(\{.+?\});/,
            /"ytInitialPlayerResponse":(\{.+?\}),"/
          ];

          for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
              try {
                const data = JSON.parse(match[1]);
                const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

                if (captionTracks && captionTracks.length > 0) {
                  console.log('✅ Found', captionTracks.length, 'caption tracks in ytInitialPlayerResponse');

                  // Prefer English captions, or take the first available
                  const track = captionTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en')) || captionTracks[0];
                  console.log('📝 Selected track:', track.languageCode, track.name?.simpleText);

                  if (track && track.baseUrl) {
                    const transcript = await this.fetchViaBackground(track.baseUrl);
                    if (transcript) {
                      console.log('✅ Transcript fetched successfully, length:', transcript.length);
                      return transcript;
                    }
                  }
                }
              } catch (parseError) {
                console.log('Failed to parse with pattern, trying next...');
                continue;
              }
            }
          }
        }
      }

      console.log('❌ No ytInitialPlayerResponse found');
      return null;
    } catch (error) {
      console.error('❌ Error extracting from ytInitialData:', error);
      return null;
    }
  }

  async extractFromTranscriptPanel() {
    try {
      console.log('🔍 Looking for transcript...');

      // Check if transcript is already loaded in DOM - be specific to avoid duplicates
      const engagementPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
      let segments = engagementPanel
        ? engagementPanel.querySelectorAll('ytd-transcript-segment-renderer')
        : document.querySelectorAll('ytd-transcript-segment-renderer');

      if (segments.length > 0) {
        console.log(`✅ Transcript already loaded, extracting from ${segments.length} segments...`);
        return this.extractSegmentsFromDOM(segments);
      }

      // Find the main Transcript button (the one that opens the panel)
      const buttons = document.querySelectorAll('button');
      let transcriptButton = null;

      for (const button of buttons) {
        const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
        const buttonText = (button.textContent || '').toLowerCase();

        // Look for the main transcript button (not inside a panel)
        if ((ariaLabel.includes('transcript') || buttonText.includes('transcript')) &&
          !button.closest('ytd-engagement-panel-section-list-renderer')) {
          transcriptButton = button;
          break;
        }
      }

      if (!transcriptButton) {
        console.log('❌ Transcript button not found');
        return null;
      }

      console.log('✅ Found transcript button, clicking to open panel...');
      transcriptButton.click();

      // Wait for panel to open
      await new Promise(resolve => setTimeout(resolve, 800));

      // WORKAROUND: Click Chapters then Transcript to force proper loading
      // This fixes the "loading transcript" stuck issue
      const chaptersTab = Array.from(document.querySelectorAll('button')).find(btn => {
        const text = (btn.textContent || '').toLowerCase().trim();
        return text === 'chapters' && btn.closest('ytd-engagement-panel-section-list-renderer');
      });

      if (chaptersTab) {
        console.log('🔄 Clicking Chapters tab to force refresh...');
        chaptersTab.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Now click Transcript tab to load the actual transcript
      const transcriptTab = Array.from(document.querySelectorAll('button')).find(btn => {
        const text = (btn.textContent || '').toLowerCase().trim();
        return text === 'transcript' && btn.closest('ytd-engagement-panel-section-list-renderer');
      });

      if (transcriptTab) {
        console.log('✅ Clicking Transcript tab to load content...');
        transcriptTab.click();
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Poll for transcript segments
      let attempts = 0;
      const maxAttempts = 30; // 15 seconds

      console.log('⏳ Waiting for transcript to load...');
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Only get segments from the visible engagement panel to avoid duplicates
        const engagementPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
        if (engagementPanel) {
          segments = engagementPanel.querySelectorAll('ytd-transcript-segment-renderer');
        } else {
          // Fallback to all segments if panel not found
          segments = document.querySelectorAll('ytd-transcript-segment-renderer');
        }

        if (segments.length > 0) {
          console.log(`✅ Transcript loaded after ${(attempts + 1) * 500}ms`);
          console.log(`📊 Found ${segments.length} segments in ${engagementPanel ? 'engagement panel' : 'document'}`);
          break;
        }
        attempts++;
      }

      if (segments.length === 0) {
        console.log('❌ Transcript did not load after 15 seconds');
        return null;
      }

      // Extract and leave panel open
      const transcript = this.extractSegmentsFromDOM(segments);
      console.log('✅ Transcript extracted, leaving panel open');

      return transcript;
    } catch (error) {
      console.error('❌ Error extracting transcript:', error);
      return null;
    }
  }

  extractSegmentsFromDOM(segments) {
    console.log(`📝 Extracting from ${segments.length} transcript segments`);

    let transcript = '';
    let segmentCount = 0;
    const seenSegments = new Set(); // Track seen segments to avoid duplicates

    segments.forEach(segment => {
      const timestampEl = segment.querySelector('.segment-timestamp');
      const textEl = segment.querySelector('.segment-text');

      if (timestampEl && textEl) {
        const timestamp = timestampEl.textContent.trim();
        const text = textEl.textContent.trim();
        const segmentKey = `${timestamp}:${text}`; // Unique key for this segment

        // Skip if we've already seen this exact segment (silently)
        if (seenSegments.has(segmentKey)) {
          return;
        }

        seenSegments.add(segmentKey);
        transcript += `[${timestamp}] ${text}\n`;
        segmentCount++;
      }
    });

    console.log(`✅ Extracted ${segmentCount} segments, total length: ${transcript.length} chars`);
    console.log(`📊 Average chars per segment: ${Math.round(transcript.length / segmentCount)}`);

    // Check for duplication in the final transcript
    const halfLength = Math.floor(transcript.length / 2);
    const firstHalf = transcript.substring(0, halfLength);
    const secondHalf = transcript.substring(halfLength);
    if (firstHalf === secondHalf) {
      console.error('🚨 DUPLICATION DETECTED in final transcript! Deduplicating...');
      transcript = firstHalf;
    }

    return transcript.length > 0 ? transcript : null;
  }

  async fetchViaBackground(url) {
    try {
      console.log('Fetching via background script:', url);

      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'fetchTranscript',
          url: url
        }, (response) => {
          if (response && response.success && response.data) {
            resolve(this.parseTranscriptXML(response.data));
          } else {
            console.log('Background fetch failed:', response?.error);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error fetching via background:', error);
      return null;
    }
  }

  async fetchTranscriptDirectly() {
    try {
      // Construct YouTube timedtext API URL
      const url = `https://www.youtube.com/api/timedtext?v=${this.videoId}&lang=en`;
      console.log('Trying direct API:', url);

      const response = await fetch(url);
      if (!response.ok) {
        console.log('Direct API failed, trying with auto-generated captions');
        // Try with auto-generated captions
        const autoUrl = `https://www.youtube.com/api/timedtext?v=${this.videoId}&lang=en&kind=asr`;
        const autoResponse = await fetch(autoUrl);
        if (!autoResponse.ok) {
          return null;
        }
        const xmlText = await autoResponse.text();
        return this.parseTranscriptXML(xmlText);
      }

      const xmlText = await response.text();
      return this.parseTranscriptXML(xmlText);
    } catch (error) {
      console.error('Direct transcript fetch error:', error);
      return null;
    }
  }

  parseTranscriptXML(xmlText) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const textNodes = xmlDoc.querySelectorAll('text');

      if (textNodes.length === 0) {
        console.log('No text nodes found in XML');
        return null;
      }

      console.log('Found', textNodes.length, 'text nodes');

      let transcript = '';
      textNodes.forEach((node, index) => {
        // Get raw text content (browser automatically decodes HTML entities)
        let text = node.textContent
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (text) {
          const start = parseFloat(node.getAttribute('start'));
          if (!isNaN(start)) {
            const minutes = Math.floor(start / 60);
            const seconds = Math.floor(start % 60);
            const timestamp = `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
            transcript += `${timestamp} ${text}\n`;
          } else {
            transcript += `${text}\n`;
          }
        }
      });

      if (transcript.length > 0) {
        console.log('Transcript created, length:', transcript.length);
        return transcript;
      }

      console.log('Transcript is empty after parsing');
      return null;
    } catch (error) {
      console.error('XML parsing error:', error);
      return null;
    }
  }

  async getCaptionTracks() {
    try {
      // YouTube stores caption tracks in the player response
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent;
        if (content.includes('captionTracks')) {
          // Try multiple regex patterns for different YouTube structures
          const patterns = [
            /"captionTracks":\s*(\[\{[^\]]+\}\])/,
            /"captionTracks":(\[[^\]]+\])/,
            /captionTracks":\s*(\[.*?\}\])/s
          ];

          for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
              try {
                const tracks = JSON.parse(match[1]);
                if (tracks && tracks.length > 0) {
                  console.log('Found caption tracks:', tracks);
                  return tracks;
                }
              } catch (e) {
                console.log('Failed to parse caption tracks with pattern, trying next...');
                continue;
              }
            }
          }
        }
      }

      // Fallback: Try to find ytInitialPlayerResponse
      for (const script of scripts) {
        const content = script.textContent;
        if (content.includes('ytInitialPlayerResponse')) {
          try {
            const match = content.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
            if (match) {
              const data = JSON.parse(match[1]);
              const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
              if (tracks && tracks.length > 0) {
                console.log('Found caption tracks via ytInitialPlayerResponse:', tracks);
                return tracks;
              }
            }
          } catch (e) {
            console.log('Failed to parse ytInitialPlayerResponse');
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting caption tracks:', error);
      return null;
    }
  }

  async fetchCaptionData(baseUrl) {
    try {
      console.log('Fetching captions from:', baseUrl);
      const response = await fetch(baseUrl);

      if (!response.ok) {
        console.log('Caption fetch failed with status:', response.status);
        return null;
      }

      const xmlText = await response.text();
      console.log('XML response length:', xmlText.length);
      console.log('XML preview:', xmlText.substring(0, 200));

      if (!xmlText || xmlText.length === 0) {
        console.log('Empty XML response');
        return null;
      }

      // Use the shared XML parser
      return this.parseTranscriptXML(xmlText);
    } catch (error) {
      console.error('Error fetching caption data:', error);
      return null;
    }
  }

  extractTranscriptFromPage() {
    // Fallback: Try to extract any visible transcript data from the page
    // This is a simplified version - YouTube's structure may vary
    try {
      const transcriptElements = document.querySelectorAll('ytd-transcript-segment-renderer');
      if (transcriptElements.length > 0) {
        let transcript = '';
        transcriptElements.forEach(el => {
          const timestamp = el.querySelector('.segment-timestamp')?.textContent || '';
          const text = el.querySelector('.segment-text')?.textContent || '';
          transcript += `${timestamp} ${text}\n`;
        });
        return transcript;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async generateSummary(action) {
    const MAX_CHUNK_SIZE = 26000; // Increased for better performance - fits most videos in one chunk

    console.log('📊 Summary generation:', {
      provider: this.preferredProvider,
      transcriptLength: this.transcript.length,
      hasApiKey: !!this.apiKey
    });

    // ALWAYS use chunking for Built-in AI with long transcripts
    // This prevents QuotaExceededError even if Cloud API key exists
    const needsChunking = this.preferredProvider === 'builtin' && this.transcript.length > MAX_CHUNK_SIZE;

    console.log(`🔍 Chunking decision: transcript=${this.transcript.length} chars, max=${MAX_CHUNK_SIZE}, needsChunking=${needsChunking}`);

    if (needsChunking) {
      console.log(`📦 Transcript is long (${this.transcript.length} chars > ${MAX_CHUNK_SIZE}), using chunked processing`);
      return await this.generateSummaryChunked(action);
    }

    // For Cloud API or short transcripts, process normally
    console.log(`📝 Processing full transcript (${this.transcript.length} chars ≤ ${MAX_CHUNK_SIZE}) in single request`);

    const prompts = {
      tldr: `Create a concise TLDR summary of this video transcript with 3-5 bullet points highlighting the most important information. Make it quick to read and understand.\n\nTranscript:\n${this.transcript}`,

      detailed: `Create a detailed, comprehensive summary of this video with clear sections. Include main topics discussed, key points, and important timestamps. Format with proper headings and structure.\n\nTranscript:\n${this.transcript}`,

      concepts: `Identify and explain the key concepts, terms, and topics discussed in this video. For each concept, provide a clear, concise explanation. Format as a list with concept names in bold.\n\nTranscript:\n${this.transcript}`,

      chapters: `Generate timestamped chapters for this video. Create 5-8 chapters that divide the content into logical sections. Format as: [timestamp] - Chapter title and brief description.\n\nTranscript:\n${this.transcript}`,

      takeaways: `Extract the main takeaways and actionable insights from this video. List 4-6 key lessons or action items that viewers should remember. Format as numbered points.\n\nTranscript:\n${this.transcript}`,

      notes: `Create a structured study guide or notes template from this video. Include: Overview, Main Topics (with sub-points), Key Terms, and Summary. Format for easy note-taking.\n\nTranscript:\n${this.transcript}`,

      social: `Create 3 social media posts from this video:\n1. A Twitter/X post (280 chars max, include 2-3 hashtags)\n2. A LinkedIn post (professional tone, 2-3 paragraphs)\n3. An Instagram caption (engaging, with emojis and 5-8 hashtags)\n\nTranscript:\n${this.transcript}`
    };

    const prompt = prompts[action];

    console.log('� Tralnscript character count:', this.transcript.length);
    console.log('📏 Prompt character count:', prompt.length);

    try {
      // Use AI Provider Manager via background script (respects user's provider choice)
      console.log('📤 Generating summary using AI Provider Manager');
      console.log('📍 Preferred provider:', this.preferredProvider);

      const response = await new Promise((resolve, reject) => {
        // Add timeout to prevent hanging forever
        const timeout = setTimeout(() => {
          reject(new Error('Request timed out after 60 seconds'));
        }, 60000);

        chrome.runtime.sendMessage({
          action: 'generateContent',
          task: 'youtubeSummary',
          prompt: prompt
        }, (response) => {
          clearTimeout(timeout);

          console.log('📥 Received response from background:', response);

          if (chrome.runtime.lastError) {
            console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.error) {
            console.error('❌ Response contains error:', response.error);
            reject(new Error(response.error));
          } else if (response?.result) {
            console.log('✅ Response contains result, length:', response.result?.length);
            resolve(response.result);
          } else {
            console.error('❌ Invalid response structure:', response);
            reject(new Error('No response from background script'));
          }
        });
      });

      console.log('✅ Summary generated successfully');
      return response;
    } catch (error) {
      console.error('❌ Summary generation error:', error);
      console.error('❌ Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Just throw the original error - don't mask it
      throw error;
    }
  }

  async generateSummaryChunked(action) {
    const MAX_CHUNK_SIZE = 26000; // Match the size from generateSummary
    const chunks = [];

    // Split transcript into chunks
    for (let i = 0; i < this.transcript.length; i += MAX_CHUNK_SIZE) {
      chunks.push(this.transcript.substring(i, i + MAX_CHUNK_SIZE));
    }

    console.log(`📦 Split transcript into ${chunks.length} chunks (${MAX_CHUNK_SIZE} chars each)`);

    // Process each chunk (no UI updates - just console logs)
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔄 Processing chunk ${i + 1}/${chunks.length}...`);
      console.log(`� Chunk  ${i + 1} transcript length:`, chunks[i].length, 'chars');

      const chunkPrompt = this.buildChunkPrompt(action, chunks[i], i + 1, chunks.length);
      console.log(`📏 Chunk ${i + 1} prompt length:`, chunkPrompt.length, 'chars');

      try {
        const response = await new Promise((resolve, reject) => {
          // Add timeout to prevent hanging forever
          const timeout = setTimeout(() => {
            reject(new Error(`Chunk ${i + 1} timed out after 60 seconds`));
          }, 60000);

          chrome.runtime.sendMessage({
            action: 'generateContent',
            task: 'youtubeSummary',
            prompt: chunkPrompt
          }, (response) => {
            clearTimeout(timeout);

            console.log(`📥 Chunk ${i + 1} received response:`, response);

            if (chrome.runtime.lastError) {
              console.error(`❌ Chunk ${i + 1} Chrome runtime error:`, chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response?.error) {
              console.error(`❌ Chunk ${i + 1} response contains error:`, response.error);
              reject(new Error(response.error));
            } else if (response?.result) {
              console.log(`✅ Chunk ${i + 1} response contains result, length:`, response.result?.length);
              resolve(response.result);
            } else {
              reject(new Error('No response from background script'));
            }
          });
        });

        chunkSummaries.push(response);
        console.log(`✅ Chunk ${i + 1} processed`);

      } catch (error) {
        console.error(`❌ Error processing chunk ${i + 1}:`, error);

        // Provide helpful error messages for common issues
        if (error.message.includes('Both providers are unavailable')) {
          throw new Error('Built-in AI is not available. Please ensure Chrome has the necessary AI models downloaded, or switch to Cloud API in settings.');
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          throw new Error('AI quota exceeded. Please wait a moment and try again, or try a shorter video.');
        }

        throw error;
      }
    }

    // Combine chunk summaries
    console.log('🔗 Combining chunk summaries...');
    return await this.combineSummaries(action, chunkSummaries);
  }

  buildChunkPrompt(action, chunk, chunkNum, totalChunks) {
    const chunkInfo = totalChunks > 1 ? `\n\n[This is part ${chunkNum} of ${totalChunks} of the transcript]` : '';

    const prompts = {
      tldr: `Summarize the key points from this part of a video transcript. Focus on the main ideas and important information.${chunkInfo}\n\nTranscript:\n${chunk}`,

      detailed: `Provide a detailed summary of this part of the video. Include main topics and key points discussed.${chunkInfo}\n\nTranscript:\n${chunk}`,

      concepts: `Identify and explain the key concepts and topics in this part of the video.${chunkInfo}\n\nTranscript:\n${chunk}`,

      chapters: `Identify the main topics and timestamps in this part of the video.${chunkInfo}\n\nTranscript:\n${chunk}`,

      takeaways: `Extract the main takeaways and insights from this part of the video.${chunkInfo}\n\nTranscript:\n${chunk}`,

      notes: `Create notes for this part of the video, including main topics and key points.${chunkInfo}\n\nTranscript:\n${chunk}`,

      social: `Extract the most interesting and shareable content from this part of the video.${chunkInfo}\n\nTranscript:\n${chunk}`
    };

    return prompts[action];
  }

  async combineSummaries(action, summaries) {
    if (summaries.length === 1) {
      return summaries[0];
    }

    // Combine all chunk summaries
    const combined = summaries.join('\n\n---\n\n');

    // Create a final synthesis prompt
    const synthesisPrompts = {
      tldr: `Based on these summaries from different parts of a video, create a unified TLDR with 3-5 bullet points:\n\n${combined}`,

      detailed: `Combine these summaries into a cohesive detailed summary with clear sections:\n\n${combined}`,

      concepts: `Combine these concepts into a unified list, removing duplicates:\n\n${combined}`,

      chapters: `Organize these topics into 5-8 timestamped chapters:\n\n${combined}`,

      takeaways: `Combine these takeaways into a unified list of 4-6 main points:\n\n${combined}`,

      notes: `Combine these notes into a structured study guide:\n\n${combined}`,

      social: `Based on this content, create 3 social media posts (Twitter, LinkedIn, Instagram):\n\n${combined}`
    };

    const synthesisPrompt = synthesisPrompts[action];

    console.log('🎯 Creating final synthesis...');

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'generateContent',
          task: 'youtubeSummary',
          prompt: synthesisPrompt
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.error) {
            reject(new Error(response.error));
          } else if (response?.result) {
            resolve(response.result);
          } else {
            reject(new Error('No response from background script'));
          }
        });
      });

      console.log('✅ Final synthesis complete');
      return response;
    } catch (error) {
      console.error('❌ Error in synthesis:', error);
      // Don't return combined summaries - they're not user-friendly
      // Instead, return a simple error message
      throw new Error('Failed to create final summary. Please try again.');
    }
  }

  async generateSummaryWithCloudAPI(prompt) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('❌ Cloud API fallback error:', error);
      throw error;
    }
  }

  showLoading() {
    const loading = this.summaryPanel.querySelector('.yt-summary-loading');
    loading.style.display = 'flex';
  }

  hideLoading() {
    const loading = this.summaryPanel.querySelector('.yt-summary-loading');
    loading.style.display = 'none';
  }

  showResult(action, summary) {
    const resultDiv = this.summaryPanel.querySelector('.yt-summary-result');
    const titleSpan = this.summaryPanel.querySelector('.yt-result-title');
    const contentDiv = this.summaryPanel.querySelector('.yt-result-content');

    const titles = {
      tldr: '⚡ TLDR Summary',
      detailed: '📝 Detailed Summary',
      concepts: '📚 Key Concepts',
      chapters: '⏱️ Video Chapters',
      takeaways: '💡 Main Takeaways',
      notes: '📋 Study Notes',
      social: '📱 Social Media Posts'
    };

    titleSpan.textContent = titles[action];

    // Format the content with proper line breaks and styling
    const formattedContent = this.formatSummaryContent(summary, action);
    contentDiv.innerHTML = formattedContent;

    // Store current summary for copying
    this.currentSummary = summary;

    // Show result
    resultDiv.style.display = 'block';

    // Add click listeners for timestamps (for chapters action)
    if (action === 'chapters') {
      this.attachTimestampListeners(contentDiv);
    }
  }

  formatSummaryContent(text, action) {
    // Convert markdown-style formatting to HTML
    let formatted = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Wrap in paragraph tags
    formatted = `<p>${formatted}</p>`;

    // Make timestamps clickable for chapters
    if (action === 'chapters') {
      formatted = formatted.replace(/\[(\d+):(\d+)\]/g,
        '<span class="yt-timestamp" data-time="$1:$2">[$1:$2]</span>');
    }

    return formatted;
  }

  attachTimestampListeners(contentDiv) {
    const timestamps = contentDiv.querySelectorAll('.yt-timestamp');
    timestamps.forEach(ts => {
      ts.style.cursor = 'pointer';
      ts.style.color = '#3ea6ff';
      ts.style.textDecoration = 'underline';

      ts.addEventListener('click', () => {
        const time = ts.dataset.time;
        this.seekToTimestamp(time);
      });
    });
  }

  seekToTimestamp(timeString) {
    // Parse timestamp (format: "MM:SS")
    const [minutes, seconds] = timeString.split(':').map(Number);
    const totalSeconds = minutes * 60 + seconds;

    // Get YouTube video player and seek
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = totalSeconds;
      video.play();
    }
  }

  hideResult() {
    const resultDiv = this.summaryPanel.querySelector('.yt-summary-result');
    resultDiv.style.display = 'none';
  }

  showError(message) {
    const errorDiv = this.summaryPanel.querySelector('.yt-summary-error');
    const errorText = this.summaryPanel.querySelector('.yt-error-text');

    // Support multi-line error messages
    errorText.innerHTML = message.replace(/\n/g, '<br>');
    errorDiv.style.display = 'flex';

    // Auto-hide after 10 seconds for longer messages
    setTimeout(() => this.hideError(), 10000);
  }

  hideError() {
    const errorDiv = this.summaryPanel.querySelector('.yt-summary-error');
    errorDiv.style.display = 'none';
  }

  async copyToClipboard() {
    if (!this.currentSummary) return;

    try {
      await navigator.clipboard.writeText(this.currentSummary);

      // Show feedback
      const copyBtn = this.summaryPanel.querySelector('[data-action="copy"]');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓';
      copyBtn.style.color = '#0f0';

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.color = '';
      }, 2000);
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
    }
  }

  setupNavigationListener() {
    // Listen for YouTube's navigation events (SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        if (this.isYouTubeWatchPage()) {
          // Reset state for new video
          this.videoId = this.getVideoId();
          this.transcript = null;
          this.currentSummary = null;

          // Wait and reinject panel
          setTimeout(() => {
            const secondary = document.querySelector('#secondary');
            if (secondary) {
              this.injectSummaryPanel(secondary);
            }
          }, 1000);
        } else {
          // Remove panel if navigated away from watch page
          if (this.summaryPanel) {
            this.summaryPanel.remove();
            this.summaryPanel = null;
          }
        }
      }
    }).observe(document, { subtree: true, childList: true });
  }
}

// Initialize when page loads - ensure only one instance
// Use a unique marker to prevent duplicate initialization
(function () {
  // Check if already initialized
  if (window.__youtubeAISummaryInitialized) {
    console.log('YouTube Summary already initialized, skipping...');
    return;
  }

  window.__youtubeAISummaryInitialized = true;
  console.log('Initializing YouTube Summary...');

  const initSummary = () => {
    if (!window.youtubeAISummary) {
      window.youtubeAISummary = new YouTubeSummary();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSummary, { once: true });
  } else {
    initSummary();
  }
})();
