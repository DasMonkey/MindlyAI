// YouTube Video Summary Feature
// Injects a summary panel above the suggested videos sidebar

class YouTubeSummary {
  constructor() {
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

    // Get API key from storage
    this.apiKey = await this.getApiKey();
    if (!this.apiKey) {
      console.log('YouTube Summary: No API key found');
      return;
    }

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
    // Remove existing panel if any
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

    // Summary action buttons
    this.summaryPanel.querySelectorAll('.yt-summary-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleSummaryAction(action);
      });
    });

    // Result action buttons
    this.summaryPanel.querySelector('[data-action="copy"]').addEventListener('click', () => {
      this.copyToClipboard();
    });

    this.summaryPanel.querySelector('[data-action="close"]').addEventListener('click', () => {
      this.hideResult();
    });
  }

  async handleSummaryAction(action) {
    // Hide previous results and errors
    this.hideResult();
    this.hideError();

    // Show loading
    this.showLoading();

    try {
      // Extract transcript if not already done
      if (!this.transcript) {
        this.transcript = await this.extractTranscript();
      }

      if (!this.transcript) {
        throw new Error('No captions available for this video');
      }

      // Generate summary based on action
      const summary = await this.generateSummary(action);
      
      if (!summary) {
        throw new Error('Failed to generate summary');
      }

      // Display result
      this.showResult(action, summary);
      
    } catch (error) {
      console.error('YouTube Summary Error:', error);
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  async extractTranscript() {
    try {
      console.log('Starting transcript extraction...');
      
      // Method 1: Extract from ytInitialPlayerResponse (most reliable)
      const ytTranscript = await this.extractFromYTInitialData();
      if (ytTranscript) {
        console.log('Extracted from ytInitialPlayerResponse');
        // Store globally for Call Mindy and Chat features
        window.youtubeTranscript = ytTranscript;
        return ytTranscript;
      }
      
      // Method 2: Open and scrape YouTube's transcript panel
      const panelTranscript = await this.extractFromTranscriptPanel();
      if (panelTranscript) {
        console.log('Extracted from transcript panel');
        // Store globally for Call Mindy and Chat features
        window.youtubeTranscript = panelTranscript;
        return panelTranscript;
      }
      
      // Method 3: Try to get captions from YouTube's player response
      const captionTracks = await this.getCaptionTracks();
      console.log('Caption tracks found:', captionTracks);
      
      if (captionTracks && captionTracks.length > 0) {
        console.log('Total tracks available:', captionTracks.length);
        
        // Prefer English captions, or take the first available
        const track = captionTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en')) || captionTracks[0];
        console.log('Selected track:', track);
        
        if (track && track.baseUrl) {
          // Use background script to fetch (avoid CORS)
          const transcript = await this.fetchViaBackground(track.baseUrl);
          if (transcript && transcript.length > 0) {
            console.log('Transcript extracted via background script');
            // Store globally for Call Mindy and Chat features
            window.youtubeTranscript = transcript;
            return transcript;
          }
        }
      }

      console.log('No transcript found by any method');
      return null;
    } catch (error) {
      console.error('Transcript extraction error:', error);
      return null;
    }
  }

  async extractFromYTInitialData() {
    try {
      // Look for ytInitialPlayerResponse in page scripts
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent;
        if (content.includes('ytInitialPlayerResponse')) {
          const match = content.match(/var ytInitialPlayerResponse = (\{.+?\});/);
          if (match) {
            const data = JSON.parse(match[1]);
            const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            
            if (captionTracks && captionTracks.length > 0) {
              console.log('Found captions in ytInitialPlayerResponse');
              const track = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
              
              if (track && track.baseUrl) {
                return await this.fetchViaBackground(track.baseUrl);
              }
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting from ytInitialData:', error);
      return null;
    }
  }

  async extractFromTranscriptPanel() {
    try {
      console.log('Looking for transcript button...');
      
      // Find the "Show transcript" button
      const buttons = document.querySelectorAll('button');
      let transcriptButton = null;
      
      for (const button of buttons) {
        const ariaLabel = button.getAttribute('aria-label');
        if (ariaLabel && (ariaLabel.includes('transcript') || ariaLabel.includes('Transcript'))) {
          transcriptButton = button;
          break;
        }
      }
      
      // Also try by looking for specific selectors
      if (!transcriptButton) {
        transcriptButton = document.querySelector('[aria-label*="Show transcript"]') ||
                          document.querySelector('button[aria-label*="transcript"]');
      }
      
      if (!transcriptButton) {
        console.log('Transcript button not found');
        return null;
      }
      
      console.log('Found transcript button, clicking...');
      transcriptButton.click();
      
      // Wait for transcript panel to load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Extract transcript from panel
      const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
      console.log('Found', segments.length, 'transcript segments');
      
      if (segments.length === 0) {
        console.log('No transcript segments found');
        // Close the panel
        transcriptButton.click();
        return null;
      }
      
      let transcript = '';
      segments.forEach(segment => {
        const timestampEl = segment.querySelector('.segment-timestamp');
        const textEl = segment.querySelector('.segment-text');
        
        if (timestampEl && textEl) {
          const timestamp = timestampEl.textContent.trim();
          const text = textEl.textContent.trim();
          transcript += `[${timestamp}] ${text}\n`;
        }
      });
      
      // Close the panel
      console.log('Closing transcript panel...');
      transcriptButton.click();
      
      return transcript.length > 0 ? transcript : null;
    } catch (error) {
      console.error('Error extracting from transcript panel:', error);
      return null;
    }
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
        console.log('First 200 chars:', transcript.substring(0, 200));
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
      console.error('Gemini API error:', error);
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
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => this.hideError(), 5000);
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

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new YouTubeSummary();
  });
} else {
  new YouTubeSummary();
}
