import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

let handLandmarker = undefined;
let runningMode = "VIDEO";
let webcamRunning = false;

// Variables for Gesture Control
let lastVideoTime = -1;
let isPinching = false;
let pinchStartY = 0;
let lastScrollY = 0;

// Variables for Smooth Scroll LERP
let targetScrollY = 0;
let currentScrollY = 0;
let isSmoothScrollRunning = false;

function smoothScrollLoop() {
  if (!isPinching) {
    isSmoothScrollRunning = false;
    return;
  }
  // Smoothly interpolate towards the target scroll position
  currentScrollY += (targetScrollY - currentScrollY) * 0.12;
  window.scrollTo({ top: currentScrollY, behavior: 'auto' });
  requestAnimationFrame(smoothScrollLoop);
}

const video = document.getElementById("webcamVideo");
const toggleBtn = document.getElementById("gestureToggleBtn");
const statusTxt = document.getElementById("gestureStatus");

// Check if webcam access is supported.
const hasGetUserMedia = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

// If webcam supported, add event listener to button.
if (hasGetUserMedia()) {
  toggleBtn.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
  statusTxt.innerText = "Not Supported";
}

// Initialize the MediaPipe HandLandmarker
async function createHandLandmarker() {
  try {
    statusTxt.innerText = "Loading Model...";
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: runningMode,
      numHands: 1, // Track 1 hand max for scroll simplicity
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    statusTxt.innerText = "Off";
  } catch (err) {
    console.error("Failed to load MediaPipe model", err);
    statusTxt.innerText = "Error Loading";
  }
}

// Start loading the model immediately in background
createHandLandmarker();

// Enable the webcam
function enableCam(event) {
  if (!handLandmarker) {
    statusTxt.innerText = "Model Still Loading...";
    return;
  }

  if (webcamRunning === true) { // turn off
    webcamRunning = false;
    toggleBtn.classList.remove("active");
    statusTxt.innerText = "Off";
    
    // Stop video track
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    return;
  }

  // Turn on
  toggleBtn.classList.add("loading");
  statusTxt.innerText = "Requesting Camera...";
  
  const constraints = {
    video: { facingMode: "user", width: 640, height: 480 }
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    webcamRunning = true;
    
    video.addEventListener("loadeddata", () => {
      toggleBtn.classList.remove("loading");
      toggleBtn.classList.add("active");
      statusTxt.innerText = "Tracking Hand...";
      predictWebcam();
    }, { once: true });
  }).catch((err) => {
    console.error(err);
    toggleBtn.classList.remove("loading");
    statusTxt.innerText = "Camera Denied";
  });
}

function predictWebcam() {
  if (!webcamRunning) return;

  const startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    const results = handLandmarker.detectForVideo(video, startTimeMs);
    
    processResults(results);
  }

  // Call again
  if (webcamRunning) {
    window.requestAnimationFrame(predictWebcam);
  }
}

function processResults(results) {
  if (results.landmarks && results.landmarks.length > 0) {
    const hand = results.landmarks[0];
    
    // Landmark 4 is thumb tip, Landmark 8 is index tip
    const thumb = hand[4];
    const index = hand[8];
    
    // Calculate 3D distance between thumb and index
    const dx = thumb.x - index.x;
    const dy = thumb.y - index.y;
    const dz = thumb.z - index.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Threshold for pinching (heuristic, usually 0.03 - 0.06 is good)
    const PINCH_THRESHOLD = 0.06;
    
    if (distance < PINCH_THRESHOLD) {
      if (!isPinching) {
        // Start of pinch
        isPinching = true;
        pinchStartY = index.y; // Keep track of physical y-position
        lastScrollY = window.scrollY;
        
        // Sync smooth scroll coordinates
        targetScrollY = window.scrollY;
        currentScrollY = window.scrollY;
        if (!isSmoothScrollRunning) {
          isSmoothScrollRunning = true;
          smoothScrollLoop();
        }
        
        // Update UI
        statusTxt.innerText = "Scrolling...";
        statusTxt.style.color = "var(--bg-dark)";
        statusTxt.style.backgroundColor = "var(--teal)";
        statusTxt.style.fontWeight = "bold";
      } else {
        // Continue pinch - calculate delta
        const deltaY = index.y - pinchStartY;
        
        // Multiplier to convert hand movement (0.0 to 1.0) into pixel scroll
        // A full drag from top to bottom of cam frame equals `scrollMultiplier` pixels
        const scrollMultiplier = window.innerHeight * 5; 
        
        targetScrollY = lastScrollY + (deltaY * scrollMultiplier);
      }
    } else {
      if (isPinching) {
        // End of pinch
        isPinching = false;
        
        // Reset UI
        statusTxt.innerText = "Tracking Hand...";
        statusTxt.style.color = "var(--gray)";
        statusTxt.style.backgroundColor = "var(--bg)";
        statusTxt.style.fontWeight = "normal";
      }
    }
  } else {
    // No hands detected
    if (isPinching) {
      isPinching = false;
      statusTxt.innerText = "Tracking Hand...";
      statusTxt.style.color = "var(--gray)";
      statusTxt.style.backgroundColor = "var(--bg)";
      statusTxt.style.fontWeight = "normal";
    }
  }
}
