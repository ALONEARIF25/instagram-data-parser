let totalMessageCount = 0;
let allParticipants = new Set();
let participantMessageCounts = {};
let participantImageCounts = {};
let participantAudioCounts = {};
let participantVideoCounts = {};
let participantCharacterCounts = {}; // Store character counts per participant
let earliestTimestamp = null;
let latestTimestamp = null;
let processedFiles = 0;
let totalImagesCount = 0;
let totalAudioCount = 0;
let totalVideosCount = 0;
let allMessages = []; // Store all messages for search functionality
let wordFrequency = {}; // Store word frequency for most used words
let fileResultsData = []; // Store file results for compact display
let dailyMessageCounts = {}; // Store message counts per day
let messagesByDate = {}; // Store messages grouped by date
let mediaFiles = {}; // Store media files by their filename

function processFiles() {
  const fileInput = document.getElementById("fileInput");
  const files = fileInput.files;
  const mediaFolderInput = document.getElementById("mediaFolderInput");
  const mediaFolderFiles = mediaFolderInput.files;

  if (files.length === 0) {
    alert("Please select at least one JSON file");
    return;
  }

  // Process media folder if provided
  mediaFiles = {};
  if (mediaFolderFiles.length > 0) {
    Array.from(mediaFolderFiles).forEach((file) => {
      // Extract filename from path (last part after /)
      const pathParts = file.webkitRelativePath.split("/");
      const filename = pathParts[pathParts.length - 1];

      // Create object URL for the file
      const url = URL.createObjectURL(file);
      mediaFiles[filename] = url;
    });
    console.log(`Loaded ${Object.keys(mediaFiles).length} media files`);
  }

  // Reset counters
  totalMessageCount = 0;
  allParticipants.clear();
  participantMessageCounts = {};
  participantImageCounts = {};
  participantAudioCounts = {};
  participantVideoCounts = {};
  participantCharacterCounts = {}; // Reset character counts
  earliestTimestamp = null;
  latestTimestamp = null;
  processedFiles = 0;
  totalImagesCount = 0;
  totalAudioCount = 0;
  totalVideosCount = 0;
  allMessages = []; // Reset messages array for search
  wordFrequency = {}; // Reset word frequency counter
  fileResultsData = []; // Reset file results data
  dailyMessageCounts = {}; // Reset daily message counts
  messagesByDate = {}; // Reset messages by date

  // Show progress and results
  document.getElementById("progressContainer").style.display = "block";
  document.getElementById("results").style.display = "block";
  document.getElementById("fileResults").innerHTML = "";
  document.getElementById("statsContainer").style.display = "none";

  // Process each file
  Array.from(files).forEach((file, index) => {
    processFile(file, index, files.length);
  });
}

function processFile(file, index, totalFiles) {
  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const jsonData = JSON.parse(e.target.result);

      if (jsonData.messages && Array.isArray(jsonData.messages)) {
        const messageCount = jsonData.messages.length;
        totalMessageCount += messageCount;

        // Track participants
        if (jsonData.participants) {
          jsonData.participants.forEach((participant) => {
            if (participant.name) {
              allParticipants.add(participant.name);
            }
          });
        }

        // Count messages per participant and track timestamps
        jsonData.messages.forEach((message) => {
          // Skip reaction messages (not real messages)
          if (message.content && message.content.includes("to your message")) {
            return; // Skip this message
          }

          // Store message for search functionality
          allMessages.push({
            ...message,
            fileName: file.name,
          });

          // Count words from message content
          if (message.content) {
            countWords(message.content);
          }

          if (message.sender_name) {
            participantMessageCounts[message.sender_name] =
              (participantMessageCounts[message.sender_name] || 0) + 1;

            // Count characters in message content
            if (message.content) {
              participantCharacterCounts[message.sender_name] =
                (participantCharacterCounts[message.sender_name] || 0) +
                message.content.length;
            }
          }

          // Track timestamps for date range
          if (message.timestamp_ms) {
            if (
              !earliestTimestamp ||
              message.timestamp_ms < earliestTimestamp
            ) {
              earliestTimestamp = message.timestamp_ms;
            }
            if (!latestTimestamp || message.timestamp_ms > latestTimestamp) {
              latestTimestamp = message.timestamp_ms;
            }

            // Track daily message counts (convert to GMT+6)
            // Add 6 hours (GMT+6 offset) to the timestamp
            const gmt6Timestamp = message.timestamp_ms + 6 * 60 * 60 * 1000;

            // Create date from adjusted timestamp and extract UTC date components
            // Since we added 6 hours, the UTC representation now shows the GMT+6 date
            const adjustedDate = new Date(gmt6Timestamp);
            const year = adjustedDate.getUTCFullYear();
            const month = String(adjustedDate.getUTCMonth() + 1).padStart(
              2,
              "0"
            );
            const day = String(adjustedDate.getUTCDate()).padStart(2, "0");
            const dateKey = `${year}-${month}-${day}`;

            dailyMessageCounts[dateKey] =
              (dailyMessageCounts[dateKey] || 0) + 1;

            // Store messages by date for detailed view
            if (!messagesByDate[dateKey]) {
              messagesByDate[dateKey] = [];
            }
            messagesByDate[dateKey].push({
              ...message,
              fileName: file.name,
              gmt6Timestamp: gmt6Timestamp,
            });
          }

          // Count media types
          if (message.photos && message.photos.length > 0) {
            totalImagesCount += message.photos.length;
            if (message.sender_name) {
              participantImageCounts[message.sender_name] =
                (participantImageCounts[message.sender_name] || 0) +
                message.photos.length;
            }
          }
          if (message.videos && message.videos.length > 0) {
            totalVideosCount += message.videos.length;
            if (message.sender_name) {
              participantVideoCounts[message.sender_name] =
                (participantVideoCounts[message.sender_name] || 0) +
                message.videos.length;
            }
          }
          if (message.audio_files && message.audio_files.length > 0) {
            totalAudioCount += message.audio_files.length;
            if (message.sender_name) {
              participantAudioCounts[message.sender_name] =
                (participantAudioCounts[message.sender_name] || 0) +
                message.audio_files.length;
            }
          }
        });

        // Display file result
        displayFileResult(file.name, messageCount, jsonData.participants);
      } else {
        displayError(
          file.name,
          "Invalid JSON structure - no messages array found"
        );
      }
    } catch (error) {
      displayError(file.name, `Error parsing JSON: ${error.message}`);
    }

    // Update progress
    processedFiles++;
    updateProgress(processedFiles, totalFiles);

    // If all files are processed, show final stats
    if (processedFiles === totalFiles) {
      showFinalStats();
    }
  };

  reader.onerror = function () {
    displayError(file.name, "Error reading file");
    processedFiles++;
    updateProgress(processedFiles, totalFiles);
  };

  reader.readAsText(file);
}

function displayFileResult(filename, messageCount, participants) {
  // Store file data for compact display later
  fileResultsData.push({
    filename,
    messageCount,
    participants: participants ? participants.map((p) => p.name) : ["Unknown"],
  });

  // Update the file results display with compact format
  updateCompactFileResults();
}

function updateCompactFileResults() {
  const fileResults = document.getElementById("fileResults");
  const totalFiles = fileResultsData.length;

  if (totalFiles === 0) return;

  // Separate successful files from errors
  const successfulFiles = fileResultsData.filter((file) => !file.error);
  const errorFiles = fileResultsData.filter((file) => file.error);
  const totalProcessedMessages = successfulFiles.reduce(
    (sum, file) => sum + file.messageCount,
    0
  );

  let displayHTML = `
    <div class="compact-summary">
      <div class="summary-stats">
        <span class="summary-item"><strong>📁 ${totalFiles}</strong> files processed</span>
        <span class="summary-item"><strong>💬 ${totalProcessedMessages.toLocaleString()}</strong> messages found</span>
        ${
          errorFiles.length > 0
            ? `<span class="summary-item error"><strong>⚠️ ${errorFiles.length}</strong> errors</span>`
            : ""
        }
      </div>
  `;

  // Show individual file details in a collapsible format if more than 3 files
  if (totalFiles > 3) {
    displayHTML += `
      <details class="file-details">
        <summary>📋 View detailed file breakdown (${totalFiles} files)</summary>
        <div class="file-list">
    `;

    fileResultsData.forEach((file) => {
      if (file.error) {
        displayHTML += `
          <div class="compact-file-item error">
            <span class="file-name">${file.filename}</span>
            <span class="file-error">❌ ${file.error}</span>
          </div>
        `;
      } else {
        displayHTML += `
          <div class="compact-file-item">
            <span class="file-name">${file.filename}</span>
            <span class="file-messages">${file.messageCount.toLocaleString()} msgs</span>
          </div>
        `;
      }
    });

    displayHTML += `
        </div>
      </details>
    `;
  } else {
    // Show all files if 3 or fewer
    displayHTML += `<div class="file-list">`;
    fileResultsData.forEach((file) => {
      if (file.error) {
        displayHTML += `
          <div class="detailed-file-item error">
            <div class="file-header">
              <strong>${file.filename}</strong>
              <span class="error-message">❌ Error</span>
            </div>
            <div class="error-details">${file.error}</div>
          </div>
        `;
      } else {
        const participantNames = file.participants.join(", ");
        displayHTML += `
          <div class="detailed-file-item">
            <div class="file-header">
              <strong>${file.filename}</strong>
              <span class="message-count">${file.messageCount.toLocaleString()} messages</span>
            </div>
            <div class="participants">Participants: ${participantNames}</div>
          </div>
        `;
      }
    });
    displayHTML += `</div>`;
  }

  displayHTML += `</div>`;

  fileResults.innerHTML = displayHTML;
}

function displayError(filename, errorMessage) {
  // Store error for display
  fileResultsData.push({
    filename,
    messageCount: 0,
    participants: [],
    error: errorMessage,
  });

  // Update the compact display
  updateCompactFileResults();
}

function updateProgress(current, total) {
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");

  const percentage = (current / total) * 100;
  progressFill.style.width = percentage + "%";
  progressText.textContent = `Processing files... ${current}/${total}`;
}

function showFinalStats() {
  // Hide progress
  document.getElementById("progressContainer").style.display = "none";

  // Show stats and search section
  document.getElementById("statsContainer").style.display = "grid";
  document.getElementById("searchSection").style.display = "block";
  document.getElementById("topWordsSection").style.display = "block";
  document.getElementById("lowestDateMessagesSection").style.display = "block";
  document.getElementById("datePickerSection").style.display = "block";

  // Set date picker min and max values
  if (earliestTimestamp && latestTimestamp) {
    const minDate = new Date(earliestTimestamp + 6 * 60 * 60 * 1000);
    const maxDate = new Date(latestTimestamp + 6 * 60 * 60 * 1000);

    const datePicker = document.getElementById("datePicker");
    datePicker.min = formatDateForInput(minDate);
    datePicker.max = formatDateForInput(maxDate);
    datePicker.value = formatDateForInput(maxDate); // Set to latest date by default
  }

  // Update stat cards
  document.getElementById("totalMessages").textContent =
    totalMessageCount.toLocaleString();
  document.getElementById("participantCount").textContent =
    allParticipants.size;
  document.getElementById("imagesCount").textContent =
    totalImagesCount.toLocaleString();
  document.getElementById("audioCount").textContent =
    totalAudioCount.toLocaleString();
  document.getElementById("videosCount").textContent =
    totalVideosCount.toLocaleString();

  // Calculate and display percentages for media types
  const totalMediaCount = totalImagesCount + totalAudioCount + totalVideosCount;

  if (totalMediaCount > 0) {
    const imagesPercent = ((totalImagesCount / totalMediaCount) * 100).toFixed(
      1
    );
    const audioPercent = ((totalAudioCount / totalMediaCount) * 100).toFixed(1);
    const videosPercent = ((totalVideosCount / totalMediaCount) * 100).toFixed(
      1
    );

    document.getElementById("imagesPercent").textContent = `${imagesPercent}%`;
    document.getElementById("audioPercent").textContent = `${audioPercent}%`;
    document.getElementById("videosPercent").textContent = `${videosPercent}%`;
  } else {
    document.getElementById("imagesPercent").textContent = "0%";
    document.getElementById("audioPercent").textContent = "0%";
    document.getElementById("videosPercent").textContent = "0%";
  }

  // Format date range as days count
  if (earliestTimestamp && latestTimestamp) {
    const timeDifferenceMs = latestTimestamp - earliestTimestamp;
    const daysDifference = Math.ceil(timeDifferenceMs / (1000 * 60 * 60 * 24));
    document.getElementById("dateRange").textContent = `${daysDifference} days`;
    document.getElementById("dateRange").style.fontSize = "20px";

    // Calculate average daily chat
    const avgDaily =
      daysDifference > 0 ? (totalMessageCount / daysDifference).toFixed(1) : 0;
    document.getElementById("avgDailyChat").textContent = avgDaily;
  } else {
    document.getElementById("avgDailyChat").textContent = "0";
  }

  // Calculate highest and lowest daily chat
  calculateDailyExtremes();

  // Show participant message breakdown
  showParticipantStats();

  // Display top used words
  displayTopWords();

  // Display activity heatmap
  displayHeatmap();
}

function showParticipantStats() {
  const participantStatsDiv = document.getElementById("participantStats");

  if (Object.keys(participantMessageCounts).length > 0) {
    let participantHtml =
      '<h4>Messages by Participant:</h4><div class="stats">';

    // Sort participants by message count
    const sortedParticipants = Object.entries(participantMessageCounts).sort(
      ([, a], [, b]) => b - a
    );

    sortedParticipants.forEach(([name, count]) => {
      const percentage = ((count / totalMessageCount) * 100).toFixed(1);
      participantHtml += `
                    <div class="stat-card">
                        <div class="stat-number">${count.toLocaleString()}</div>
                        <div class="stat-label">${name}<br><span>${percentage}%</span></div>
                    </div>
                `;
    });

    participantHtml += "</div>";

    // Add character count breakdown by participant
    participantHtml +=
      '<h4>📝 Characters by Participant:</h4><div class="stats">';

    // Calculate total characters
    const totalCharacters = Object.values(participantCharacterCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    // Sort participants by character count
    const sortedCharParticipants = Object.entries(
      participantCharacterCounts
    ).sort(([, a], [, b]) => b - a);

    sortedCharParticipants.forEach(([name, count]) => {
      const percentage =
        totalCharacters > 0 ? ((count / totalCharacters) * 100).toFixed(1) : 0;
      participantHtml += `
                    <div class="stat-card">
                        <div class="stat-number">${count.toLocaleString()}</div>
                        <div class="stat-label">${name}<br><span>${percentage}%</span></div>
                    </div>
                `;
    });
    participantHtml += "</div>";

    // Add media breakdown by participant
    participantHtml += '<h4>📷 Images by Participant:</h4><div class="stats">';
    const sortedImageParticipants = Object.entries(participantImageCounts).sort(
      ([, a], [, b]) => b - a
    );
    sortedImageParticipants.forEach(([name, count]) => {
      const percentage =
        totalImagesCount > 0
          ? ((count / totalImagesCount) * 100).toFixed(1)
          : 0;
      participantHtml += `
                    <div class="stat-card">
                        <div class="stat-number">${count.toLocaleString()}</div>
                        <div class="stat-label">${name}<br><span>${percentage}%</span></div>
                    </div>
                `;
    });
    participantHtml += "</div>";

    // Add audio breakdown by participant
    participantHtml +=
      '<h4>🎙️ Voice Messages by Participant:</h4><div class="stats">';
    const sortedAudioParticipants = Object.entries(participantAudioCounts).sort(
      ([, a], [, b]) => b - a
    );
    sortedAudioParticipants.forEach(([name, count]) => {
      const percentage =
        totalAudioCount > 0 ? ((count / totalAudioCount) * 100).toFixed(1) : 0;
      participantHtml += `
                    <div class="stat-card">
                        <div class="stat-number">${count.toLocaleString()}</div>
                        <div class="stat-label">${name}<br><span>${percentage}%</span></div>
                    </div>
                `;
    });
    participantHtml += "</div>";

    // Add video breakdown by participant
    participantHtml += '<h4>🎥 Videos by Participant:</h4><div class="stats">';
    const sortedVideoParticipants = Object.entries(participantVideoCounts).sort(
      ([, a], [, b]) => b - a
    );
    sortedVideoParticipants.forEach(([name, count]) => {
      const percentage =
        totalVideosCount > 0
          ? ((count / totalVideosCount) * 100).toFixed(1)
          : 0;
      participantHtml += `
                    <div class="stat-card">
                        <div class="stat-number">${count.toLocaleString()}</div>
                        <div class="stat-label">${name}<br><span>${percentage}%</span></div>
                    </div>
                `;
    });
    participantHtml += "</div>";

    participantStatsDiv.innerHTML = participantHtml;
  }
}

// Word frequency functions
function countWords(text) {
  if (!text) return;

  // Extract specific ASCII emoticons only: ";-;" ":v" ":(" ":<" and their variations
  const asciiEmoticonRegex = /;-;+|:v+|:\(+|:<+/g;
  const asciiEmoticons = text.match(asciiEmoticonRegex) || [];

  // Remove ASCII emoticons from text for word processing
  let cleanText = text.replace(asciiEmoticonRegex, " ");

  // Clean and split text into words
  const words = cleanText
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .split(/\s+/)
    .filter((word) => word.length > 0 && !isCommonWord(word)); // Filter out empty strings and common words

  // Count word frequency
  words.forEach((word) => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });

  // Count ASCII emoticon frequency
  asciiEmoticons.forEach((emoticon) => {
    const cleanEmoticon = emoticon.trim();
    if (cleanEmoticon) {
      wordFrequency[cleanEmoticon] = (wordFrequency[cleanEmoticon] || 0) + 1;
    }
  });
}

// Filter out common words (stop words)
function isCommonWord(word) {
  const commonWords = [
    // Articles
    "a",
    "e",
    "to",
    "i",
  ];

  return commonWords.includes(word);
}

function displayTopWords() {
  const topWordsList = document.getElementById("topWordsList");

  if (Object.keys(wordFrequency).length === 0) {
    topWordsList.innerHTML =
      '<div style="text-align: center; color: #bbb;">No words to display</div>';
    return;
  }

  // Sort words by frequency and get top 50
  const sortedWords = Object.entries(wordFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50);

  // Generate HTML for top words
  let wordsHTML = "";
  sortedWords.forEach(([word, count], index) => {
    wordsHTML += `
        <div class="word-item">
          <div class="word-rank">${index + 1}</div>
          <div class="word-text">${word}</div>
          <div class="word-count">${count.toLocaleString()}</div>
        </div>
      `;
  });

  topWordsList.innerHTML = wordsHTML;
}

// Function to display activity heatmap
function displayHeatmap() {
  const heatmapContainer = document.getElementById("heatmapContainer");
  const heatmapSection = document.getElementById("heatmapSection");

  if (!heatmapContainer || Object.keys(dailyMessageCounts).length === 0) {
    return;
  }

  // Show the heatmap section
  heatmapSection.style.display = "block";

  // Get date range
  const dates = Object.keys(dailyMessageCounts).sort();
  if (dates.length === 0) return;

  const startDate = new Date(dates[0]);
  const endDate = new Date(dates[dates.length - 1]);

  // Calculate start from Sunday of the first week
  const heatmapStart = new Date(startDate);
  heatmapStart.setDate(heatmapStart.getDate() - heatmapStart.getDay());

  // Calculate end to Saturday of the last week
  const heatmapEnd = new Date(endDate);
  heatmapEnd.setDate(heatmapEnd.getDate() + (6 - heatmapEnd.getDay()));

  // Calculate intensity levels
  const counts = Object.values(dailyMessageCounts);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);

  const getLevel = (count) => {
    if (!count) return 0;
    const range = maxCount - minCount;
    const normalized = (count - minCount) / range;
    if (normalized === 0) return 1;
    if (normalized <= 0.25) return 1;
    if (normalized <= 0.5) return 2;
    if (normalized <= 0.75) return 3;
    return 4;
  };

  // Build the heatmap grid
  let heatmapHTML = '<div class="heatmap-grid">';

  // Month labels
  heatmapHTML += '<div class="heatmap-months">';
  let currentMonth = "";
  let currentDate = new Date(heatmapStart);
  let weekCount = 0;

  while (currentDate <= heatmapEnd) {
    const monthName = currentDate.toLocaleDateString("en-US", {
      month: "short",
    });
    if (monthName !== currentMonth && currentDate.getDate() <= 7) {
      heatmapHTML += `<div class="heatmap-month" style="flex: 0 0 ${
        weekCount === 0 ? 30 : 15
      }px;">${monthName}</div>`;
      currentMonth = monthName;
    }
    currentDate.setDate(currentDate.getDate() + 7);
    weekCount++;
  }
  heatmapHTML += "</div>";

  // Content area with day labels and weeks
  heatmapHTML += '<div class="heatmap-content">';

  // Day labels
  heatmapHTML += '<div class="heatmap-days">';
  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
  dayLabels.forEach((label) => {
    heatmapHTML += `<div class="heatmap-day-label">${label}</div>`;
  });
  heatmapHTML += "</div>";

  // Generate weeks
  heatmapHTML += '<div class="heatmap-weeks">';

  currentDate = new Date(heatmapStart);
  let weekHTML = "";
  let dayOfWeek = 0;

  while (currentDate <= heatmapEnd) {
    if (dayOfWeek === 0) {
      if (weekHTML) {
        heatmapHTML += `<div class="heatmap-week">${weekHTML}</div>`;
      }
      weekHTML = "";
    }

    const dateKey = formatDateKey(currentDate);
    const count = dailyMessageCounts[dateKey] || 0;
    const level = getLevel(count);
    const isInRange = currentDate >= startDate && currentDate <= endDate;

    if (isInRange) {
      const dateStr = currentDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      weekHTML += `<div class="heatmap-day level-${level}" 
                       data-date="${dateKey}" 
                       data-count="${count}"
                       title="${dateStr}: ${count} messages"
                       onclick="viewMessagesByDateKey('${dateKey}')"></div>`;
    } else {
      weekHTML += '<div class="heatmap-day empty"></div>';
    }

    currentDate.setDate(currentDate.getDate() + 1);
    dayOfWeek = (dayOfWeek + 1) % 7;
  }

  if (weekHTML) {
    heatmapHTML += `<div class="heatmap-week">${weekHTML}</div>`;
  }

  heatmapHTML += "</div>"; // Close weeks
  heatmapHTML += "</div>"; // Close content
  heatmapHTML += "</div>"; // Close grid

  heatmapContainer.innerHTML = heatmapHTML;

  // Add hover tooltip
  addHeatmapTooltip();
}

// Helper function to format date as YYYY-MM-DD
function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Function to view messages by clicking on heatmap
function viewMessagesByDateKey(dateKey) {
  const datePicker = document.getElementById("datePicker");
  if (datePicker) {
    datePicker.value = dateKey;
    viewMessagesByDate();

    // Scroll to the date picker section
    document.getElementById("datePickerSection").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

// Add tooltip to heatmap
function addHeatmapTooltip() {
  const heatmapDays = document.querySelectorAll(".heatmap-day:not(.empty)");
  let tooltip = null;

  heatmapDays.forEach((day) => {
    day.addEventListener("mouseenter", (e) => {
      const rect = day.getBoundingClientRect();
      const dateKey = day.getAttribute("data-date");
      const count = day.getAttribute("data-count");

      if (!dateKey) return;

      const dateObj = new Date(dateKey + "T00:00:00");
      const dateStr = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      tooltip = document.createElement("div");
      tooltip.className = "heatmap-tooltip";
      tooltip.innerHTML = `<strong>${dateStr}</strong><br>${count} message${
        count !== "1" ? "s" : ""
      }`;
      tooltip.style.left = rect.left + window.scrollX + "px";
      tooltip.style.top = rect.top + window.scrollY - 50 + "px";
      document.body.appendChild(tooltip);
    });

    day.addEventListener("mouseleave", () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    });
  });
}

// Function to calculate highest and lowest daily message counts
function calculateDailyExtremes() {
  if (Object.keys(dailyMessageCounts).length === 0) {
    document.getElementById("highestDailyChat").textContent = "0";
    document.getElementById("highestDailyDate").textContent = "-";
    document.getElementById("lowestDailyChat").textContent = "0";
    document.getElementById("lowestDailyDate").textContent = "-";
    return;
  }

  // Find highest and lowest daily counts
  let highestCount = 0;
  let lowestCount = Infinity;
  let highestDate = "";
  let lowestDate = "";

  Object.entries(dailyMessageCounts).forEach(([date, count]) => {
    if (count > highestCount) {
      highestCount = count;
      highestDate = date;
    }
    if (count < lowestCount) {
      lowestCount = count;
      lowestDate = date;
    }
  });

  // Format dates for display (dateString is in YYYY-MM-DD format representing GMT+6 date)
  const formatDate = (dateString) => {
    // Parse the date components directly to avoid timezone issues
    const [year, month, day] = dateString.split("-");
    const date = new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day))
    );
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC", // Display in UTC to show the exact date we stored
    });
  };

  // Update the display
  document.getElementById("highestDailyChat").textContent =
    highestCount.toLocaleString();
  document.getElementById("highestDailyDate").textContent =
    formatDate(highestDate);
  document.getElementById("lowestDailyChat").textContent =
    lowestCount.toLocaleString();
  document.getElementById("lowestDailyDate").textContent =
    formatDate(lowestDate);

  // Display messages from the lowest activity day
  displayLowestDateMessages(lowestDate, lowestCount);
}

// Function to display messages from the lowest activity day
function displayLowestDateMessages(lowestDate, messageCount) {
  const lowestDateInfo = document.getElementById("lowestDateInfo");
  const lowestDateMessages = document.getElementById("lowestDateMessages");

  if (!lowestDate || !messagesByDate[lowestDate]) {
    lowestDateInfo.innerHTML =
      '<div style="text-align: center; color: #bbb;">No data available</div>';
    lowestDateMessages.innerHTML = "";
    return;
  }

  // Format the date for display
  const formatDate = (dateString) => {
    // Parse the date components directly to avoid timezone issues
    const [year, month, day] = dateString.split("-");
    const date = new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day))
    );
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  // Display date information
  lowestDateInfo.innerHTML = `
    <div class="date-info-card">
      <div class="date-title">${formatDate(lowestDate)}</div>
      <div class="date-stats">${messageCount} message${
    messageCount !== 1 ? "s" : ""
  } total</div>
    </div>
  `;

  // Get and sort messages for this date
  const messages = messagesByDate[lowestDate].sort(
    (a, b) => a.gmt6Timestamp - b.gmt6Timestamp
  );

  // Get unique participants for this day
  const participants = [
    ...new Set(messages.map((m) => m.sender_name).filter(Boolean)),
  ];
  const isTwoPersonChat = participants.length === 2;

  // If two-person chat, determine which user goes on which side
  let leftUser = null;
  let rightUser = null;
  if (isTwoPersonChat) {
    leftUser = participants[0];
    rightUser = participants[1];
  }

  // Generate HTML for messages
  let messagesHTML = "";
  messages.forEach((message, index) => {
    const messageTime = new Date(message.gmt6Timestamp);
    const timeString = messageTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });

    let contentHTML = "";
    if (message.content) {
      contentHTML = `<div class="bubble-content">${escapeHtml(
        message.content
      )}</div>`;
    }

    // Render media
    const mediaHTML = renderMedia(message);

    if (isTwoPersonChat) {
      // Chat bubble style for 2-person conversations
      const isLeftUser = message.sender_name === leftUser;
      const bubbleClass = isLeftUser ? "chat-bubble-left" : "chat-bubble-right";
      const alignClass = isLeftUser ? "message-row-left" : "message-row-right";

      messagesHTML += `
        <div class="message-row ${alignClass}">
          <div class="chat-bubble ${bubbleClass}">
            ${contentHTML}
            ${mediaHTML}
            <div class="bubble-time">${timeString}</div>
          </div>
        </div>
      `;
    } else {
      // Original style for group chats or single person
      messagesHTML += `
        <div class="lowest-date-message-item">
          <div class="message-header">
            <span class="message-sender">${escapeHtml(
              message.sender_name || "Unknown"
            )}</span>
            <span class="message-time">${timeString}</span>
          </div>
          ${contentHTML.replace("bubble-content", "message-content")}
          ${mediaHTML.replace(/bubble-media/g, "message-media")}
        </div>
      `;
    }
  });

  lowestDateMessages.innerHTML = messagesHTML;
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to format date for input
function formatDateForInput(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Function to extract filename from URI path
function extractFilename(uri) {
  if (!uri) return null;
  const parts = uri.split("/");
  return parts[parts.length - 1];
}

// Function to render media (photos, videos, audio)
function renderMedia(message) {
  let mediaHTML = "";

  // Handle photos
  if (message.photos && message.photos.length > 0) {
    message.photos.forEach((photo) => {
      const filename = extractFilename(photo.uri);
      if (filename && mediaFiles[filename]) {
        mediaHTML += `<div class="media-item">
          <img src="${mediaFiles[filename]}" alt="Photo" class="media-preview" onclick="window.open('${mediaFiles[filename]}', '_blank')" />
        </div>`;
      } else {
        mediaHTML += `<div class="bubble-media">📷 Photo${
          filename ? `: ${filename}` : ""
        }</div>`;
      }
    });
  }

  // Handle videos
  if (message.videos && message.videos.length > 0) {
    message.videos.forEach((video) => {
      const filename = extractFilename(video.uri);
      if (filename && mediaFiles[filename]) {
        mediaHTML += `<div class="media-item">
          <video controls class="media-preview">
            <source src="${mediaFiles[filename]}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </div>`;
      } else {
        mediaHTML += `<div class="bubble-media">🎥 Video${
          filename ? `: ${filename}` : ""
        }</div>`;
      }
    });
  }

  // Handle audio files
  if (message.audio_files && message.audio_files.length > 0) {
    message.audio_files.forEach((audio) => {
      const filename = extractFilename(audio.uri);
      if (filename && mediaFiles[filename]) {
        mediaHTML += `<div class="media-item">
          <audio controls class="audio-player">
            <source src="${mediaFiles[filename]}" type="audio/mp4">
            Your browser does not support the audio tag.
          </audio>
        </div>`;
      } else {
        mediaHTML += `<div class="bubble-media">🎙️ Voice message${
          filename ? `: ${filename}` : ""
        }</div>`;
      }
    });
  }

  return mediaHTML;
}

// Function to view messages by selected date
function viewMessagesByDate() {
  const datePicker = document.getElementById("datePicker");
  const selectedDate = datePicker.value;

  if (!selectedDate) {
    alert("Please select a date");
    return;
  }

  const selectedDateInfo = document.getElementById("selectedDateInfo");
  const selectedDateMessages = document.getElementById("selectedDateMessages");

  if (
    !messagesByDate[selectedDate] ||
    messagesByDate[selectedDate].length === 0
  ) {
    selectedDateInfo.innerHTML = `
      <div class="date-info-card">
        <div class="date-title">${formatDateForDisplay(selectedDate)}</div>
        <div class="date-stats">No messages found for this date</div>
      </div>
    `;
    selectedDateMessages.innerHTML = "";
    return;
  }

  const messageCount = messagesByDate[selectedDate].length;

  // Display date information
  selectedDateInfo.innerHTML = `
    <div class="date-info-card">
      <div class="date-title">${formatDateForDisplay(selectedDate)}</div>
      <div class="date-stats">${messageCount} message${
    messageCount !== 1 ? "s" : ""
  } total</div>
    </div>
  `;

  // Get and sort messages for this date
  const messages = messagesByDate[selectedDate].sort(
    (a, b) => a.gmt6Timestamp - b.gmt6Timestamp
  );

  // Get unique participants for this day
  const participants = [
    ...new Set(messages.map((m) => m.sender_name).filter(Boolean)),
  ];
  const isTwoPersonChat = participants.length === 2;

  // If two-person chat, determine which user goes on which side
  let leftUser = null;
  let rightUser = null;
  if (isTwoPersonChat) {
    leftUser = participants[0];
    rightUser = participants[1];
  }

  // Generate HTML for messages
  let messagesHTML = "";
  messages.forEach((message) => {
    const messageTime = new Date(message.gmt6Timestamp);
    const timeString = messageTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });

    let contentHTML = "";
    if (message.content) {
      contentHTML = `<div class="bubble-content">${escapeHtml(
        message.content
      )}</div>`;
    }

    // Render media
    const mediaHTML = renderMedia(message);

    if (isTwoPersonChat) {
      // Chat bubble style for 2-person conversations
      const isLeftUser = message.sender_name === leftUser;
      const bubbleClass = isLeftUser ? "chat-bubble-left" : "chat-bubble-right";
      const alignClass = isLeftUser ? "message-row-left" : "message-row-right";

      messagesHTML += `
        <div class="message-row ${alignClass}">
          <div class="chat-bubble ${bubbleClass}">
            ${contentHTML}
            ${mediaHTML}
            <div class="bubble-time">${timeString}</div>
          </div>
        </div>
      `;
    } else {
      // Original style for group chats or single person
      messagesHTML += `
        <div class="lowest-date-message-item">
          <div class="message-header">
            <span class="message-sender">${escapeHtml(
              message.sender_name || "Unknown"
            )}</span>
            <span class="message-time">${timeString}</span>
          </div>
          ${contentHTML.replace("bubble-content", "message-content")}
          ${mediaHTML.replace(/bubble-media/g, "message-media")}
        </div>
      `;
    }
  });

  selectedDateMessages.innerHTML = messagesHTML;
}

// Helper function to format date for display
function formatDateForDisplay(dateString) {
  const [year, month, day] = dateString.split("-");
  const date = new Date(
    Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day))
  );
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Search functionality
function searchMessages() {
  const searchTerm = document.getElementById("searchInput").value.trim();
  const searchResults = document.getElementById("searchResults");

  if (!searchTerm) {
    searchResults.innerHTML =
      '<div class="search-stats">Please enter a search term</div>';
    return;
  }

  if (allMessages.length === 0) {
    searchResults.innerHTML =
      '<div class="search-stats">No messages loaded. Please process files first.</div>';
    return;
  }

  // Perform search
  const results = allMessages.filter((message) => {
    return (
      message.content &&
      message.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Display results
  if (results.length === 0) {
    searchResults.innerHTML = `<div class="search-stats">No messages found containing "${searchTerm}"</div>`;
    return;
  }

  // Generate results HTML
  let resultsHTML = `<div class="search-stats">Found ${results.length} message(s) containing "${searchTerm}"</div>`;

  results.slice(0, 50).forEach((message) => {
    // Limit to first 50 results
    const highlightedContent = message.content.replace(
      new RegExp(escapeRegex(searchTerm), "gi"),
      `<span class="highlight">$&</span>`
    );

    const messageDate = message.timestamp_ms
      ? new Date(message.timestamp_ms).toLocaleString()
      : "Unknown date";

    resultsHTML += `
        <div class="search-result-item">
          <div class="search-result-header">${
            message.sender_name || "Unknown"
          }</div>
          <div class="search-result-content">${highlightedContent}</div>
          <div class="search-result-meta">
            <span>${messageDate}</span>
            <span>${message.fileName}</span>
          </div>
        </div>
      `;
  });

  if (results.length > 50) {
    resultsHTML += `<div class="search-stats">Showing first 50 results of ${results.length} total matches</div>`;
  }

  searchResults.innerHTML = resultsHTML;
}

// Helper function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Add Enter key support for search
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchMessages();
      }
    });
  }
});

// Add drag and drop functionality for JSON files
document.addEventListener("DOMContentLoaded", () => {
  const jsonInputSection = document.getElementById("jsonInputSection");
  const fileInput = document.getElementById("fileInput");

  if (jsonInputSection && fileInput) {
    jsonInputSection.addEventListener("dragover", (e) => {
      e.preventDefault();
      jsonInputSection.classList.add("drag-over");
    });

    jsonInputSection.addEventListener("dragleave", (e) => {
      e.preventDefault();
      jsonInputSection.classList.remove("drag-over");
    });

    jsonInputSection.addEventListener("drop", (e) => {
      e.preventDefault();
      jsonInputSection.classList.remove("drag-over");

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.name.endsWith(".json")
      );

      if (files.length > 0) {
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();
        files.forEach((file) => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
      }
    });

    // Make the whole section clickable to trigger file input
    jsonInputSection.addEventListener("click", (e) => {
      if (
        e.target === jsonInputSection ||
        e.target.classList.contains("drag-drop-hint")
      ) {
        fileInput.click();
      }
    });
  }
});

// Add drag and drop functionality for media folder
document.addEventListener("DOMContentLoaded", () => {
  const mediaInputSection = document.getElementById("mediaInputSection");
  const mediaFolderInput = document.getElementById("mediaFolderInput");

  if (mediaInputSection && mediaFolderInput) {
    mediaInputSection.addEventListener("dragover", (e) => {
      e.preventDefault();
      mediaInputSection.classList.add("drag-over");
    });

    mediaInputSection.addEventListener("dragleave", (e) => {
      e.preventDefault();
      mediaInputSection.classList.remove("drag-over");
    });

    mediaInputSection.addEventListener("drop", async (e) => {
      e.preventDefault();
      mediaInputSection.classList.remove("drag-over");

      const items = e.dataTransfer.items;

      if (items) {
        const allFiles = [];

        console.log(`Processing ${items.length} dropped items...`);

        // Process all dropped items
        for (let i = 0; i < items.length; i++) {
          const item = items[i].webkitGetAsEntry();
          if (item) {
            console.log(
              `Item ${i + 1}: ${item.name} (${
                item.isDirectory ? "Directory" : "File"
              })`
            );

            if (item.isDirectory) {
              // Recursively read all files from the folder
              console.log(`Reading directory: ${item.name}...`);
              const files = await readDirectory(item);
              console.log(`Found ${files.length} files in ${item.name}`);
              allFiles.push(...files);
            } else if (item.isFile) {
              // Add individual file
              const file = items[i].getAsFile();
              if (file) {
                console.log(`Added file: ${file.name}`);
                allFiles.push(file);
              }
            }
          }
        }

        // Set the files to the input
        if (allFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          allFiles.forEach((file) => dataTransfer.items.add(file));
          mediaFolderInput.files = dataTransfer.files;
          console.log(
            `✅ Successfully loaded ${allFiles.length} media files from drag and drop`
          );

          // Show a visual confirmation
          const hint = mediaInputSection.querySelector(".drag-drop-hint");
          if (hint) {
            const originalText = hint.textContent;
            hint.textContent = `✅ ${allFiles.length} files loaded!`;
            hint.style.color = "#4caf50";
            setTimeout(() => {
              hint.textContent = originalText;
              hint.style.color = "";
            }, 3000);
          }
        } else {
          console.warn("No files were found in the dropped items");
        }
      } else {
        // Fallback for browsers that don't support items
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const dataTransfer = new DataTransfer();
          Array.from(files).forEach((file) => dataTransfer.items.add(file));
          mediaFolderInput.files = dataTransfer.files;
          console.log(`Loaded ${files.length} files (fallback method)`);
        }
      }
    });

    // Make the whole section clickable to trigger folder input
    mediaInputSection.addEventListener("click", (e) => {
      if (
        e.target === mediaInputSection ||
        e.target.classList.contains("drag-drop-hint")
      ) {
        mediaFolderInput.click();
      }
    });
  }
});

// Helper function to recursively read all files from a directory
async function readDirectory(directoryEntry) {
  const files = [];

  async function traverseEntry(entry, path = "") {
    if (entry.isFile) {
      return new Promise((resolve, reject) => {
        entry.file((file) => {
          // Create a new file with the full path
          const newFile = new File([file], path + file.name, {
            type: file.type,
            lastModified: file.lastModified,
          });
          // Add webkitRelativePath property for compatibility
          Object.defineProperty(newFile, "webkitRelativePath", {
            value: path + file.name,
            writable: false,
          });
          resolve(newFile);
        }, reject);
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      return new Promise((resolve, reject) => {
        const allEntries = [];

        const readBatch = () => {
          dirReader.readEntries(
            async (entries) => {
              if (entries.length === 0) {
                // No more entries, process what we have
                for (const childEntry of allEntries) {
                  const childPath = path + entry.name + "/";
                  const result = await traverseEntry(childEntry, childPath);
                  if (result) files.push(result);
                }
                resolve();
              } else {
                // Add to our collection and continue reading
                allEntries.push(...entries);
                readBatch();
              }
            },
            (error) => {
              console.error("Error reading directory:", error);
              reject(error);
            }
          );
        };

        readBatch();
      });
    }
  }

  try {
    await traverseEntry(directoryEntry);
    return files;
  } catch (error) {
    console.error("Error in readDirectory:", error);
    return files;
  }
}

// Add resize functionality for lowest date messages section
document.addEventListener("DOMContentLoaded", () => {
  const resizeHandle = document.getElementById("lowestDateResizeHandle");
  const messagesContainer = document.getElementById("lowestDateMessages");

  if (resizeHandle && messagesContainer) {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    resizeHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = messagesContainer.offsetHeight;

      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      resizeHandle.style.cursor = "ns-resize";

      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      const deltaY = e.clientY - startY;
      const newHeight = startHeight + deltaY;

      // Set minimum and maximum heights
      const minHeight = 200;
      const maxHeight = 2000;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        messagesContainer.style.maxHeight = newHeight + "px";
      }
    });

    document.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = "";
        resizeHandle.style.cursor = "";
      }
    });

    // Touch support for mobile devices
    resizeHandle.addEventListener("touchstart", (e) => {
      isResizing = true;
      startY = e.touches[0].clientY;
      startHeight = messagesContainer.offsetHeight;
      e.preventDefault();
    });

    document.addEventListener("touchmove", (e) => {
      if (!isResizing) return;

      const deltaY = e.touches[0].clientY - startY;
      const newHeight = startHeight + deltaY;

      const minHeight = 200;
      const maxHeight = 2000;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        messagesContainer.style.maxHeight = newHeight + "px";
      }
    });

    document.addEventListener("touchend", () => {
      if (isResizing) {
        isResizing = false;
      }
    });
  }
});

// Add resize functionality for selected date messages section
document.addEventListener("DOMContentLoaded", () => {
  const resizeHandle = document.getElementById("selectedDateResizeHandle");
  const messagesContainer = document.getElementById("selectedDateMessages");

  if (resizeHandle && messagesContainer) {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    resizeHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = messagesContainer.offsetHeight;

      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      resizeHandle.style.cursor = "ns-resize";

      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      const deltaY = e.clientY - startY;
      const newHeight = startHeight + deltaY;

      // Set minimum and maximum heights
      const minHeight = 200;
      const maxHeight = 2000;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        messagesContainer.style.maxHeight = newHeight + "px";
      }
    });

    document.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = "";
        resizeHandle.style.cursor = "";
      }
    });

    // Touch support for mobile devices
    resizeHandle.addEventListener("touchstart", (e) => {
      isResizing = true;
      startY = e.touches[0].clientY;
      startHeight = messagesContainer.offsetHeight;
      e.preventDefault();
    });

    document.addEventListener("touchmove", (e) => {
      if (!isResizing) return;

      const deltaY = e.touches[0].clientY - startY;
      const newHeight = startHeight + deltaY;

      const minHeight = 200;
      const maxHeight = 2000;

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        messagesContainer.style.maxHeight = newHeight + "px";
      }
    });

    document.addEventListener("touchend", () => {
      if (isResizing) {
        isResizing = false;
      }
    });
  }
});
